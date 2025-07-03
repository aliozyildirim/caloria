const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

const connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'root',
  database: 'caloria_db'
});

async function createDemoData() {
  try {
    console.log('🔄 Demo veriler oluşturuluyor...');

    // Demo users
    const demoUsers = [
      { email: 'ahmet@demo.com', username: 'ahmet123', fullName: 'Ahmet Yılmaz', password: 'demo123' },
      { email: 'ayse@demo.com', username: 'ayse456', fullName: 'Ayşe Kaya', password: 'demo123' },
      { email: 'mehmet@demo.com', username: 'mehmet789', fullName: 'Mehmet Demir', password: 'demo123' },
      { email: 'fatma@demo.com', username: 'fatma321', fullName: 'Fatma Şahin', password: 'demo123' },
      { email: 'ali@demo.com', username: 'ali654', fullName: 'Ali Özkan', password: 'demo123' }
    ];

    // Create users
    const userIds = [];
    for (const user of demoUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      
      const [result] = await connection.promise().execute(
        'INSERT IGNORE INTO users (email, username, password, full_name) VALUES (?, ?, ?, ?)',
        [user.email, user.username, hashedPassword, user.fullName]
      );
      
      if (result.insertId) {
        userIds.push(result.insertId);
        console.log(`✅ Kullanıcı oluşturuldu: ${user.fullName}`);
      } else {
        // Get existing user ID
        const [existing] = await connection.promise().execute(
          'SELECT id FROM users WHERE email = ?', 
          [user.email]
        );
        if (existing.length > 0) {
          userIds.push(existing[0].id);
          console.log(`ℹ️  Kullanıcı zaten var: ${user.fullName}`);
        }
      }
    }

    // Demo stories
    const demoStories = [
      {
        description: 'Ev yapimi pizza! Cok lezzetliydi',
        calories: 450,
        image_uri: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop'
      },
      {
        description: 'Sabah kahvaltisi - yumurta ve avokado',
        calories: 320,
        image_uri: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&h=300&fit=crop'
      },
      {
        description: 'Antrenman sonrasi protein smoothie',
        calories: 280,
        image_uri: 'https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=400&h=300&fit=crop'
      },
      {
        description: 'Akdeniz salatasi - super saglikli',
        calories: 180,
        image_uri: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop'
      },
      {
        description: 'Ev yapimi burger ve patates',
        calories: 680,
        image_uri: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop'
      },
      {
        description: 'Sushi night! Cok taze balik',
        calories: 420,
        image_uri: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop'
      }
    ];

    // Create stories
    let storyCount = 0;
    for (let i = 0; i < demoStories.length && i < userIds.length; i++) {
      const story = demoStories[i];
      const userId = userIds[i % userIds.length];
      
      // Get user info
      const [userInfo] = await connection.promise().execute(
        'SELECT full_name, avatar FROM users WHERE id = ?', 
        [userId]
      );
      
      if (userInfo.length > 0) {
        const hoursAgo = Math.floor(Math.random() * 24);
        await connection.promise().execute(
          'INSERT INTO stories (user_id, user_name, user_avatar, image_uri, description, calories, created_at) VALUES (?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR))',
          [
            userId,
            userInfo[0].full_name,
            userInfo[0].avatar,
            story.image_uri,
            story.description,
            story.calories,
            hoursAgo
          ]
        );
        storyCount++;
        console.log(`✅ Hikaye oluşturuldu: ${story.description.substring(0, 30)}...`);
      }
    }

    // Demo meals
    const demoMeals = [
      { name: 'Kahvalti Omlet', calories: 250, protein: 18, carbs: 5, fat: 18, meal_type: 'breakfast' },
      { name: 'Tavuk Salata', calories: 320, protein: 35, carbs: 15, fat: 12, meal_type: 'lunch' },
      { name: 'Balik ve Pilav', calories: 450, protein: 30, carbs: 45, fat: 15, meal_type: 'dinner' },
      { name: 'Meyve ve Yogurt', calories: 150, protein: 8, carbs: 25, fat: 3, meal_type: 'snack' }
    ];

    // Add meals for first 3 users
    let mealCount = 0;
    for (let i = 0; i < Math.min(3, userIds.length); i++) {
      const userId = userIds[i];
      for (const meal of demoMeals) {
        const daysAgo = Math.floor(Math.random() * 7);
        await connection.promise().execute(
          'INSERT INTO meals (user_id, name, calories, protein, carbs, fat, meal_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))',
          [
            userId,
            meal.name,
            meal.calories,
            meal.protein,
            meal.carbs,
            meal.fat,
            meal.meal_type,
            daysAgo
          ]
        );
        mealCount++;
      }
    }

    console.log(`\n🎉 Demo veriler başarıyla oluşturuldu!`);
    console.log(`👥 ${userIds.length} kullanıcı`);
    console.log(`📖 ${storyCount} hikaye`);
    console.log(`🍽️ ${mealCount} yemek`);
    
    connection.end();
    
  } catch (error) {
    console.error('❌ Hata:', error);
    connection.end();
  }
}

createDemoData(); 