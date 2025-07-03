const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'root',
  database: 'caloria_db'
});

async function checkData() {
  try {
    console.log('🔍 Database verilerini kontrol ediyorum...\n');

    // Check current user (assuming you're user ID 1)
    const [currentUser] = await connection.promise().execute(
      'SELECT * FROM users WHERE id = 1'
    );
    
    if (currentUser.length > 0) {
      console.log('👤 Mevcut Kullanıcı:');
      console.log(`   ID: ${currentUser[0].id}`);
      console.log(`   Ad: ${currentUser[0].full_name}`);
      console.log(`   Email: ${currentUser[0].email}\n`);
    }

    // Check today's meals for current user
    const today = new Date().toISOString().split('T')[0];
    const [todayMeals] = await connection.promise().execute(
      'SELECT * FROM meals WHERE user_id = 1 AND DATE(created_at) = ?',
      [today]
    );

    console.log(`📅 Bugünkü Yemekler (${today}):`);
    let totalCalories = 0;
    if (todayMeals.length > 0) {
      todayMeals.forEach(meal => {
        console.log(`   ${meal.name}: ${meal.calories} kcal (${meal.meal_type})`);
        totalCalories += meal.calories;
      });
    } else {
      console.log('   Bugün hiç yemek eklenmemiş');
    }
    console.log(`   Toplam: ${totalCalories} kcal\n`);

    // Check user profile for calorie goal
    const [profile] = await connection.promise().execute(
      'SELECT * FROM user_profiles WHERE user_id = 1'
    );

    if (profile.length > 0) {
      console.log('🎯 Kullanıcı Profili:');
      console.log(`   Günlük Hedef: ${profile[0].daily_calorie_goal} kcal`);
      const percentage = Math.round((totalCalories / profile[0].daily_calorie_goal) * 100);
      console.log(`   Gerçekleşme: ${percentage}%\n`);
    } else {
      console.log('❌ Kullanıcı profili bulunamadı\n');
    }

    // Check all stories
    const [stories] = await connection.promise().execute(
      'SELECT * FROM stories ORDER BY created_at DESC LIMIT 10'
    );

    console.log('📖 Son Hikayeler:');
    stories.forEach((story, index) => {
      console.log(`   ${index + 1}. ${story.user_name}: ${story.description}`);
    });

    // Check all users
    const [allUsers] = await connection.promise().execute(
      'SELECT id, full_name, email FROM users ORDER BY id'
    );

    console.log('\n👥 Tüm Kullanıcılar:');
    allUsers.forEach(user => {
      console.log(`   ID ${user.id}: ${user.full_name} (${user.email})`);
    });

    connection.end();

  } catch (error) {
    console.error('❌ Hata:', error);
    connection.end();
  }
}

checkData(); 