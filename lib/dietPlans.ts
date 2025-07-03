import { WeeklyMealPlan, addWeeklyMealPlan, addMealPlan, MealPlan } from './database';

// Sample weekly meal plans for each diet type
export const DIET_MEAL_PLANS: { [key: string]: Omit<WeeklyMealPlan, 'id' | 'dietPlanId'>[] } = {
  keto: [
    // Week 1 - Monday
    {
      weekNumber: 1,
      dayOfWeek: 1,
      mealType: 'breakfast',
      foodName: 'Avokadolu Omlet',
      calories: 420,
      protein: 18,
      carbs: 6,
      fat: 38,
      portion: '2 yumurta, 1/2 avokado, tereyağı',
      instructions: 'Yumurtaları tereyağında pişirin, dilimlediğiniz avokado ile servis edin.'
    },
    {
      weekNumber: 1,
      dayOfWeek: 1,
      mealType: 'lunch',
      foodName: 'Izgara Somon Salatası',
      calories: 380,
      protein: 32,
      carbs: 8,
      fat: 26,
      portion: '150g somon, yeşil yapraklar, zeytinyağı',
      instructions: 'Somonu ızgarada pişirin, yeşil salatalar üzerine yerleştirin.'
    },
    {
      weekNumber: 1,
      dayOfWeek: 1,
      mealType: 'dinner',
      foodName: 'Kremalı Mantarlı Tavuk',
      calories: 450,
      protein: 35,
      carbs: 5,
      fat: 33,
      portion: '200g tavuk göğsü, mantar, krema',
      instructions: 'Tavuğu pişirin, mantar ve krema ile sosunu hazırlayın.'
    },
    {
      weekNumber: 1,
      dayOfWeek: 1,
      mealType: 'snack',
      foodName: 'Ceviz ve Peynir',
      calories: 280,
      protein: 12,
      carbs: 3,
      fat: 25,
      portion: '30g ceviz, 50g kaşar peyniri',
      instructions: 'Basit atıştırmalık olarak tüketin.'
    },
    // Week 1 - Tuesday
    {
      weekNumber: 1,
      dayOfWeek: 2,
      mealType: 'breakfast',
      foodName: 'Ketojenik Smoothie',
      calories: 380,
      protein: 15,
      carbs: 8,
      fat: 35,
      portion: 'Hindistan cevizi sütü, avokado, protein tozu',
      instructions: 'Tüm malzemeleri blenderda karıştırın.'
    },
    {
      weekNumber: 1,
      dayOfWeek: 2,
      mealType: 'lunch',
      foodName: 'Ton Balığı Salatası',
      calories: 350,
      protein: 28,
      carbs: 6,
      fat: 24,
      portion: '120g ton balığı, mayonez, salatalık',
      instructions: 'Ton balığını mayonez ile karıştırın, salatalık ekleyin.'
    },
    {
      weekNumber: 1,
      dayOfWeek: 2,
      mealType: 'dinner',
      foodName: 'Kuzu Pirzola',
      calories: 480,
      protein: 40,
      carbs: 2,
      fat: 34,
      portion: '200g kuzu pirzola, biberiye',
      instructions: 'Kuzu pirzolaları biberiye ile marine edin ve ızgarada pişirin.'
    }
  ],
  
  mediterranean: [
    // Week 1 - Monday
    {
      weekNumber: 1,
      dayOfWeek: 1,
      mealType: 'breakfast',
      foodName: 'Yunan Yoğurdu ve Fındık',
      calories: 320,
      protein: 20,
      carbs: 25,
      fat: 16,
      portion: '200g Yunan yoğurdu, 30g fındık, bal',
      instructions: 'Yoğurdun üzerine fındık ve bal ekleyin.'
    },
    {
      weekNumber: 1,
      dayOfWeek: 1,
      mealType: 'lunch',
      foodName: 'Akdeniz Salatası',
      calories: 380,
      protein: 12,
      carbs: 35,
      fat: 22,
      portion: 'Domates, salatalık, zeytin, beyaz peynir, zeytinyağı',
      instructions: 'Tüm sebzeleri doğrayın, zeytinyağı ile karıştırın.'
    },
    {
      weekNumber: 1,
      dayOfWeek: 1,
      mealType: 'dinner',
      foodName: 'Fırında Levrek',
      calories: 420,
      protein: 35,
      carbs: 20,
      fat: 22,
      portion: '200g levrek, patates, zeytinyağı, limon',
      instructions: 'Levreği patates ile fırında pişirin.'
    },
    {
      weekNumber: 1,
      dayOfWeek: 1,
      mealType: 'snack',
      foodName: 'Zeytin ve Peynir',
      calories: 180,
      protein: 8,
      carbs: 5,
      fat: 15,
      portion: '50g beyaz peynir, 10 adet zeytin',
      instructions: 'Basit Akdeniz atıştırmalığı.'
    }
  ],
  
  vegan: [
    // Week 1 - Monday
    {
      weekNumber: 1,
      dayOfWeek: 1,
      mealType: 'breakfast',
      foodName: 'Chia Pudding',
      calories: 280,
      protein: 12,
      carbs: 32,
      fat: 14,
      portion: 'Chia tohumu, badem sütü, muz',
      instructions: 'Chia tohumunu badem sütü ile karıştırın, buzdolabında bekletin.'
    },
    {
      weekNumber: 1,
      dayOfWeek: 1,
      mealType: 'lunch',
      foodName: 'Quinoa Bowl',
      calories: 420,
      protein: 16,
      carbs: 65,
      fat: 12,
      portion: 'Quinoa, nohut, sebzeler, tahini sos',
      instructions: 'Quinoayı pişirin, sebzeler ve nohut ile karıştırın.'
    },
    {
      weekNumber: 1,
      dayOfWeek: 1,
      mealType: 'dinner',
      foodName: 'Lentil Curry',
      calories: 380,
      protein: 18,
      carbs: 55,
      fat: 10,
      portion: 'Kırmızı mercimek, hindistan cevizi sütü, baharatlar',
      instructions: 'Mercimeği baharatlar ile pişirin, hindistan cevizi sütü ekleyin.'
    },
    {
      weekNumber: 1,
      dayOfWeek: 1,
      mealType: 'snack',
      foodName: 'Hummus ve Sebze',
      calories: 150,
      protein: 6,
      carbs: 18,
      fat: 6,
      portion: 'Hummus, havuç, salatalık',
      instructions: 'Sebzeleri hummus ile tüketin.'
    }
  ],
  
  paleo: [
    // Week 1 - Monday
    {
      weekNumber: 1,
      dayOfWeek: 1,
      mealType: 'breakfast',
      foodName: 'Paleo Omlet',
      calories: 350,
      protein: 25,
      carbs: 8,
      fat: 25,
      portion: '3 yumurta, sebzeler, hindistan cevizi yağı',
      instructions: 'Yumurtaları sebzeler ile pişirin.'
    },
    {
      weekNumber: 1,
      dayOfWeek: 1,
      mealType: 'lunch',
      foodName: 'Izgara Et Salatası',
      calories: 450,
      protein: 35,
      carbs: 12,
      fat: 30,
      portion: '200g dana eti, yeşil yapraklar, avokado',
      instructions: 'Eti ızgarada pişirin, salata üzerine yerleştirin.'
    },
    {
      weekNumber: 1,
      dayOfWeek: 1,
      mealType: 'dinner',
      foodName: 'Fırında Tavuk ve Sebze',
      calories: 420,
      protein: 40,
      carbs: 15,
      fat: 22,
      portion: '200g tavuk, brokoli, tatlı patates',
      instructions: 'Tavuk ve sebzeleri fırında pişirin.'
    },
    {
      weekNumber: 1,
      dayOfWeek: 1,
      mealType: 'snack',
      foodName: 'Badem ve Meyve',
      calories: 200,
      protein: 6,
      carbs: 15,
      fat: 14,
      portion: '30g badem, 1 orta elma',
      instructions: 'Basit paleo atıştırmalık.'
    }
  ],
  
  intermittent_fasting: [
    // Week 1 - Monday (12:00-20:00 eating window)
    {
      weekNumber: 1,
      dayOfWeek: 1,
      mealType: 'lunch',
      foodName: 'Protein Bowl',
      calories: 450,
      protein: 35,
      carbs: 40,
      fat: 18,
      portion: 'Tavuk göğsü, quinoa, sebzeler',
      instructions: 'İlk öğün - 12:00. Tavuğu pişirin, quinoa ile servis edin.'
    },
    {
      weekNumber: 1,
      dayOfWeek: 1,
      mealType: 'snack',
      foodName: 'Yunan Yoğurdu',
      calories: 180,
      protein: 15,
      carbs: 12,
      fat: 8,
      portion: '150g Yunan yoğurdu, meyveler',
      instructions: 'Öğle arası atıştırmalık - 15:30.'
    },
    {
      weekNumber: 1,
      dayOfWeek: 1,
      mealType: 'dinner',
      foodName: 'Somon ve Sebze',
      calories: 480,
      protein: 38,
      carbs: 25,
      fat: 26,
      portion: '200g somon, buharda sebze, bulgur',
      instructions: 'Son öğün - 19:00. Somonu ızgarada pişirin.'
    }
  ],
  
  low_carb: [
    // Week 1 - Monday
    {
      weekNumber: 1,
      dayOfWeek: 1,
      mealType: 'breakfast',
      foodName: 'Peynirli Omlet',
      calories: 320,
      protein: 22,
      carbs: 4,
      fat: 24,
      portion: '2 yumurta, kaşar peyniri, ıspanak',
      instructions: 'Yumurtaları ıspanak ve peynir ile pişirin.'
    },
    {
      weekNumber: 1,
      dayOfWeek: 1,
      mealType: 'lunch',
      foodName: 'Tavuk Salatası',
      calories: 380,
      protein: 32,
      carbs: 12,
      fat: 22,
      portion: '150g tavuk göğsü, karışık salata, zeytinyağı',
      instructions: 'Tavuğu ızgarada pişirin, salata ile servis edin.'
    },
    {
      weekNumber: 1,
      dayOfWeek: 1,
      mealType: 'dinner',
      foodName: 'Izgara Balık',
      calories: 400,
      protein: 35,
      carbs: 8,
      fat: 25,
      portion: '200g levrek, ızgara sebze',
      instructions: 'Balığı ızgarada pişirin, sebzeler ile servis edin.'
    },
    {
      weekNumber: 1,
      dayOfWeek: 1,
      mealType: 'snack',
      foodName: 'Fındık ve Peynir',
      calories: 220,
      protein: 10,
      carbs: 6,
      fat: 18,
      portion: '30g fındık, 40g beyaz peynir',
      instructions: 'Düşük karbonhidratlı atıştırmalık.'
    }
  ]
};

