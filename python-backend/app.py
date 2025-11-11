# -*- coding: utf-8 -*-
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import base64
import io
from PIL import Image
import numpy as np
import cv2
from dotenv import load_dotenv
import json
import random
from food_model import get_food_model
# import torch
try:
    from transformers import AutoModelForCausalLM, AutoTokenizer
except ImportError:
    AutoModelForCausalLM = None
    AutoTokenizer = None
import mysql.connector
import jwt
import bcrypt
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Database configuration
app.config['MYSQL_HOST'] = os.getenv('DB_HOST', 'localhost')
app.config['MYSQL_USER'] = os.getenv('DB_USER', 'root')
app.config['MYSQL_PASSWORD'] = os.getenv('DB_PASSWORD', 'root')
app.config['MYSQL_DB'] = os.getenv('DB_NAME', 'caloria_db')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'caloria_super_secret_jwt_key_2024_change_in_production')

# JWT Secret - Node.js backend ile aynı secret key kullanılıyor
JWT_SECRET = app.config['SECRET_KEY']

# Database connection
def get_db_connection():
    return mysql.connector.connect(
        host=app.config['MYSQL_HOST'],
        user=app.config['MYSQL_USER'],
        password=app.config['MYSQL_PASSWORD'],
        database=app.config['MYSQL_DB']
    )

# Model ve tokenizer'ı global olarak yükle - Şimdilik devre dışı
MODEL_NAME = "mistralai/Mistral-7B-Instruct-v0.2"
try:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForCausalLM.from_pretrained(MODEL_NAME,
                                              torch_dtype=torch.float16,
                                              device_map="auto",
                                              load_in_4bit=True)
    print("AI Beslenme Uzmanı modeli başarıyla yüklendi!")
    tokenizer = None
    model = None
except Exception as e:
    print(f"Model yüklenirken hata oluştu: {e}")
    model = None
    tokenizer = None

def detect_image_content(image_array):
    """
    Advanced image analysis using OpenCV and basic computer vision
    """
    # Convert to grayscale for analysis
    gray = cv2.cvtColor(image_array, cv2.COLOR_RGB2GRAY)
    
    # Calculate basic image statistics
    brightness = np.mean(gray)
    contrast = np.std(gray)
    
    # Edge detection to find object boundaries
    edges = cv2.Canny(gray, 50, 150)
    edge_density = np.sum(edges > 0) / edges.size
    
    # Color analysis
    dominant_colors = analyze_dominant_colors(image_array)
    
    # Heuristic-based classification
    classification = classify_image_content(brightness, contrast, edge_density, dominant_colors)
    
    return classification

def analyze_dominant_colors(image_array):
    """
    Analyze dominant colors in the image
    """
    # Reshape image to be a list of pixels
    pixels = image_array.reshape(-1, 3)
    
    # Calculate color statistics
    color_stats = {
        'avg_red': np.mean(pixels[:, 0]),
        'avg_green': np.mean(pixels[:, 1]),
        'avg_blue': np.mean(pixels[:, 2]),
        'brightness': np.mean(pixels)
    }
    
    return color_stats

def classify_image_content(brightness, contrast, edge_density, colors):
    """
    Classify image content based on visual features - IMPROVED for waterfall detection
    """
    # Enhanced waterfall/nature detection
    blue_dominance = colors['avg_blue'] - max(colors['avg_red'], colors['avg_green'])
    green_dominance = colors['avg_green'] - max(colors['avg_red'], colors['avg_blue'])
    
    # Waterfall detection (high blue, high brightness, high edge density)
    if (blue_dominance > 20 and 
        brightness > 100 and 
        edge_density > 0.08 and
        contrast > 40):
        return {
            'is_food': False,
            'category': 'waterfall',
            'confidence': 0.95,
            'reason': 'Strong waterfall indicators: blue dominance + high contrast + edges'
        }
    
    # Nature scene detection (high green, outdoor lighting)
    if (green_dominance > 15 and 
        brightness > 120 and 
        contrast < 60):
        return {
            'is_food': False,
            'category': 'landscape',
            'confidence': 0.90,
            'reason': 'Detected natural landscape with green dominance'
        }
    
    # Sky detection (very high blue, very high brightness)
    if (blue_dominance > 30 and 
        brightness > 140):
        return {
            'is_food': False,
            'category': 'sky',
            'confidence': 0.88,
            'reason': 'Detected sky scene with high blue and brightness'
        }
    
    # Ocean/water detection (blue dominant, medium brightness)
    if (blue_dominance > 25 and 
        brightness > 80 and brightness < 140 and
        edge_density < 0.05):
        return {
            'is_food': False,
            'category': 'ocean',
            'confidence': 0.85,
            'reason': 'Detected water/ocean scene'
        }
    
    # Dark scenes (low brightness)
    if brightness < 50:
        return {
            'is_food': False,
            'category': 'dark_scene',
            'confidence': 0.80,
            'reason': 'Image too dark to identify food'
        }
    
    # If it passes all non-food tests, it's likely food
    return {
        'is_food': True,
        'category': 'food',
        'confidence': 0.70,
        'reason': 'Passed non-food filters, likely contains food'
    }

