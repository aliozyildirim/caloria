import os

class Config:
    # OpenAI API Key (optional)
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
    
    # Flask settings
    DEBUG = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    
    # Server settings
    HOST = os.getenv('HOST', '0.0.0.0')
    PORT = int(os.getenv('PORT', 5000))
    
    # CORS settings
    CORS_ORIGINS = ['http://localhost:3000', 'http://localhost:19006', 'exp://192.168.1.*'] 