export const generateWeeklyMealPlan = async (dietPlanId: number, dietType: string, weeks: number = 4) => {
  try {
    const mealPlan = DIET_MEAL_PLANS[dietType];
    if (!mealPlan) {
      throw new Error(`No meal plan found for diet type: ${dietType}`);
    }

    // Generate meal plans for specified number of weeks
    for (let week = 1; week <= weeks; week++) {
      for (let day = 1; day <= 7; day++) {
        // Get base meals for day 1 and rotate/vary them for other days
        const baseMeals = mealPlan.filter(meal => meal.dayOfWeek === 1);
        
        for (const baseMeal of baseMeals) {
          // Add some variation for different days and weeks
          const calorieVariation = Math.floor(Math.random() * 40) - 20; // ±20 calories
          const proteinVariation = Math.floor(Math.random() * 6) - 3; // ±3g protein
          
          const weeklyMeal: Omit<WeeklyMealPlan, 'id'> = {
            dietPlanId,
            weekNumber: week,
            dayOfWeek: day,
            mealType: baseMeal.mealType,
            foodName: baseMeal.foodName,
            calories: Math.max(100, baseMeal.calories + calorieVariation),
            protein: Math.max(5, baseMeal.protein + proteinVariation),
            carbs: baseMeal.carbs,
            fat: baseMeal.fat,
            portion: baseMeal.portion,
            instructions: baseMeal.instructions
          };

          await addWeeklyMealPlan(weeklyMeal);
        }
      }
    }

    console.log(`Generated ${weeks} weeks of meal plans for diet type: ${dietType}`);
  } catch (error) {
    console.error('Error generating weekly meal plan:', error);
    throw error;
  }
};