def get_funny_non_food_message(category):
    """
    Return funny messages for non-food detections
    """
    messages = {
        'waterfall': 'Bu çok güzel bir şelale ama maalesef kalori yok! 💧 Yemek fotoğrafı çekmeyi dene.',
        'landscape': 'Harika bir manzara! Ama manzara yemiyoruz 😄 Tabağındaki yemeği çek.',
        'sky': 'Gökyüzü muhteşem ama tok tutmaz! ☁️ Yemek fotoğrafı çekmeyi dene.',
        'ocean': 'Deniz çok güzel ama yenmez! 🌊 Yemeğinin fotoğrafını çek.',
        'dark_scene': 'Fotoğraf çok karanlık! 🌙 Daha aydınlık bir yerde yemek fotoğrafı çek.',
        'selfie': 'Çok güzel görünüyorsun! Ama sen yemek değilsin 😊 Tabağını göster.',
        'person': 'İnsan eti menüde yok! 😅 Yemek fotoğrafı çekmeyi dene.',
        'animal': 'Çok tatlı ama yemek değil! 🐱 Tabağındaki yemeği göster.',
    }
    
    return messages.get(category, 'Bu yemek gibi görünmüyor. Lütfen yemeğinin fotoğrafını çek! 📸')

@app.route('/health', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'Caloria AI Food Recognition Backend',
        'version': '2.0.0',
        'model': 'Hugging Face Transformers + OpenCV'
    })

@app.route('/analyze-food', methods=['POST'])
@app.route('/api/analyze-food', methods=['POST'])
def analyze_food():
    try:
        # Get image data from request
        data = request.get_json()
        
        if 'image' not in data:
            return jsonify({'error': 'No image provided'}), 400
        
        # Decode base64 image
        image_data = data['image']
        if image_data.startswith('data:image'):
            image_data = image_data.split(',')[1]
        
        # Convert to PIL Image
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Convert to numpy array for OpenCV analysis
        image_array = np.array(image)
        
        # First, use OpenCV to detect non-food content
        cv_classification = detect_image_content(image_array)
        
        # If OpenCV says it's not food, trust it
        if not cv_classification['is_food']:
            return jsonify({
                'name': cv_classification['category'].title(),
                'calories': 0,
                'protein': 0,
                'carbs': 0,
                'fat': 0,
                'confidence': cv_classification['confidence'],
                'portions': 'N/A',
                'description': get_funny_non_food_message(cv_classification['category']),
                'isFood': False,
                'category': 'Non-Food',
                'analysis_method': 'OpenCV Computer Vision',
                'debug_info': cv_classification['reason']
            })
        
        # If OpenCV thinks it's food, use AI model for food classification
        food_model = get_food_model()
        ai_prediction = food_model.predict_food(image)
        
        # If AI model has low confidence, it might not be food
        if not ai_prediction['is_food'] or ai_prediction['confidence'] < 0.4:
            return jsonify({
                'name': 'Bilinmeyen Nesne',
                'calories': 0,
                'protein': 0,
                'carbs': 0,
                'fat': 0,
                'confidence': ai_prediction['confidence'],
                'portions': 'N/A',
                'description': 'AI modeli bu görüntüyü yemek olarak tanıyamadı. Lütfen daha net bir yemek fotoğrafı çekin! 🤖',
                'isFood': False,
                'category': 'Non-Food',
                'analysis_method': 'AI Model',
                'debug_info': f"AI confidence too low: {ai_prediction['confidence']}"
            })
        
        # Get nutrition information
        nutrition_info = food_model.get_nutrition_info(
            ai_prediction['food_name'], 
            ai_prediction['confidence']
        )
        
        return jsonify({
            'name': nutrition_info['name'],
            'calories': nutrition_info['calories'],
            'protein': nutrition_info['protein'],
            'carbs': nutrition_info['carbs'],
            'fat': nutrition_info['fat'],
            'confidence': nutrition_info['confidence'],
            'portions': '1 porsiyon',
            'description': f"AI tarafından {nutrition_info['confidence']:.0%} güvenle tanındı",
            'isFood': True,
            'category': 'Food',
            'analysis_method': 'OpenCV + Hugging Face AI',
            'debug_info': f"Detected as: {ai_prediction['food_name']}"
        })
        
    except Exception as e:
        return jsonify({
            'error': 'Image analysis failed',
            'message': str(e)
        }), 500

