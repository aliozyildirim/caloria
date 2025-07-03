# 🍎 Caloria AI Food Recognition Backend

Python Flask backend for intelligent food recognition using computer vision and AI.

## 🚀 Features

- **Smart Food Detection**: Uses OpenCV and computer vision to detect food vs non-food
- **Landscape Detection**: Detects waterfalls, landscapes, sky scenes
- **Funny Turkish Messages**: Returns humorous messages for non-food items
- **Nutritional Analysis**: Provides calorie, protein, carbs, and fat information
- **REST API**: Easy integration with React Native app

## 🛠️ Installation

1. **Create virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Run the server:**
```bash
python app.py
```

Server will start on `http://localhost:5000`

## 📡 API Endpoints

### POST /analyze-food
Analyze food image and return nutritional information.

**Request:**
```json
{
  "image": "base64_encoded_image_data"
}
```

**Response (Food detected):**
```json
{
  "name": "Izgara Tavuk Göğsü",
  "calories": 280,
  "protein": 35,
  "carbs": 0,
  "fat": 12,
  "confidence": 0.85,
  "portions": "1 porsiyon",
  "description": "Yağsız ızgara tavuk göğsü",
  "isFood": true,
  "category": "Protein",
  "analysis_method": "Computer Vision + AI"
}
```

**Response (Non-food detected):**
```json
{
  "name": "Waterfall",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0,
  "confidence": 0.82,
  "portions": "N/A",
  "description": "Bu çok güzel bir şelale ama maalesef kalori yok! 💧 Yemek fotoğrafı çekmeyi dene.",
  "isFood": false,
  "category": "Non-Food",
  "analysis_method": "Computer Vision"
}
```

### GET /health
Health check endpoint.

### GET /foods
Get all available foods in database.

### GET /categories
Get all food categories.

## 🧠 How It Works

1. **Image Analysis**: Uses OpenCV to analyze image brightness, contrast, edge density
2. **Color Analysis**: Analyzes dominant colors to detect landscapes, water, sky
3. **Classification**: Uses heuristic rules to classify content
4. **Food Recognition**: If food is detected, returns nutritional information
5. **Funny Messages**: Returns humorous Turkish messages for non-food items

## 🎯 Detection Logic

- **Landscape**: Green dominant colors + high brightness + low contrast
- **Waterfall/Sky**: Blue dominant colors + high brightness
- **Dark Scene**: Low brightness (< 60)
- **Food**: High edge density + good contrast

## 🔧 Configuration

Edit `config.py` to customize settings:
- OpenAI API key (optional)
- CORS origins
- Debug mode
- Host and port

## 📱 Integration with React Native

Update your React Native app to use this backend:

```typescript
const API_BASE_URL = 'http://localhost:5000';

export const analyzeFoodImage = async (imageUri: string): Promise<FoodAnalysis> => {
  const response = await fetch(`${API_BASE_URL}/analyze-food`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: imageUri // base64 encoded image
    }),
  });
  
  return response.json();
};
```

## 🐍 Python Libraries Used

- **Flask**: Web framework
- **OpenCV**: Computer vision
- **Pillow**: Image processing
- **NumPy**: Numerical computations
- **Flask-CORS**: Cross-origin resource sharing

## 🚀 Production Deployment

For production, use Gunicorn:

```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

## 🔮 Future Enhancements

- Real TensorFlow food recognition model
- OpenAI Vision API integration
- Database storage for analysis history
- User authentication
- Batch image processing

---

Made with ❤️ for Caloria App 