export const generateDailyMealPlans = async (dietPlanId: number, startDate: string, endDate: string) => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const currentDate = new Date(start);

    while (currentDate <= end) {
      const dateString = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const weekNumber = Math.ceil((currentDate.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

      // Create meal plans for each meal type
      const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
      
      for (const mealType of mealTypes) {
        const mealPlan: Omit<MealPlan, 'id'> = {
          dietPlanId,
          date: dateString,
          mealType: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
          plannedFoodName: `Planned ${mealType}`,
          plannedCalories: getMealCalories(mealType),
          plannedProtein: getMealProtein(mealType),
          plannedCarbs: getMealCarbs(mealType),
          plannedFat: getMealFat(mealType),
          completed: false,
          createdAt: new Date().toISOString()
        };

        await addMealPlan(mealPlan);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(`Generated daily meal plans from ${startDate} to ${endDate}`);
  } catch (error) {
    console.error('Error generating daily meal plans:', error);
    throw error;
  }
};

const getMealCalories = (mealType: string): number => {
  const calories = {
    breakfast: 350,
    lunch: 450,
    dinner: 500,
    snack: 200
  };
  return calories[mealType as keyof typeof calories] || 300;
};

const getMealProtein = (mealType: string): number => {
  const protein = {
    breakfast: 20,
    lunch: 30,
    dinner: 35,
    snack: 10
  };
  return protein[mealType as keyof typeof protein] || 20;
};

const getMealCarbs = (mealType: string): number => {
  const carbs = {
    breakfast: 25,
    lunch: 35,
    dinner: 30,
    snack: 15
  };
  return carbs[mealType as keyof typeof carbs] || 25;
};

const getMealFat = (mealType: string): number => {
  const fat = {
    breakfast: 18,
    lunch: 22,
    dinner: 25,
    snack: 12
  };
  return fat[mealType as keyof typeof fat] || 18;
}; 