@app.route('/model-info', methods=['GET'])
def model_info():
    """Get information about the loaded model"""
    try:
        food_model = get_food_model()
        return jsonify({
            'model_name': food_model.model_name,
            'model_loaded': food_model.model is not None,
            'feature_extractor_loaded': food_model.feature_extractor is not None,
            'food_database_size': len(food_model.food_nutrition_db),
            'status': 'ready' if food_model.model is not None else 'fallback_mode'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/nutritionist/chat', methods=['POST'])
@app.route('/api/nutritionist/chat', methods=['POST'])
def chat_with_nutritionist():
    """
    Beslenme uzmanı AI ile sohbet endpoint'i
    """
    try:
        data = request.get_json()
        if not data or 'messages' not in data:
            return jsonify({"error": "Geçersiz istek formatı"}), 400

        # Şimdilik basit bir yanıt döndürelim
        return jsonify({"response": "Merhaba! Beslenme konularında size yardımcı olmaya hazırım. Ne konuda danışmak istiyorsunuz?"})

    except Exception as e:
        return jsonify({"error": str(e)}), 500

def get_current_user_id():
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None

        token = auth_header.split(' ')[1]
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload['user_id']
    except:
        return None

# Auth endpoints
@app.route('/auth/login', methods=['POST'])
@app.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data or 'emailOrUsername' not in data or 'password' not in data:
            return jsonify({'error': 'Email/Username ve şifre gerekli'}), 400

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        # Check if user exists by email or username
        cursor.execute("""
            SELECT id, email, username, password, full_name
            FROM users
            WHERE email = %s OR username = %s
        """, (data['emailOrUsername'], data['emailOrUsername']))

        user = cursor.fetchone()
        cursor.close()
        conn.close()

        if not user:
            return jsonify({'error': 'Kullanıcı bulunamadı'}), 401

        # Verify password
        if not bcrypt.checkpw(data['password'].encode('utf-8'), user['password'].encode('utf-8')):
            return jsonify({'error': 'Şifre yanlış'}), 401

        # Generate JWT token
        token = jwt.encode({
            'user_id': user['id'],
            'email': user['email'],
            'username': user['username'],
            'exp': datetime.utcnow() + timedelta(days=7)
        }, JWT_SECRET, algorithm='HS256')

        return jsonify({
            'message': 'Giriş başarılı',
            'token': token,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'username': user['username'],
                'fullName': user['full_name']
            }
        })

    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({'error': 'Giriş yapılırken hata oluştu'}), 500

@app.route('/auth/register', methods=['POST'])
@app.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Veri gerekli'}), 400

        required_fields = ['fullName', 'email', 'username', 'password']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'{field} alanı gerekli'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if user already exists
        cursor.execute("""
            SELECT id FROM users WHERE email = %s OR username = %s
        """, (data['email'], data['username']))

        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({'error': 'Bu email veya kullanıcı adı zaten kullanılıyor'}), 409

        # Hash password
        password_hash = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        # Create user
        cursor.execute("""
            INSERT INTO users (full_name, email, username, password)
            VALUES (%s, %s, %s, %s)
        """, (data['fullName'], data['email'], data['username'], password_hash))

        user_id = cursor.lastrowid
        conn.commit()
        cursor.close()
        conn.close()

        # Generate JWT token
        token = jwt.encode({
            'user_id': user_id,
            'email': data['email'],
            'username': data['username'],
            'exp': datetime.utcnow() + timedelta(days=7)
        }, JWT_SECRET, algorithm='HS256')

        return jsonify({
            'message': 'Kayıt başarılı',
            'token': token,
            'user': {
                'id': user_id,
                'email': data['email'],
                'username': data['username'],
                'fullName': data['fullName']
            }
        }), 201

    except Exception as e:
        print(f"Register error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Kayıt yapılırken hata oluştu: {str(e)}'}), 500

@app.route('/user/me', methods=['GET'])
@app.route('/api/user/me', methods=['GET'])
def get_user_profile():
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT id, email, username, full_name, created_at
            FROM users
            WHERE id = %s
        """, (user_id,))

        user = cursor.fetchone()
        cursor.close()
        conn.close()

        if not user:
            return jsonify({'error': 'Kullanıcı bulunamadı'}), 404

        return jsonify({
            'id': user['id'],
            'email': user['email'],
            'username': user['username'],
            'fullName': user['full_name'],
            'token': request.headers.get('Authorization', '').replace('Bearer ', '')
        })

    except Exception as e:
        print(f"Get user profile error: {e}")
        return jsonify({'error': 'Kullanıcı profili alınırken hata oluştu'}), 500

# Get user profile (nutrition profile)
@app.route('/api/user/profile', methods=['GET'])
@app.route('/user/profile', methods=['GET'])
def get_user_nutrition_profile():
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("""
            SELECT * FROM user_profiles 
            WHERE user_id = %s
        """, (user_id,))

        profile = cursor.fetchone()
        cursor.close()
        conn.close()

        if not profile:
            return jsonify(None)

        return jsonify(profile)

    except Exception as e:
        print(f"Get nutrition profile error: {e}")
        return jsonify({'error': 'Profil bilgileri alınırken hata oluştu'}), 500

# Create/Update user profile (nutrition profile)
@app.route('/api/user/profile', methods=['POST'])
@app.route('/user/profile', methods=['POST'])
def update_user_nutrition_profile():
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        data = request.get_json()
        if not data:
            return jsonify({'error': 'Veri gerekli'}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        # Check if profile exists
        cursor.execute("SELECT id FROM user_profiles WHERE user_id = %s", (user_id,))
        existing = cursor.fetchone()

        if existing:
            # Update existing profile
            cursor.execute("""
                UPDATE user_profiles SET
                    name = %s, age = %s, height = %s, weight = %s,
                    gender = %s, activity_level = %s, goal = %s,
                    target_weight = %s, daily_calorie_goal = %s,
                    daily_protein_goal = %s, daily_carbs_goal = %s,
                    daily_fat_goal = %s, updated_at = NOW()
                WHERE user_id = %s
            """, (
                data.get('name'),
                data.get('age'),
                data.get('height'),
                data.get('weight'),
                data.get('gender'),
                data.get('activityLevel'),
                data.get('goal'),
                data.get('targetWeight'),
                data.get('dailyCalorieGoal'),
                data.get('dailyProteinGoal'),
                data.get('dailyCarbsGoal'),
                data.get('dailyFatGoal'),
                user_id
            ))
        else:
            # Insert new profile
            cursor.execute("""
                INSERT INTO user_profiles 
                (user_id, name, age, height, weight, gender, activity_level, goal, 
                 target_weight, daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                user_id,
                data.get('name'),
                data.get('age'),
                data.get('height'),
                data.get('weight'),
                data.get('gender'),
                data.get('activityLevel'),
                data.get('goal'),
                data.get('targetWeight'),
                data.get('dailyCalorieGoal'),
                data.get('dailyProteinGoal'),
                data.get('dailyCarbsGoal'),
                data.get('dailyFatGoal')
            ))

        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({
            'message': 'Profil başarıyla kaydedildi',
            'success': True
        })

    except Exception as e:
        print(f"Update nutrition profile error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Profil kaydedilirken hata oluştu: {str(e)}'}), 500

@app.route('/api/user/features/check-nutritionist', methods=['GET'])
@app.route('/user/features/check-nutritionist', methods=['GET'])
def check_nutritionist_access():
    try:
        user_id = get_current_user_id()
        if not user_id:
            return jsonify({'error': 'Unauthorized'}), 401

        # ID 3 olan beslenme uzmanı rozetini kontrol et
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT COUNT(*) as has_access
            FROM user_rewards
            WHERE user_id = %s AND reward_id = 3
        """, (user_id,))
        result = cursor.fetchone()
        cursor.close()
        conn.close()

        return jsonify({
            'hasAccess': bool(result['has_access']),
            'message': 'Başarıyla kontrol edildi'
        })

    except Exception as e:
        print(f"Error checking nutritionist access: {e}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("🍎 Starting Caloria AI Food Recognition Backend...")
    print(f"🔑 JWT_SECRET: {JWT_SECRET}")
    print(f"🔑 SECRET_KEY: {app.config['SECRET_KEY']}")
    print("🤖 Loading AI models...")
    
    # Pre-load the model
    try:
        food_model = get_food_model()
        print(f"✅ Food Model loaded: {food_model.model is not None}")
        print("✅ AI Nutritionist Model loaded")
    except Exception as e:
        print(f"❌ Model loading failed: {e}")
    
    print("🚀 Server starting on http://localhost:5001")
    app.run(debug=True, host='0.0.0.0', port=5001) 