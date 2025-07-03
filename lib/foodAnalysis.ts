// This now integrates with Python backend for real AI food recognition
// Backend uses Hugging Face Transformers + OpenCV for intelligent analysis

export interface FoodAnalysis {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  portions: string;
  description: string;
  isFood: boolean;
  category: string;
  analysis_method?: string;
  debug_info?: string;
}

// Python backend URL
const PYTHON_BACKEND_URL = 'http://localhost:5001';

// Convert image to base64
const imageToBase64 = async (imageUri: string): Promise<string> => {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve(base64.split(',')[1]); // Remove data:image/jpeg;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw error;
  }
};

export const analyzeFoodImage = async (imageUri: string): Promise<FoodAnalysis> => {
  try {
    console.log('🤖 Analyzing image with Python AI backend...');
    
    // Convert image to base64
    const base64Image = await imageToBase64(imageUri);
    
    // Send to Python backend
    const response = await fetch(`${PYTHON_BACKEND_URL}/analyze-food`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64Image
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    
    const result = await response.json();
    
    console.log('✅ AI Analysis complete:', {
      name: result.name,
      isFood: result.isFood,
      confidence: result.confidence,
      method: result.analysis_method
    });
    
    return {
      name: result.name,
      calories: result.calories,
      protein: result.protein,
      carbs: result.carbs,
      fat: result.fat,
      confidence: result.confidence,
      portions: result.portions || '1 porsiyon',
      description: result.description,
      isFood: result.isFood,
      category: result.category,
      analysis_method: result.analysis_method,
      debug_info: result.debug_info
    };
    
  } catch (error) {
    console.error('❌ Python backend error, using fallback:', error);
    
    // Fallback to mock analysis if backend fails
    return fallbackAnalysis();
  }
};

// Fallback analysis when backend is not available
const fallbackAnalysis = async (): Promise<FoodAnalysis> => {
  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Mock foods for fallback
  const mockFoods = [
    {
      name: 'Karışık Salata',
      calories: 150,
      protein: 5,
      carbs: 12,
      fat: 8,
      description: 'Backend bağlantısı yok - mock data',
      category: 'Salata',
    },
    {
      name: 'Izgara Tavuk',
      calories: 280,
      protein: 35,
      carbs: 0,
      fat: 12,
      description: 'Backend bağlantısı yok - mock data',
      category: 'Protein',
    },
    {
      name: 'Makarna',
      calories: 320,
      protein: 12,
      carbs: 58,
      fat: 6,
      description: 'Backend bağlantısı yok - mock data',
      category: 'Karbonhidrat',
    }
  ];
  
  const randomFood = mockFoods[Math.floor(Math.random() * mockFoods.length)];
  
  return {
    name: randomFood.name,
    calories: randomFood.calories,
    protein: randomFood.protein,
    carbs: randomFood.carbs,
    fat: randomFood.fat,
    confidence: 0.65,
    portions: '1 porsiyon',
    description: randomFood.description,
    isFood: true,
    category: randomFood.category,
    analysis_method: 'Fallback Mock'
  };
};

// Check if Python backend is available
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${PYTHON_BACKEND_URL}/health`, {
      method: 'GET',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.log('Backend not available:', error);
    return false;
  }
};

// Get backend model information
export const getModelInfo = async () => {
  try {
    const response = await fetch(`${PYTHON_BACKEND_URL}/model-info`);
    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.log('Could not get model info:', error);
  }
  return null;
};

// Helper function to get nutritional information by food name (legacy)
export const getNutritionByName = (foodName: string): FoodAnalysis | null => {
  // This is now handled by the Python backend
  // Keeping for backward compatibility
  console.log('Using legacy getNutritionByName - consider using backend');
  return null;
};

// Get all available food categories (legacy)
export const getFoodCategories = (): string[] => {
  return ['Salata', 'Protein', 'Karbonhidrat', 'Meyve', 'Kahvaltı', 'Süt Ürünü', 'Fast Food'];
};

// Search foods by category (legacy)
export const getFoodsByCategory = (category: string) => {
  return [];
}; 