const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'root',
  database: 'caloria_db'
});

async function addTestMeals() {
  try {
    console.log('🍽️ Bugün için test yemekleri ekliyorum...\n');

    const userId = 1; // Current user ID
    const today = new Date();

    // Test meals for today
    const testMeals = [
      { name: 'Sabah Kahvaltısı', calories: 350, protein: 15, carbs: 45, fat: 12, meal_type: 'breakfast' },
      { name: 'Öğle Yemeği', calories: 650, protein: 35, carbs: 55, fat: 25, meal_type: 'lunch' },
      { name: 'Akşam Yemeği', calories: 480, protein: 28, carbs: 35, fat: 22, meal_type: 'dinner' },
      { name: 'Atıştırmalık', calories: 120, protein: 5, carbs: 18, fat: 4, meal_type: 'snack' }
    ];

    let totalCalories = 0;
    for (const meal of testMeals) {
      await connection.promise().execute(
        'INSERT INTO meals (user_id, name, calories, protein, carbs, fat, meal_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
        [userId, meal.name, meal.calories, meal.protein, meal.carbs, meal.fat, meal.meal_type]
      );
      
      console.log(`✅ ${meal.name}: ${meal.calories} kcal`);
      totalCalories += meal.calories;
    }

    // Add user profile if not exists
    const [existingProfile] = await connection.promise().execute(
      'SELECT * FROM user_profiles WHERE user_id = ?',
      [userId]
    );

    if (existingProfile.length === 0) {
      await connection.promise().execute(
        'INSERT INTO user_profiles (user_id, name, age, height, weight, gender, activity_level, goal, target_weight, daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, 'Test Kullanıcı', 25, 175, 70, 'male', 'moderate', 'maintain', 70, 2000, 150, 250, 67]
      );
      console.log('✅ Kullanıcı profili oluşturuldu');
    }

    console.log(`\n🎉 Test verileri eklendi!`);
    console.log(`📊 Toplam Kalori: ${totalCalories} kcal`);
    console.log(`🎯 Hedef: 2000 kcal`);
    console.log(`📈 Gerçekleşme: ${Math.round((totalCalories / 2000) * 100)}%`);

    connection.end();

  } catch (error) {
    console.error('❌ Hata:', error);
    connection.end();
  }
}

addTestMeals(); 