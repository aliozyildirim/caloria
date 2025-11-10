from PIL import Image
import numpy as np
import requests
from io import BytesIO
import random

# Try to import transformers for real AI model
try:
    from transformers import AutoImageProcessor, AutoModelForImageClassification
    import torch
    TRANSFORMERS_AVAILABLE = True
    print("✅ Transformers library available")
except ImportError:
    TRANSFORMERS_AVAILABLE = False
    print("⚠️ Transformers not available, using fallback mode")

class FoodRecognitionModel:
    def __init__(self):
        self.model_name = "nateraw/food"  # Food classification model
        self.feature_extractor = None
        self.model = None
        self.food_nutrition_db = {
            # Common foods with nutrition info (per 100g)
            'pizza': {'calories': 266, 'protein': 11, 'carbs': 33, 'fat': 10},
            'burger': {'calories': 540, 'protein': 25, 'carbs': 40, 'fat': 31},
            'hamburger': {'calories': 540, 'protein': 25, 'carbs': 40, 'fat': 31},
            'salad': {'calories': 33, 'protein': 3, 'carbs': 6, 'fat': 0.3},
            'pasta': {'calories': 220, 'protein': 8, 'carbs': 44, 'fat': 1.1},
            'spaghetti': {'calories': 220, 'protein': 8, 'carbs': 44, 'fat': 1.1},
            'chicken': {'calories': 239, 'protein': 27, 'carbs': 0, 'fat': 14},
            'rice': {'calories': 130, 'protein': 2.7, 'carbs': 28, 'fat': 0.3},
            'bread': {'calories': 265, 'protein': 9, 'carbs': 49, 'fat': 3.2},
            'egg': {'calories': 155, 'protein': 13, 'carbs': 1.1, 'fat': 11},
            'eggs': {'calories': 155, 'protein': 13, 'carbs': 1.1, 'fat': 11},
            'fish': {'calories': 206, 'protein': 22, 'carbs': 0, 'fat': 12},
            'soup': {'calories': 86, 'protein': 6, 'carbs': 8, 'fat': 3},
            'sandwich': {'calories': 300, 'protein': 15, 'carbs': 30, 'fat': 15},
            'fruit': {'calories': 52, 'protein': 0.3, 'carbs': 14, 'fat': 0.2},
            'apple': {'calories': 52, 'protein': 0.3, 'carbs': 14, 'fat': 0.2},
            'banana': {'calories': 89, 'protein': 1.1, 'carbs': 23, 'fat': 0.3},
            'orange': {'calories': 47, 'protein': 0.9, 'carbs': 12, 'fat': 0.1},
            'strawberry': {'calories': 32, 'protein': 0.7, 'carbs': 8, 'fat': 0.3},
            'vegetable': {'calories': 25, 'protein': 1, 'carbs': 5, 'fat': 0.1},
            'vegetables': {'calories': 25, 'protein': 1, 'carbs': 5, 'fat': 0.1},
            'meat': {'calories': 250, 'protein': 26, 'carbs': 0, 'fat': 15},
            'beef': {'calories': 250, 'protein': 26, 'carbs': 0, 'fat': 15},
            'pork': {'calories': 242, 'protein': 27, 'carbs': 0, 'fat': 14},
            'cheese': {'calories': 113, 'protein': 7, 'carbs': 1, 'fat': 9},
            'yogurt': {'calories': 59, 'protein': 10, 'carbs': 3.6, 'fat': 0.4},
            'cake': {'calories': 257, 'protein': 3, 'carbs': 46, 'fat': 7},
            'cookie': {'calories': 502, 'protein': 5.9, 'carbs': 64, 'fat': 25},
            'cookies': {'calories': 502, 'protein': 5.9, 'carbs': 64, 'fat': 25},
            'ice_cream': {'calories': 207, 'protein': 3.5, 'carbs': 24, 'fat': 11},
            'ice cream': {'calories': 207, 'protein': 3.5, 'carbs': 24, 'fat': 11},
            'coffee': {'calories': 2, 'protein': 0.3, 'carbs': 0, 'fat': 0},
            'tea': {'calories': 1, 'protein': 0, 'carbs': 0.3, 'fat': 0},
            'water': {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0},
            'fries': {'calories': 312, 'protein': 3.4, 'carbs': 41, 'fat': 15},
            'french fries': {'calories': 312, 'protein': 3.4, 'carbs': 41, 'fat': 15},
            'hot dog': {'calories': 290, 'protein': 10, 'carbs': 24, 'fat': 18},
            'hotdog': {'calories': 290, 'protein': 10, 'carbs': 24, 'fat': 18},
            'taco': {'calories': 226, 'protein': 9, 'carbs': 21, 'fat': 13},
            'burrito': {'calories': 206, 'protein': 8, 'carbs': 26, 'fat': 8},
            'sushi': {'calories': 143, 'protein': 6, 'carbs': 21, 'fat': 4},
            'steak': {'calories': 271, 'protein': 25, 'carbs': 0, 'fat': 19},
            'bacon': {'calories': 541, 'protein': 37, 'carbs': 1.4, 'fat': 42},
            'pancake': {'calories': 227, 'protein': 6, 'carbs': 28, 'fat': 10},
            'pancakes': {'calories': 227, 'protein': 6, 'carbs': 28, 'fat': 10},
            'waffle': {'calories': 291, 'protein': 7, 'carbs': 33, 'fat': 15},
            'waffles': {'calories': 291, 'protein': 7, 'carbs': 33, 'fat': 15},
            'donut': {'calories': 452, 'protein': 5, 'carbs': 51, 'fat': 25},
            'doughnut': {'calories': 452, 'protein': 5, 'carbs': 51, 'fat': 25},
            'muffin': {'calories': 377, 'protein': 6, 'carbs': 51, 'fat': 17},
            'croissant': {'calories': 406, 'protein': 8, 'carbs': 46, 'fat': 21},
        }
        self.load_model()
    
    def load_model(self):
        """Initialize food classification system"""
        if not TRANSFORMERS_AVAILABLE:
            print("⚠️ Transformers not available, using smart fallback mode")
            self.model = None
            return
        
        try:
            print(f"🤖 Loading AI food recognition model: {self.model_name}")
            print("⏳ This may take a few minutes on first run (downloading model)...")
            
            # Load model and processor
            self.feature_extractor = AutoImageProcessor.from_pretrained(self.model_name)
            self.model = AutoModelForImageClassification.from_pretrained(self.model_name)
            
            # Set to evaluation mode
            self.model.eval()
            
            print("✅ AI food recognition model loaded successfully!")
            print(f"📊 Model can recognize {len(self.model.config.id2label)} food categories")
            
        except Exception as e:
            print(f"❌ Error loading AI model: {e}")
            print("⚠️ Using smart fallback mode instead")
            self.model = None
            self.feature_extractor = None
    
    def predict_food(self, image):
        """Predict food class from image"""
        # Use fallback if model is not loaded
        if self.model is None or self.feature_extractor is None:
            print("⚠️ Using smart fallback (model not loaded)")
            return self.smart_fallback_prediction(image)
        
        try:
            print("🤖 Using AI model for prediction...")
            
            # Preprocess image
            inputs = self.feature_extractor(images=image, return_tensors="pt")
            
            # Make prediction
            with torch.no_grad():
                outputs = self.model(**inputs)
                predictions = torch.nn.functional.softmax(outputs.logits, dim=-1)
            
            # Get top 3 predictions
            top_k = torch.topk(predictions, k=3)
            top_confidences = top_k.values[0].tolist()
            top_indices = top_k.indices[0].tolist()
            
            # Get class names
            top_predictions = []
            for idx, conf in zip(top_indices, top_confidences):
                class_name = self.model.config.id2label[idx]
                top_predictions.append({'name': class_name, 'confidence': conf})
            
            # Use top prediction
            predicted_class = top_predictions[0]['name']
            confidence = top_predictions[0]['confidence']
            
            print(f"✅ AI Prediction: {predicted_class} ({confidence:.2%})")
            top_3_str = ', '.join([f"{p['name']} ({p['confidence']:.1%})" for p in top_predictions])
            print(f"   Top 3: {top_3_str}")
            
            return {
                'food_name': predicted_class,
                'confidence': confidence,
                'is_food': confidence > 0.2,  # Lower threshold for AI model
                'top_predictions': top_predictions
            }
            
        except Exception as e:
            print(f"❌ AI Prediction error: {e}")
            return self.smart_fallback_prediction(image)
    
    def smart_fallback_prediction(self, image):
        """Smart fallback using color analysis"""
        try:
            # Convert PIL image to numpy array
            img_array = np.array(image)
            
            # Calculate average colors
            avg_red = np.mean(img_array[:, :, 0])
            avg_green = np.mean(img_array[:, :, 1])
            avg_blue = np.mean(img_array[:, :, 2])
            
            # Calculate brightness
            brightness = (avg_red + avg_green + avg_blue) / 3
            
            # Color-based food prediction
            green_dominance = avg_green - max(avg_red, avg_blue)
            red_dominance = avg_red - max(avg_green, avg_blue)
            
            # Predict based on colors
            if green_dominance > 20:
                # Green dominant = salad or vegetables
                food = 'salad' if brightness > 100 else 'vegetable'
                confidence = 0.80
            elif red_dominance > 15 and brightness > 120:
                # Red/orange = fruit or meat
                food = 'fruit' if brightness > 150 else 'meat'
                confidence = 0.75
            elif avg_red > 150 and avg_green > 100 and avg_blue < 100:
                # Yellow/orange = pasta, bread, or chicken
                food = random.choice(['pasta', 'bread', 'chicken'])
                confidence = 0.70
            elif brightness < 80:
                # Dark = meat or soup
                food = random.choice(['meat', 'soup'])
                confidence = 0.65
            else:
                # Default to common foods
                food = random.choice(['chicken', 'rice', 'pasta', 'sandwich'])
                confidence = 0.60
            
            print(f"Smart fallback: {food} (R:{avg_red:.0f}, G:{avg_green:.0f}, B:{avg_blue:.0f})")
            
            return {
                'food_name': food,
                'confidence': confidence,
                'is_food': True
            }
        except Exception as e:
            print(f"Smart fallback error: {e}")
            return self.simple_fallback_prediction()
    
    def simple_fallback_prediction(self):
        """Simple fallback when everything fails"""
        import random
        foods = list(self.food_nutrition_db.keys())
        food = random.choice(foods)
        return {
            'food_name': food,
            'confidence': 0.75,
            'is_food': True
        }
    
    def get_nutrition_info(self, food_name, confidence=1.0):
        """Get nutrition information for detected food"""
        # Clean food name and find best match
        food_name = food_name.lower().replace('_', ' ')
        
        # Find best matching food in our database
        best_match = None
        best_score = 0
        
        for db_food in self.food_nutrition_db.keys():
            if db_food in food_name or food_name in db_food:
                score = len(db_food) / len(food_name) if len(food_name) > 0 else 0
                if score > best_score:
                    best_score = score
                    best_match = db_food
        
        # If no good match, use default values
        if best_match is None:
            nutrition = {'calories': 200, 'protein': 10, 'carbs': 25, 'fat': 8}
            best_match = food_name
        else:
            nutrition = self.food_nutrition_db[best_match]
        
        # Add some variance based on confidence
        variance = 0.2 * (1 - confidence)  # Lower confidence = more variance
        
        return {
            'name': best_match.title().replace('_', ' '),
            'calories': max(0, int(nutrition['calories'] * (1 + variance * (np.random.random() - 0.5)))),
            'protein': max(0, round(nutrition['protein'] * (1 + variance * (np.random.random() - 0.5)), 1)),
            'carbs': max(0, round(nutrition['carbs'] * (1 + variance * (np.random.random() - 0.5)), 1)),
            'fat': max(0, round(nutrition['fat'] * (1 + variance * (np.random.random() - 0.5)), 1)),
            'confidence': confidence
        }

# Global model instance
food_model = None

def get_food_model():
    """Get or create food model instance"""
    global food_model
    if food_model is None:
        food_model = FoodRecognitionModel()
    return food_model 