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

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

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
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'Caloria AI Food Recognition Backend',
        'version': '2.0.0',
        'model': 'Hugging Face Transformers + OpenCV'
    })

@app.route('/analyze-food', methods=['POST'])
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
        model = get_food_model()
        ai_prediction = model.predict_food(image)
        
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
        nutrition_info = model.get_nutrition_info(
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
        model = get_food_model()
        return jsonify({
            'model_name': model.model_name,
            'model_loaded': model.model is not None,
            'feature_extractor_loaded': model.feature_extractor is not None,
            'food_database_size': len(model.food_nutrition_db),
            'status': 'ready' if model.model is not None else 'fallback_mode'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🍎 Starting Caloria AI Food Recognition Backend...")
    print("🤖 Loading AI models...")
    
    # Pre-load the model
    try:
        model = get_food_model()
        print(f"✅ Model loaded: {model.model is not None}")
    except Exception as e:
        print(f"❌ Model loading failed: {e}")
    
    print("🚀 Server starting on http://localhost:5001")
    app.run(debug=True, host='0.0.0.0', port=5001) 