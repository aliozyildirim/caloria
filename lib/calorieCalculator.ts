// BMR ve TDEE hesaplama fonksiyonları

export interface UserData {
  age: number;
  gender: 'male' | 'female';
  height: number; // cm
  weight: number; // kg
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'lose' | 'maintain' | 'gain';
}

export interface CalorieResults {
  bmr: number;
  tdee: number;
  dailyCalorieGoal: number;
  dailyProteinGoal: number;
  dailyCarbsGoal: number;
  dailyFatGoal: number;
}

// Mifflin-St Jeor Equation ile BMR hesaplama
export const calculateBMR = (age: number, gender: 'male' | 'female', height: number, weight: number): number => {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161;
  }
};

// Aktivite seviyesine göre TDEE hesaplama
export const calculateTDEE = (bmr: number, activityLevel: string): number => {
  const activityMultipliers = {
    sedentary: 1.2,      // Hareketsiz (masa başı iş, az egzersiz)
    light: 1.375,        // Hafif aktif (hafif egzersiz/spor 1-3 gün/hafta)
    moderate: 1.55,      // Orta aktif (orta egzersiz/spor 3-5 gün/hafta)
    active: 1.725,       // Çok aktif (yoğun egzersiz/spor 6-7 gün/hafta)
    very_active: 1.9     // Ekstra aktif (çok yoğun egzersiz, fiziksel iş)
  };

  return Math.round(bmr * activityMultipliers[activityLevel as keyof typeof activityMultipliers]);
};

// Hedefe göre günlük kalori hesaplama
export const calculateDailyCalories = (tdee: number, goal: string): number => {
  switch (goal) {
    case 'lose':
      return Math.round(tdee - 500); // Haftalık 0.5kg kayıp için günlük 500 kalori açığı
    case 'gain':
      return Math.round(tdee + 300); // Haftalık 0.3kg alım için günlük 300 kalori fazlası
    case 'maintain':
    default:
      return tdee;
  }
};

// Makro besin hesaplama (Protein: 25%, Karbonhidrat: 45%, Yağ: 30%)
export const calculateMacros = (dailyCalories: number) => {
  const proteinCalories = dailyCalories * 0.25;
  const carbsCalories = dailyCalories * 0.45;
  const fatCalories = dailyCalories * 0.30;

  return {
    protein: Math.round(proteinCalories / 4), // 1g protein = 4 kalori
    carbs: Math.round(carbsCalories / 4),     // 1g karbonhidrat = 4 kalori
    fat: Math.round(fatCalories / 9),         // 1g yağ = 9 kalori
  };
};

// Kapsamlı kalori ve makro hesaplama
export const calculateNutritionGoals = (userData: UserData): CalorieResults => {
  const bmr = calculateBMR(userData.age, userData.gender, userData.height, userData.weight);
  const tdee = calculateTDEE(bmr, userData.activityLevel);
  const dailyCalorieGoal = calculateDailyCalories(tdee, userData.goal);
  const macros = calculateMacros(dailyCalorieGoal);

  return {
    bmr,
    tdee,
    dailyCalorieGoal,
    dailyProteinGoal: macros.protein,
    dailyCarbsGoal: macros.carbs,
    dailyFatGoal: macros.fat,
  };
};

// BMI hesaplama
export const calculateBMI = (height: number, weight: number): number => {
  const heightInMeters = height / 100;
  return Number((weight / (heightInMeters * heightInMeters)).toFixed(1));
};

// BMI kategori belirleme
export const getBMICategory = (bmi: number): { text: string; color: string; description: string } => {
  if (bmi < 18.5) {
    return { 
      text: 'Zayıf', 
      color: '#42A5F5', 
      description: 'Kilo almanız önerilir' 
    };
  }
  if (bmi < 25) {
    return { 
      text: 'Normal', 
      color: '#4CAF50', 
      description: 'İdeal kiloda görünüyorsunuz' 
    };
  }
  if (bmi < 30) {
    return { 
      text: 'Fazla Kilolu', 
      color: '#FF9800', 
      description: 'Kilo vermeniz önerilir' 
    };
  }
  return { 
    text: 'Obez', 
    color: '#F44336', 
    description: 'Acilen kilo vermeniz gerekiyor' 
  };
};

// İdeal kilo aralığı hesaplama
export const calculateIdealWeightRange = (height: number): { min: number; max: number } => {
  const heightInMeters = height / 100;
  const minWeight = 18.5 * heightInMeters * heightInMeters;
  const maxWeight = 24.9 * heightInMeters * heightInMeters;
  
  return {
    min: Math.round(minWeight),
    max: Math.round(maxWeight)
  };
};

// Aktivite seviyesi açıklamaları
export const getActivityLevelDescription = (level: string): string => {
  const descriptions = {
    sedentary: 'Hareketsiz yaşam (masa başı iş, çok az egzersiz)',
    light: 'Hafif aktif (haftada 1-3 gün hafif egzersiz)',
    moderate: 'Orta aktif (haftada 3-5 gün orta egzersiz)',
    active: 'Çok aktif (haftada 6-7 gün yoğun egzersiz)',
    very_active: 'Ekstra aktif (günlük yoğun egzersiz, fiziksel iş)'
  };
  
  return descriptions[level as keyof typeof descriptions] || descriptions.moderate;
};

// Hedef açıklamaları
export const getGoalDescription = (goal: string): string => {
  const descriptions = {
    lose: 'Kilo vermek (haftalık 0.5kg kayıp hedefi)',
    maintain: 'Kiloyu korumak (mevcut kiloyu sürdürmek)',
    gain: 'Kilo almak (haftalık 0.3kg artış hedefi)'
  };
  
  return descriptions[goal as keyof typeof descriptions] || descriptions.maintain;
}; 