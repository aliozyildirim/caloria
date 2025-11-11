const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();
// Model yükleme kaldırıldı - Python backend'de beslenme modeli mevcut
// @xenova/transformers kullanılmıyor, Python backend kullanılıyor

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// MySQL Connection with pooling and reconnection
const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'caloria_db',
  port: process.env.DB_PORT || 3306,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT) || 0
};

const pool = mysql.createPool(dbConfig);

// Promisify for easier async/await usage
const promisePool = pool.promise();

// Test connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ MySQL Connection Error:', err.message);
    return;
  }
  console.log('✅ MySQL Connected!');
  connection.release();
});

// Handle connection errors
pool.on('connection', function (connection) {
  console.log('MySQL connection established as id ' + connection.threadId);
});

pool.on('error', function(err) {
  console.error('MySQL pool error:', err);
  if(err.code === 'PROTOCOL_CONNECTION_LOST') {
    console.log('Reconnecting to MySQL...');
  } else {
    throw err;
  }
});

// JWT Middleware - Python backend'den gelen token'ları da destekliyor
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  // Token'ı temizle (boşlukları kaldır)
  token = token.trim();

  const secret = process.env.JWT_SECRET || 'caloria_secret';
  
  // Try JWT verification first
  jwt.verify(token, secret, (err, user) => {
    if (err) {
      // If JWT fails, try fallback token (base64 encoded JSON)
      try {
        const decoded = Buffer.from(token, 'base64').toString('utf-8');
        const tokenData = JSON.parse(decoded);
        
        // Check expiration
        if (tokenData.exp && tokenData.exp < Date.now()) {
          return res.status(403).json({ error: 'Token expired' });
        }
        
        // Use fallback token data
        user = tokenData;
        
        // Normalize user data
        if (user.user_id && !user.userId) {
          user.userId = user.user_id;
          user.id = user.user_id;
        }
        if (user.userId && !user.id) {
          user.id = user.userId;
        }
        
        req.user = user;
        return next();
      } catch (fallbackErr) {
        // Both JWT and fallback failed
        if (err.message !== 'invalid signature') {
          console.error('Token verification error:', err.message);
        }
        return res.status(403).json({ error: 'Invalid token' });
      }
    }
    
    if (!user) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    
    // Python backend'den gelen token'larda user_id var, Node.js'de userId bekleniyor
    // Her iki formatı da destekle
    if (user.user_id && !user.userId) {
      user.userId = user.user_id;
      user.id = user.user_id;
    }
    if (user.userId && !user.id) {
      user.id = user.userId;
    }
    
    req.user = user;
    next();
  });
};

// ===============================
// WEB ROUTES
// ===============================

// Serve main web app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===============================
// AUTH ROUTES
// ===============================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, username, password, fullName } = req.body;

    // Check if user exists
    const checkQuery = 'SELECT * FROM users WHERE email = ? OR username = ?';
    const [results] = await promisePool.execute(checkQuery, [email, username]);

    if (results.length > 0) {
      return res.status(400).json({ error: 'Email veya kullanıcı adı zaten kullanılıyor' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const insertQuery = 'INSERT INTO users (email, username, password, full_name) VALUES (?, ?, ?, ?)';
    const [result] = await promisePool.execute(insertQuery, [email, username, hashedPassword, fullName]);

    const userId = result.insertId;
    
    // Generate simple token (fallback for old Node.js)
    let token;
    try {
      const jwtSecret = String(process.env.JWT_SECRET || 'caloria_secret');
      token = jwt.sign(
        { userId: userId, email: email, username: username }, 
        jwtSecret, 
        { expiresIn: '7d' }
      );
    } catch (jwtError) {
      console.log('JWT error, using fallback token:', jwtError.message);
      // Fallback: simple token
      const tokenData = JSON.stringify({ userId, email, username, exp: Date.now() + 7*24*60*60*1000 });
      token = Buffer.from(tokenData).toString('base64');
    }

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: { id: userId, email, username, fullName }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    const query = 'SELECT * FROM users WHERE (email = ? OR username = ?) AND is_active = 1';
    const [results] = await promisePool.execute(query, [emailOrUsername, emailOrUsername]);

    if (results.length === 0) {
      return res.status(401).json({ error: 'Geçersiz email/kullanıcı adı veya şifre' });
    }

    const user = results[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Geçersiz email/kullanıcı adı veya şifre' });
    }

    // Update last login
    const updateQuery = 'UPDATE users SET last_login_at = NOW() WHERE id = ?';
    await promisePool.execute(updateQuery, [user.id]);

    // Generate token (with fallback)
    let token;
    try {
      const jwtSecret = String(process.env.JWT_SECRET || 'caloria_secret');
      token = jwt.sign(
        { userId: user.id, email: user.email, username: user.username }, 
        jwtSecret, 
        { expiresIn: '7d' }
      );
    } catch (jwtError) {
      console.log('JWT error in login, using fallback token:', jwtError.message);
      const tokenData = JSON.stringify({ userId: user.id, email: user.email, username: user.username, exp: Date.now() + 7*24*60*60*1000 });
      token = Buffer.from(tokenData).toString('base64');
    }

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ===============================
// USER ROUTES
// ===============================

// Get current user
app.get('/api/user/me', authenticateToken, async (req, res) => {
  try {
    const query = 'SELECT id, email, username, full_name, avatar, created_at FROM users WHERE id = ?';
    const [results] = await promisePool.execute(query, [req.user.userId]);
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(results[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get user profile
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const query = 'SELECT * FROM user_profiles WHERE user_id = ?';
    const [results] = await promisePool.execute(query, [req.user.userId]);
    
    if (results.length === 0) {
      return res.json(null); // No profile yet
    }

    res.json(results[0]);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create/Update user profile
app.post('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { name, age, height, weight, gender, activityLevel, goal, targetWeight, dailyCalorieGoal, dailyProteinGoal, dailyCarbsGoal, dailyFatGoal } = req.body;

    const query = `
      INSERT INTO user_profiles 
      (user_id, name, age, height, weight, gender, activity_level, goal, target_weight, daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      name = VALUES(name), age = VALUES(age), height = VALUES(height), weight = VALUES(weight),
      gender = VALUES(gender), activity_level = VALUES(activity_level), goal = VALUES(goal),
      target_weight = VALUES(target_weight), daily_calorie_goal = VALUES(daily_calorie_goal),
      daily_protein_goal = VALUES(daily_protein_goal), daily_carbs_goal = VALUES(daily_carbs_goal),
      daily_fat_goal = VALUES(daily_fat_goal), updated_at = NOW()
    `;

    const [result] = await promisePool.execute(query, [req.user.userId, name, age, height, weight, gender, activityLevel, goal, targetWeight, dailyCalorieGoal, dailyProteinGoal, dailyCarbsGoal, dailyFatGoal]);

    res.json({ message: 'Profile saved successfully', id: result.insertId });
  } catch (error) {
    console.error('Profile save error:', error);
    res.status(500).json({ error: 'Profile save failed' });
  }
});

// ===============================
// MEALS ROUTES
// ===============================

// Get user's meals
app.get('/api/meals', authenticateToken, async (req, res) => {
  try {
    const { date, limit = 50 } = req.query;
    
    // Debug user data
    console.log('Get meals - user data:', req.user);
    
    const userId = req.user.userId || req.user.id || req.user.user_id;
    if (!userId) {
      return res.status(400).json({ error: 'User ID not found in token' });
    }
    
    let query = 'SELECT * FROM meals WHERE user_id = ?';
    let params = [userId];

    if (date) {
      // Try to use date field first, fallback to created_at if date is null
      query += ' AND (date = ? OR (date IS NULL AND DATE(created_at) = DATE(?)))';
      params.push(date);
      params.push(date);
    }

    query += ' ORDER BY COALESCE(date, DATE(created_at)) DESC, created_at DESC LIMIT ?';
    const limitValue = parseInt(limit) || 50;
    params.push(limitValue);
    
    console.log('Meals query:', query);
    console.log('Meals params:', params);

    const [results] = await promisePool.execute(query, params);
    res.json(results);
  } catch (error) {
    console.error('Get meals error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Add meal
app.post('/api/meals', authenticateToken, async (req, res) => {
  try {
    const { name, calories, protein, carbs, fat, image_uri, meal_type, date, notes } = req.body;

    // Validate required fields
    if (!name || calories === undefined || protein === undefined || carbs === undefined || fat === undefined || !meal_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Ensure all numeric values are valid
    const validatedCalories = parseFloat(calories) || 0;
    const validatedProtein = parseFloat(protein) || 0;
    const validatedCarbs = parseFloat(carbs) || 0;
    const validatedFat = parseFloat(fat) || 0;

    // Use provided date or current date
    const mealDate = date || new Date().toISOString().split('T')[0];

    const query = 'INSERT INTO meals (user_id, name, calories, protein, carbs, fat, image_uri, meal_type, date, notes, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const [result] = await promisePool.execute(query, [
      req.user.userId, 
      name, 
      validatedCalories, 
      validatedProtein, 
      validatedCarbs, 
      validatedFat, 
      image_uri || null, 
      meal_type,
      mealDate,
      notes || null,
      'manual'
    ]);

    // Check for achievements after meal creation

    res.json({ message: 'Meal saved successfully', id: result.insertId });
  } catch (error) {
    console.error('Meal insert error:', error);
    res.status(500).json({ error: 'Meal save failed' });
  }
});

// ===============================
// STORIES ROUTES
// ===============================

// Get all stories
app.get('/api/stories', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT s.*, 
             (SELECT COUNT(*) FROM story_likes sl WHERE sl.story_id = s.id) as likes,
             (SELECT COUNT(*) FROM story_likes sl WHERE sl.story_id = s.id AND sl.user_id = ?) as is_liked
      FROM stories s 
      ORDER BY s.created_at DESC 
      LIMIT 50
    `;
    
    const [results] = await promisePool.execute(query, [req.user.userId]);
    
    res.json(results);
  } catch (error) {
    console.error('Get stories error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Add story
app.post('/api/stories', authenticateToken, async (req, res) => {
  try {
    const { imageUri, description, calories } = req.body;

    // Validate required fields
    if (!description || calories === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Remove emojis and special characters to avoid MySQL charset issues
    const cleanDescription = description
      .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
      .replace(/[\u{1F900}-\u{1F9FF}]|[\u{1FA70}-\u{1FAFF}]/gu, '')
      .trim();

    if (!cleanDescription) {
      return res.status(400).json({ error: 'Description cannot be empty after cleaning' });
    }

    // Validate calories
    const validatedCalories = parseFloat(calories) || 0;

    // First get user info
    const getUserQuery = 'SELECT username, full_name, avatar FROM users WHERE id = ?';
    const [userResults] = await promisePool.execute(getUserQuery, [req.user.userId]);

    if (userResults.length === 0) {
      return res.status(500).json({ error: 'User not found' });
    }

    const user = userResults[0];
    const query = 'INSERT INTO stories (user_id, user_name, user_avatar, image_uri, description, calories) VALUES (?, ?, ?, ?, ?, ?)';
    
    const [result] = await promisePool.execute(query, [
      req.user.userId, 
      user.full_name || user.username, 
      user.avatar || null, 
      imageUri || null, 
      cleanDescription, 
      validatedCalories
    ]);

    res.json({ message: 'Story saved successfully', id: result.insertId });
  } catch (error) {
    console.error('Story insert error:', error);
    res.status(500).json({ error: 'Story save failed' });
  }
});

// Like/Unlike story
app.post('/api/stories/:id/like', authenticateToken, async (req, res) => {
  try {
    const storyId = parseInt(req.params.id);
    const userId = req.user.userId;

    // Check if user already liked this story
    const checkQuery = 'SELECT * FROM story_likes WHERE story_id = ? AND user_id = ?';
    const [existing] = await promisePool.execute(checkQuery, [storyId, userId]);

    if (existing.length > 0) {
      // Unlike the story
      const deleteQuery = 'DELETE FROM story_likes WHERE story_id = ? AND user_id = ?';
      await promisePool.execute(deleteQuery, [storyId, userId]);
      res.json({ message: 'Story unliked', liked: false });
    } else {
      // Like the story
      const insertQuery = 'INSERT INTO story_likes (story_id, user_id) VALUES (?, ?)';
      await promisePool.execute(insertQuery, [storyId, userId]);
      res.json({ message: 'Story liked', liked: true });
    }
  } catch (error) {
    console.error('Like story error:', error);
    res.status(500).json({ error: 'Like operation failed' });
  }
});

// ===============================
// FAVORITES ROUTES
// ===============================

// Get user's favorites
app.get('/api/favorites', authenticateToken, async (req, res) => {
  try {
    const query = 'SELECT * FROM favorites WHERE user_id = ? ORDER BY times_used DESC, last_used DESC';
    const [results] = await promisePool.execute(query, [req.user.userId]);
    res.json(results);
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Add to favorites
app.post('/api/favorites', authenticateToken, async (req, res) => {
  try {
    const { name, calories, protein, carbs, fat, category } = req.body;

    const query = 'INSERT INTO favorites (user_id, name, calories, protein, carbs, fat, category, times_used, last_used) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())';
    const [result] = await promisePool.execute(query, [req.user.userId, name, calories, protein, carbs, fat, category, 1]);

    res.json({ message: 'Added to favorites successfully', id: result.insertId });
  } catch (error) {
    console.error('Add to favorites error:', error);
    res.status(500).json({ error: 'Failed to add to favorites' });
  }
});

// ===============================
// DIET PLANS ROUTES
// ===============================

// Get all diet plans
// Helper function to parse JSON fields
const parseJsonField = (field) => {
  if (!field) return null;
  
  // If it's already a parsed object, return it
  if (typeof field === 'object' && !Array.isArray(field) && field !== null) {
    // Check if it's a MySQL JSON object (has en/tr keys)
    if (field.en !== undefined || field.tr !== undefined) {
      return field;
    }
    // If it's a plain object but not our format, return as is
    return field;
  }
  
  // If it's a string, try to parse it
  if (typeof field === 'string') {
    // Check if it's already a valid JSON string
    if (field.trim().startsWith('{') || field.trim().startsWith('[')) {
      try {
        const parsed = JSON.parse(field);
        // If parsed successfully and it's an object, return it
        if (typeof parsed === 'object' && parsed !== null) {
          return parsed;
        }
        return field;
      } catch (e) {
        // If not valid JSON, return as is (fallback for old data)
        return field;
      }
    }
    // If it doesn't look like JSON, return as is
    return field;
  }
  
  return field;
};

app.get('/api/diet-plans', authenticateToken, async (req, res) => {
  try {
    const query = 'SELECT * FROM diet_plans ORDER BY created_at DESC';
    const [results] = await promisePool.execute(query);
    
    // Process each diet plan to properly parse JSON fields
    const processedResults = results.map(plan => ({
      ...plan,
      name: parseJsonField(plan.name),
      description: parseJsonField(plan.description),
      benefits: (() => {
        try {
          console.log('Parsing benefits:', plan.benefits, typeof plan.benefits);
          // Check if benefits is already an array or string
          if (typeof plan.benefits === 'string') {
            // Try to parse as JSON first
            try {
              const parsed = JSON.parse(plan.benefits);
              // Handle nested object format like {"benefits": [...]}
              if (parsed && typeof parsed === 'object' && parsed.benefits) {
                return parsed.benefits;
              }
              return parsed;
            } catch (e) {
              // If JSON parse fails, treat as comma-separated string
              return plan.benefits ? plan.benefits.split(',').map(b => b.trim()) : [];
            }
          } else if (Array.isArray(plan.benefits)) {
            return plan.benefits;
          }
          return [];
        } catch (e) {
          console.error('Benefits parse error:', e.message, 'Data:', plan.benefits);
          return [];
        }
      })(),
      restrictions: (() => {
        try {
          console.log('Parsing restrictions:', plan.restrictions, typeof plan.restrictions);
          // Check if restrictions is already an array or string
          if (typeof plan.restrictions === 'string') {
            // Try to parse as JSON first
            try {
              const parsed = JSON.parse(plan.restrictions);
              // Handle nested object format like {"restrictions": [...]}
              if (parsed && typeof parsed === 'object' && parsed.restrictions) {
                return parsed.restrictions;
              }
              return parsed;
            } catch (e) {
              // If JSON parse fails, treat as comma-separated string
              return plan.restrictions ? plan.restrictions.split(',').map(r => r.trim()) : [];
            }
          } else if (Array.isArray(plan.restrictions)) {
            return plan.restrictions;
          }
          return [];
        } catch (e) {
          console.error('Restrictions parse error:', e.message, 'Data:', plan.restrictions);
          return [];
        }
      })()
    }));
    
    res.json(processedResults);
  } catch (error) {
    console.error('Get diet plans error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get active diet plan for user
app.get('/api/diet-plans/active', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT udp.*, dp.*
      FROM user_diet_plans udp
      JOIN diet_plans dp ON udp.diet_plan_id = dp.id
      WHERE udp.user_id = ? AND udp.is_active = 1
      ORDER BY udp.created_at DESC
      LIMIT 1
    `;
    
    const [results] = await promisePool.execute(query, [req.user.userId]);
    
    if (results.length === 0) {
      return res.json(null);
    }
    
    const result = results[0];
    const userDietPlan = {
      id: result.id,
      user_id: result.user_id,
      diet_plan_id: result.diet_plan_id,
      is_active: result.is_active === 1,
      start_date: result.start_date,
      end_date: result.end_date,
      created_at: result.created_at,
      diet_plan: {
        id: result.diet_plan_id,
        name: parseJsonField(result.name),
        description: parseJsonField(result.description),
        type: result.type,
        duration: result.duration,
        daily_calories: result.daily_calories,
        daily_protein: result.daily_protein,
        daily_carbs: result.daily_carbs,
        daily_fat: result.daily_fat,
        benefits: (() => {
          try {
            console.log('Parsing benefits:', result.benefits, typeof result.benefits);
            // Check if benefits is already an array or string
            if (typeof result.benefits === 'string') {
              // Try to parse as JSON first
              try {
                return JSON.parse(result.benefits);
              } catch (e) {
                // If JSON parse fails, treat as comma-separated string
                return result.benefits ? result.benefits.split(',').map(b => b.trim()) : [];
              }
            } else if (Array.isArray(result.benefits)) {
              return result.benefits;
            }
            return [];
          } catch (e) {
            console.error('Benefits parse error:', e.message, 'Data:', result.benefits);
            return [];
          }
        })(),
        restrictions: (() => {
          try {
            console.log('Parsing restrictions:', result.restrictions, typeof result.restrictions);
            // Check if restrictions is already an array or string
            if (typeof result.restrictions === 'string') {
              // Try to parse as JSON first
              try {
                return JSON.parse(result.restrictions);
              } catch (e) {
                // If JSON parse fails, treat as comma-separated string
                return result.restrictions ? result.restrictions.split(',').map(r => r.trim()) : [];
              }
            } else if (Array.isArray(result.restrictions)) {
              return result.restrictions;
            }
            return [];
          } catch (e) {
            console.error('Restrictions parse error:', e.message, 'Data:', result.restrictions);
            return [];
          }
        })(),
        difficulty: result.difficulty,
        disclaimer: result.disclaimer,
        created_at: result.created_at
      }
    };
    
    res.json(userDietPlan);
  } catch (error) {
    console.error('Get active diet plan error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Activate diet plan
app.post('/api/diet-plans/:planId/activate', authenticateToken, async (req, res) => {
  try {
    const { planId } = req.params;
    const userId = req.user.userId;
    
    // Check if diet plan exists
    const planQuery = 'SELECT * FROM diet_plans WHERE id = ?';
    const [planResults] = await promisePool.execute(planQuery, [planId]);
    
    if (planResults.length === 0) {
      return res.status(404).json({ error: 'Diet plan not found' });
    }
    
    const dietPlan = planResults[0];
    
    // Deactivate any existing active diet plans
    const deactivateQuery = 'UPDATE user_diet_plans SET is_active = FALSE WHERE user_id = ? AND is_active = TRUE';
    await promisePool.execute(deactivateQuery, [userId]);
    
    // Calculate start and end dates
    const startDate = new Date().toISOString().split('T')[0];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + dietPlan.duration);
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Create new active diet plan
    const insertQuery = `
      INSERT INTO user_diet_plans (user_id, diet_plan_id, is_active, start_date, end_date) 
      VALUES (?, ?, TRUE, ?, ?)
    `;
    const [result] = await promisePool.execute(insertQuery, [userId, planId, startDate, endDateStr]);
    
    // Automatically generate meal plans for the diet period
    try {
      const mealPlansData = generateMealPlansForDiet(dietPlan.type, dietPlan.daily_calories);
      
      const currentDate = new Date(startDate);
      const endDateObj = new Date(endDateStr);
      let planCount = 0;
      
      while (currentDate <= endDateObj) {
        const dateString = currentDate.toISOString().split('T')[0];
        const dayIndex = (Math.floor((currentDate - new Date(startDate)) / (1000 * 60 * 60 * 24))) % 7;
        
        for (const mealType of ['breakfast', 'lunch', 'dinner', 'snack']) {
          const mealData = mealPlansData[mealType][dayIndex % mealPlansData[mealType].length];
          
          const mealInsertQuery = `
            INSERT INTO meal_plans (user_id, diet_plan_id, date, meal_type, planned_food_name, planned_calories, planned_protein, planned_carbs, planned_fat, instructions)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;
          
          await promisePool.execute(mealInsertQuery, [
            userId,
            planId,
            dateString,
            mealType,
            mealData.name,
            mealData.calories,
            mealData.protein,
            mealData.carbs,
            mealData.fat,
            mealData.instructions
          ]);
          
          planCount++;
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      console.log(`Generated ${planCount} meal plans for ${dietPlan.name}`);
    } catch (mealPlanError) {
      console.error('Error generating meal plans:', mealPlanError);
      // Don't fail the diet activation if meal plan generation fails
    }
    
    res.status(201).json({
      message: 'Diet plan activated successfully!',
      userDietPlanId: result.insertId,
      dietPlan: {
        ...dietPlan,
        benefits: (() => {
          try {
            console.log('Parsing benefits:', dietPlan.benefits, typeof dietPlan.benefits);
            // Check if benefits is already an array or string
            if (typeof dietPlan.benefits === 'string') {
              // Try to parse as JSON first
              try {
                return JSON.parse(dietPlan.benefits);
              } catch (e) {
                // If JSON parse fails, treat as comma-separated string
                return dietPlan.benefits ? dietPlan.benefits.split(',').map(b => b.trim()) : [];
              }
            } else if (Array.isArray(dietPlan.benefits)) {
              return dietPlan.benefits;
            }
            return [];
          } catch (e) {
            console.error('Benefits parse error:', e.message, 'Data:', dietPlan.benefits);
            return [];
          }
        })(),
        restrictions: (() => {
          try {
            console.log('Parsing restrictions:', dietPlan.restrictions, typeof dietPlan.restrictions);
            // Check if restrictions is already an array or string
            if (typeof dietPlan.restrictions === 'string') {
              // Try to parse as JSON first
              try {
                return JSON.parse(dietPlan.restrictions);
              } catch (e) {
                // If JSON parse fails, treat as comma-separated string
                return dietPlan.restrictions ? dietPlan.restrictions.split(',').map(r => r.trim()) : [];
              }
            } else if (Array.isArray(dietPlan.restrictions)) {
              return dietPlan.restrictions;
            }
            return [];
          } catch (e) {
            console.error('Restrictions parse error:', e.message, 'Data:', dietPlan.restrictions);
            return [];
          }
        })()
      },
      startDate,
      endDate: endDateStr
    });
  } catch (error) {
    console.error('Activate diet plan error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ===============================
// DIET LOG ROUTES
// ===============================

// Save diet log
app.post('/api/diet-log', authenticateToken, async (req, res) => {
  try {
    const { date, weight, mood, energy, water, notes, exercise, sleep } = req.body;
    
    // Validate required fields
    if (!date || !weight) {
      return res.status(400).json({ error: 'Date and weight are required' });
    }

    if (isNaN(weight) || weight <= 0 || weight > 500) {
      return res.status(400).json({ error: 'Invalid weight value' });
    }

    // Check if log already exists for this date
    const checkQuery = 'SELECT id FROM diet_logs WHERE user_id = ? AND date = ?';
    const [existing] = await promisePool.execute(checkQuery, [req.user.userId, date]);

    if (existing.length > 0) {
      // Update existing log
      const updateQuery = `
        UPDATE diet_logs 
        SET weight = ?, mood = ?, energy = ?, water = ?, notes = ?, exercise = ?, sleep = ?, updated_at = NOW()
        WHERE user_id = ? AND date = ?
      `;
      await promisePool.execute(updateQuery, [
        weight, mood || 5, energy || 5, water || 0, notes || '', exercise || '', sleep || 0,
        req.user.userId, date
      ]);
      
      res.json({ message: 'Diet log updated successfully' });
    } else {
      // Create new log
      const insertQuery = `
        INSERT INTO diet_logs (user_id, date, weight, mood, energy, water, notes, exercise, sleep, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      await promisePool.execute(insertQuery, [
        req.user.userId, date, weight, mood || 5, energy || 5, water || 0, 
        notes || '', exercise || '', sleep || 0
      ]);
      
      res.json({ message: 'Diet log saved successfully' });
    }
  } catch (error) {
    console.error('Save diet log error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get diet log for specific date
app.get('/api/diet-log/:date', authenticateToken, async (req, res) => {
  try {
    const { date } = req.params;
    
    const query = 'SELECT * FROM diet_logs WHERE user_id = ? AND date = ?';
    const [results] = await promisePool.execute(query, [req.user.userId, date]);
    
    if (results.length === 0) {
      return res.json(null);
    }
    
    res.json(results[0]);
  } catch (error) {
    console.error('Get diet log error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get diet logs for date range
app.get('/api/diet-logs', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, limit = 30 } = req.query;
    
    let query = 'SELECT * FROM diet_logs WHERE user_id = ?';
    let params = [req.user.userId];
    
    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }
    
    query += ' ORDER BY date DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const [results] = await promisePool.execute(query, params);
    res.json(results);
  } catch (error) {
    console.error('Get diet logs error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get weight progress data
app.get('/api/weight-progress', authenticateToken, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let dateCondition = '';
    switch (period) {
      case 'week':
        dateCondition = 'AND date >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
        break;
      case 'month':
        dateCondition = 'AND date >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        break;
      case 'all':
      default:
        dateCondition = '';
        break;
    }
    
    const query = `
      SELECT date, weight, mood, energy 
      FROM diet_logs 
      WHERE user_id = ? ${dateCondition}
      ORDER BY date ASC
    `;
    
    const [results] = await promisePool.execute(query, [req.user.userId]);
    
    // Calculate BMI for each entry (assuming height from user profile)
    const profileQuery = 'SELECT height FROM user_profiles WHERE user_id = ?';
    const [profileResult] = await promisePool.execute(profileQuery, [req.user.userId]);
    const height = profileResult.length > 0 ? profileResult[0].height : 175; // default 175cm
    
    const weightEntries = results.map(entry => ({
      date: entry.date,
      weight: entry.weight,
      bmi: entry.weight / Math.pow(height / 100, 2)
    }));
    
    const adherenceScores = results.map(entry => ({
      date: entry.date,
      score: (entry.mood + entry.energy) / 2 // Simple adherence calculation
    }));
    
    // Calculate statistics
    const weights = results.map(r => r.weight).filter(w => w > 0);
    const startWeight = weights.length > 0 ? weights[weights.length - 1] : 0;
    const currentWeight = weights.length > 0 ? weights[0] : 0;
    const weightLoss = startWeight - currentWeight;
    
    const moods = results.map(r => r.mood).filter(m => m > 0);
    const averageAdherence = moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : 0;
    
    res.json({
      weightEntries,
      adherenceScores,
      totalDays: results.length,
      completedDays: results.length,
      averageAdherence,
      weightLoss,
      startWeight,
      currentWeight,
      targetWeight: 75 // This should come from user profile/goals
    });
  } catch (error) {
    console.error('Get weight progress error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ===============================
// CHALLENGES ROUTES
// ===============================

// Get all challenges
app.get('/api/challenges', authenticateToken, async (req, res) => {
  try {
    const query = 'SELECT * FROM challenges WHERE is_active = TRUE ORDER BY difficulty, title';
    const [results] = await promisePool.execute(query);
    
    // Parse JSON fields for multilanguage support
    const processedResults = results.map(challenge => ({
      ...challenge,
      title: parseJsonField(challenge.title),
      description: parseJsonField(challenge.description)
    }));
    
    res.json(processedResults);
  } catch (error) {
    console.error('Get challenges error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get random challenge
app.get('/api/challenges/random', authenticateToken, async (req, res) => {
  try {
    const query = 'SELECT * FROM challenges WHERE is_active = TRUE ORDER BY RAND() LIMIT 1';
    const [results] = await promisePool.execute(query);
    
    if (results.length === 0) {
      return res.status(404).json({ error: 'No challenges found' });
    }
    
    // Parse JSON fields for multilanguage support
    const challenge = results[0];
    const processedChallenge = {
      ...challenge,
      title: parseJsonField(challenge.title),
      description: parseJsonField(challenge.description)
    };
    
    res.json(processedChallenge);
  } catch (error) {
    console.error('Get random challenge error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Accept challenge
app.post('/api/challenges/:challengeId/accept', authenticateToken, async (req, res) => {
  try {
    const { challengeId } = req.params;
    const userId = req.user.userId;
    
    // Check if challenge exists
    const challengeQuery = 'SELECT * FROM challenges WHERE id = ? AND is_active = TRUE';
    const [challengeResults] = await promisePool.execute(challengeQuery, [challengeId]);
    
    if (challengeResults.length === 0) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Check if user already has an active challenge
    const activeQuery = `
      SELECT * FROM user_challenges 
      WHERE user_id = ? AND is_completed = FALSE 
      AND DATE(created_at) = CURDATE()
    `;
    const [activeResults] = await promisePool.execute(activeQuery, [userId]);
    
    if (activeResults.length > 0) {
      return res.status(400).json({ 
        error: 'Bugün zaten bir challenge kabul ettiniz. Her gün sadece 1 challenge kabul edebilirsiniz.' 
      });
    }
    
    const challenge = challengeResults[0];
    const startDate = new Date().toISOString().split('T')[0];
    
    // Set end date to end of the day, 7 days from now
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    endDate.setHours(23, 59, 59, 999);
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Insert user challenge
    const insertQuery = `
      INSERT INTO user_challenges (user_id, challenge_id, start_date, end_date, current_progress, target_progress) 
      VALUES (?, ?, ?, ?, 0, ?)
    `;
    const [result] = await promisePool.execute(insertQuery, [
      userId, challengeId, startDate, endDateStr, challenge.target_days
    ]);
    
    res.status(201).json({
      message: 'Challenge başarıyla kabul edildi!',
      userChallengeId: result.insertId,
      challenge: challenge
    });
  } catch (error) {
    console.error('Accept challenge error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update challenge progress
app.put('/api/user-challenges/:userChallengeId/progress', authenticateToken, async (req, res) => {
  try {
    const { userChallengeId } = req.params;
    const { increment = 1 } = req.body;
    const userId = req.user.userId;
    
    // Verify user owns this challenge
    const verifyQuery = 'SELECT * FROM user_challenges WHERE id = ? AND user_id = ?';
    const [verifyResults] = await promisePool.execute(verifyQuery, [userChallengeId, userId]);
    
    if (verifyResults.length === 0) {
      return res.status(404).json({ error: 'User challenge not found' });
    }
    
    const userChallenge = verifyResults[0];
    
    if (userChallenge.is_completed) {
      return res.status(400).json({ error: 'Challenge already completed' });
    }
    
    // Check if already completed today
    const today = new Date().toISOString().split('T')[0];
    const todayCheckQuery = `
      SELECT COUNT(*) as count 
      FROM xp_transactions 
      WHERE user_id = ? 
      AND source = 'challenge_daily' 
      AND source_id = ? 
      AND DATE(created_at) = ?
    `;
    const [todayCheck] = await promisePool.execute(todayCheckQuery, [userId, userChallengeId, today]);
    
    if (todayCheck[0].count > 0) {
      return res.status(400).json({ 
        error: 'Bu challenge için bugün zaten ilerleme kaydettiniz. Yarın tekrar deneyin!' 
      });
    }
    
    // Update progress
    const updateQuery = `
      UPDATE user_challenges 
      SET current_progress = current_progress + ?,
          is_completed = CASE WHEN current_progress + ? >= target_progress THEN TRUE ELSE FALSE END,
          completed_at = CASE WHEN current_progress + ? >= target_progress THEN NOW() ELSE completed_at END
      WHERE id = ?
    `;
    await promisePool.execute(updateQuery, [increment, increment, increment, userChallengeId]);
    
    // Add daily progress XP transaction (small daily reward)
    const dailyXpQuery = 'INSERT INTO xp_transactions (user_id, amount, source, source_id, description) VALUES (?, ?, ?, ?, ?)';
    await promisePool.execute(dailyXpQuery, [
      userId, 5, 'challenge_daily', userChallengeId, 'Daily challenge progress: +5 XP'
    ]);
    
    // Get updated challenge
    const [updatedResults] = await promisePool.execute(verifyQuery, [userChallengeId, userId]);
    const updated = updatedResults[0];
    
    // If completed, add completion XP
    if (updated.is_completed && !userChallenge.is_completed) {
      // Get challenge details for XP reward
      const challengeQuery = 'SELECT xp_reward FROM challenges WHERE id = ?';
      const [challengeResults] = await promisePool.execute(challengeQuery, [updated.challenge_id]);
      
      if (challengeResults.length > 0) {
        const xpReward = challengeResults[0].xp_reward;
        
        // Add completion XP transaction
        const xpQuery = 'INSERT INTO xp_transactions (user_id, amount, source, source_id, description) VALUES (?, ?, ?, ?, ?)';
        await promisePool.execute(xpQuery, [
          userId, xpReward, 'challenge_completion', userChallengeId, `Challenge completed: ${xpReward} XP`
        ]);
        
        // Update user total XP and level (including daily XP)
        const updateUserQuery = `
          UPDATE user_profiles 
          SET total_xp = total_xp + ?,
              level = CASE WHEN (total_xp + ?) >= level * 100 THEN level + 1 ELSE level END
          WHERE user_id = ?
        `;
        await promisePool.execute(updateUserQuery, [xpReward + 5, xpReward + 5, userId]);
        
        res.json({
          message: 'Challenge tamamlandı! 🎉',
          userChallenge: updated,
          completed: true,
          dailyXP: 5,
          completionXP: xpReward
        });
        return;
      }
    } else {
      // Just update daily XP
      const updateUserQuery = `
        UPDATE user_profiles 
        SET total_xp = total_xp + 5,
            level = CASE WHEN (total_xp + 5) >= level * 100 THEN level + 1 ELSE level END
        WHERE user_id = ?
      `;
      await promisePool.execute(updateUserQuery, [userId]);
    }
    
    res.json({
      message: 'Günlük ilerleme kaydedildi! +5 XP',
      userChallenge: updated,
      completed: false,
      dailyXP: 5,
      completionXP: 0
    });
  } catch (error) {
    console.error('Update challenge progress error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get user's active challenge
app.get('/api/user/active-challenge', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const query = `
      SELECT uc.*, c.title, c.description, c.type, c.xp_reward, c.icon, c.difficulty
      FROM user_challenges uc
      JOIN challenges c ON uc.challenge_id = c.id
      WHERE uc.user_id = ? AND uc.is_completed = FALSE
      ORDER BY uc.created_at DESC
      LIMIT 1
    `;
    const [results] = await promisePool.execute(query, [userId]);
    
    if (results.length === 0) {
      return res.json(null);
    }
    
    // Parse JSON fields for multilanguage support
    const result = results[0];
    const processedResult = {
      ...result,
      title: parseJsonField(result.title),
      description: parseJsonField(result.description)
    };
    
    res.json(processedResult);
  } catch (error) {
    console.error('Get active challenge error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get user XP info
app.get('/api/user/xp', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const query = 'SELECT total_xp, level FROM user_profiles WHERE user_id = ?';
    const [results] = await promisePool.execute(query, [userId]);
    
    if (results.length === 0) {
      return res.json({ totalXP: 0, level: 1, nextLevelXP: 100 });
    }
    
    const { total_xp, level } = results[0];
    const nextLevelXP = level * 100;
    
    res.json({ 
      totalXP: total_xp, 
      level, 
      nextLevelXP 
    });
  } catch (error) {
    console.error('Get user XP error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get XP transaction history
app.get('/api/user/xp-history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = req.query.limit || 10;
    
    const query = 'SELECT * FROM xp_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT ?';
    const [results] = await promisePool.execute(query, [userId, parseInt(limit)]);
    
    res.json(results);
  } catch (error) {
    console.error('Get XP history error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// XP History endpoint
app.get('/api/xp/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const query = `
      SELECT * FROM xp_transactions 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 20
    `;
    
    const [results] = await promisePool.execute(query, [userId]);
    res.json(results);
  } catch (error) {
    console.error('XP history error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Admin: XP Yükleme endpoint'i
app.post('/api/admin/add-xp', authenticateToken, async (req, res) => {
  try {
    const { targetUserId, amount, source, description } = req.body;
    
    if (!targetUserId || !amount) {
      return res.status(400).json({ error: 'User ID and amount required' });
    }

    // XP ekleme işlemi
    const connection = await promisePool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Kullanıcının mevcut XP'sini al
      const [currentXpResult] = await connection.execute(
        'SELECT total_xp, level FROM user_profiles WHERE user_id = ?',
        [targetUserId]
      );
      
      if (currentXpResult.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'User not found' });
      }
      
      const currentXp = currentXpResult[0].total_xp || 0;
      const newTotalXp = currentXp + parseInt(amount);
      const newLevel = Math.floor(newTotalXp / 100) + 1;
      
      // XP güncelle
      await connection.execute(
        'UPDATE user_profiles SET total_xp = ?, level = ? WHERE user_id = ?',
        [newTotalXp, newLevel, targetUserId]
      );
      
      // XP işlemini kaydet
      await connection.execute(
        'INSERT INTO xp_transactions (user_id, amount, source, description) VALUES (?, ?, ?, ?)',
        [targetUserId, parseInt(amount), source || 'admin_bonus', description || 'Admin tarafından eklendi']
      );
      
      await connection.commit();
      
      res.json({ 
        message: 'XP başarıyla eklendi',
        oldXp: currentXp,
        newXp: newTotalXp,
        levelUp: newLevel > currentXpResult[0].level
      });
      
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
    
  } catch (error) {
    console.error('Add XP error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ===============================
// ADMIN ROUTES
// ===============================

// Get all users (admin only)
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  try {
    const query = 'SELECT id, email, username, full_name, avatar, is_active, last_login_at, created_at FROM users ORDER BY created_at DESC';
    const [results] = await promisePool.execute(query);
    res.json(results);
  } catch (error) {
    console.error('Get admin users error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all stories (admin only)
app.get('/api/admin/stories', authenticateToken, async (req, res) => {
  try {
    const query = 'SELECT * FROM stories ORDER BY created_at DESC';
    const [results] = await promisePool.execute(query);
    res.json(results);
  } catch (error) {
    console.error('Get admin stories error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get all meals (admin only)
app.get('/api/admin/meals', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT m.*, u.username, u.full_name 
      FROM meals m 
      LEFT JOIN users u ON m.user_id = u.id 
      ORDER BY m.created_at DESC 
      LIMIT 100
    `;
    const [results] = await promisePool.execute(query);
    res.json(results);
  } catch (error) {
    console.error('Get admin meals error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get database stats (admin only)
app.get('/api/admin/stats', authenticateToken, async (req, res) => {
  try {
    const queries = [
      'SELECT COUNT(*) as count FROM users',
      'SELECT COUNT(*) as count FROM stories',
      'SELECT COUNT(*) as count FROM meals',
      'SELECT COUNT(*) as count FROM favorites',
      'SELECT COUNT(*) as count FROM user_profiles'
    ];

    const results = await Promise.all(queries.map(async (query) => {
      const [result] = await promisePool.execute(query);
      return result[0].count;
    }));

    const [users, stories, meals, favorites, profiles] = results;

    res.json({
      users,
      stories,
      meals,
      favorites,
      profiles,
      total: users + stories + meals + favorites + profiles
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Caloria Backend Server is running!',
    timestamp: new Date().toISOString()
  });
});

// Create demo data
app.post('/api/admin/create-demo-data', async (req, res) => {
  try {
    // Demo users
    const demoUsers = [
      { email: 'ahmet@demo.com', username: 'ahmet123', fullName: 'Ahmet Yılmaz', password: 'demo123' },
      { email: 'ayse@demo.com', username: 'ayse456', fullName: 'Ayşe Kaya', password: 'demo123' },
      { email: 'mehmet@demo.com', username: 'mehmet789', fullName: 'Mehmet Demir', password: 'demo123' },
      { email: 'fatma@demo.com', username: 'fatma321', fullName: 'Fatma Şahin', password: 'demo123' },
      { email: 'ali@demo.com', username: 'ali654', fullName: 'Ali Özkan', password: 'demo123' }
    ];

    // Create demo users
    const userIds = [];
    for (const user of demoUsers) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const insertQuery = 'INSERT IGNORE INTO users (email, username, password, full_name) VALUES (?, ?, ?, ?)';
      const [result] = await promisePool.execute(insertQuery, [user.email, user.username, hashedPassword, user.fullName]);
      
      if (result.insertId) {
        userIds.push(result.insertId);
      } else {
        // User already exists, get the ID
        const [existing] = await promisePool.execute('SELECT id FROM users WHERE email = ?', [user.email]);
        if (existing.length > 0) {
          userIds.push(existing[0].id);
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

    // Create demo stories
    for (let i = 0; i < demoStories.length && i < userIds.length; i++) {
      const story = demoStories[i];
      const userId = userIds[i % userIds.length];
      
      // Get user info
      const [userInfo] = await promisePool.execute('SELECT full_name, avatar FROM users WHERE id = ?', [userId]);
      if (userInfo.length > 0) {
        const insertStoryQuery = 'INSERT IGNORE INTO stories (user_id, user_name, user_avatar, image_uri, description, calories, created_at) VALUES (?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR))';
        await promisePool.execute(insertStoryQuery, [
          userId,
          userInfo[0].full_name,
          userInfo[0].avatar,
          story.image_uri,
          story.description,
          story.calories,
          Math.floor(Math.random() * 24) // Random hours ago
        ]);
      }
    }

    // Demo meals for variety
    const demoMeals = [
      { name: 'Kahvalti Omlet', calories: 250, protein: 18, carbs: 5, fat: 18, meal_type: 'breakfast' },
      { name: 'Tavuk Salata', calories: 320, protein: 35, carbs: 15, fat: 12, meal_type: 'lunch' },
      { name: 'Balik ve Pilav', calories: 450, protein: 30, carbs: 45, fat: 15, meal_type: 'dinner' },
      { name: 'Meyve ve Yogurt', calories: 150, protein: 8, carbs: 25, fat: 3, meal_type: 'snack' }
    ];

    // Add some meals for demo users
    for (const userId of userIds.slice(0, 3)) {
      for (const meal of demoMeals) {
        const insertMealQuery = 'INSERT INTO meals (user_id, name, calories, protein, carbs, fat, meal_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))';
        await promisePool.execute(insertMealQuery, [
          userId,
          meal.name,
          meal.calories,
          meal.protein,
          meal.carbs,
          meal.fat,
          meal.meal_type,
          Math.floor(Math.random() * 7) // Random days ago
        ]);
      }
    }

    res.json({ 
      message: 'Demo data created successfully!',
      users: userIds.length,
      stories: demoStories.length,
      meals: demoMeals.length * 3
    });

  } catch (error) {
    console.error('Demo data creation error:', error);
    res.status(500).json({ error: 'Failed to create demo data' });
  }
});

// ===============================
// MEAL PLANS ROUTES
// ===============================

// Get meal plans for user
app.get('/api/meal-plans', authenticateToken, async (req, res) => {
  try {
    const { date, week, weekOffset } = req.query;
    const userId = req.user.userId;
    
    console.log('=== MEAL PLANS API DEBUG ===');
    console.log('Query params:', { date, week, weekOffset });
    console.log('User ID:', userId);
    
    let query = `
      SELECT mp.*, dp.name as diet_plan_name, dp.type as diet_type
      FROM meal_plans mp
      LEFT JOIN diet_plans dp ON mp.diet_plan_id = dp.id
      WHERE mp.user_id = ?
    `;
    let params = [userId];
    
    if (date) {
      query += ' AND mp.date = ?';
      params.push(date);
      console.log('Filtering by specific date:', date);
    } else if (week) {
      // Calculate week dates - support different weeks via weekOffset
      const offset = parseInt(weekOffset) || 0;
      console.log('Week offset parsed:', offset);
      
      const today = new Date();
      console.log('Today:', today.toISOString());
      
      // Calculate start of week (Monday) for the target week
      const startOfWeek = new Date(today);
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days to Monday
      startOfWeek.setDate(today.getDate() + daysToMonday + (offset * 7));
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday
      
      const startDateStr = startOfWeek.toISOString().split('T')[0];
      const endDateStr = endOfWeek.toISOString().split('T')[0];
      
      console.log(`Week calculation:
        - Today: ${today.toISOString().split('T')[0]}
        - Day of week: ${dayOfWeek} (0=Sun, 1=Mon, etc.)
        - Days to Monday: ${daysToMonday}
        - Offset: ${offset} weeks
        - Start of week: ${startDateStr}
        - End of week: ${endDateStr}`);
      
      // Check if we need to extend the active diet plan's date range
      if (offset !== 0) {
        try {
          // Get active diet plan
          const dietQuery = `
            SELECT udp.*, dp.type, dp.daily_calories, dp.name
            FROM user_diet_plans udp
            JOIN diet_plans dp ON udp.diet_plan_id = dp.id
            WHERE udp.user_id = ? AND udp.is_active = 1
            LIMIT 1
          `;
          const [dietResults] = await promisePool.execute(dietQuery, [userId]);
          
          if (dietResults.length > 0) {
            const activeDiet = dietResults[0];
            const currentEndDate = new Date(activeDiet.end_date);
            const requestedEndDate = new Date(endDateStr);
            const currentStartDate = new Date(activeDiet.start_date);
            const requestedStartDate = new Date(startDateStr);
            
            // Check if we need to extend the diet plan range
            let needsExtension = false;
            let newStartDate = activeDiet.start_date;
            let newEndDate = activeDiet.end_date;
            
            if (requestedStartDate < currentStartDate) {
              newStartDate = startDateStr;
              needsExtension = true;
              console.log('Extending diet plan start date to:', newStartDate);
            }
            
            if (requestedEndDate > currentEndDate) {
              newEndDate = endDateStr;
              needsExtension = true;
              console.log('Extending diet plan end date to:', newEndDate);
            }
            
            if (needsExtension) {
              // Update diet plan dates
              const updateDietQuery = 'UPDATE user_diet_plans SET start_date = ?, end_date = ? WHERE id = ?';
              await promisePool.execute(updateDietQuery, [newStartDate, newEndDate, activeDiet.id]);
              
              // Generate meal plans for the extended period
              const mealPlansData = generateMealPlansForDiet(activeDiet.type, activeDiet.daily_calories);
              
              const extendedStartDate = new Date(newStartDate);
              const extendedEndDate = new Date(newEndDate);
              const currentDate = new Date(extendedStartDate);
              let planCount = 0;
              
              while (currentDate <= extendedEndDate) {
                const dateString = currentDate.toISOString().split('T')[0];
                
                // Check if meal plan already exists for this date
                const existsQuery = 'SELECT COUNT(*) as count FROM meal_plans WHERE user_id = ? AND date = ?';
                const [existsResults] = await promisePool.execute(existsQuery, [userId, dateString]);
                
                if (existsResults[0].count === 0) {
                  const dayIndex = (Math.floor((currentDate - extendedStartDate) / (1000 * 60 * 60 * 24))) % 7;
                  
                  for (const mealType of ['breakfast', 'lunch', 'dinner', 'snack']) {
                    const mealData = mealPlansData[mealType][dayIndex % mealPlansData[mealType].length];
                    
                    const insertQuery = `
                      INSERT INTO meal_plans (user_id, diet_plan_id, date, meal_type, planned_food_name, planned_calories, planned_protein, planned_carbs, planned_fat, instructions)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                    
                    await promisePool.execute(insertQuery, [
                      userId,
                      activeDiet.diet_plan_id,
                      dateString,
                      mealType,
                      mealData.name,
                      mealData.calories,
                      mealData.protein,
                      mealData.carbs,
                      mealData.fat,
                      mealData.instructions
                    ]);
                    
                    planCount++;
                  }
                }
                
                currentDate.setDate(currentDate.getDate() + 1);
              }
              
              console.log(`Extended diet plan and generated ${planCount} new meal plans`);
            }
          }
        } catch (extensionError) {
          console.error('Error extending diet plan:', extensionError);
          // Continue with normal query even if extension fails
        }
      }
      
      query += ' AND mp.date BETWEEN ? AND ?';
      params.push(startDateStr);
      params.push(endDateStr);
    }
    
    query += ' ORDER BY mp.date ASC, FIELD(mp.meal_type, "breakfast", "lunch", "dinner", "snack")';
    
    console.log('Final query:', query);
    console.log('Query params:', params);
    
    const [results] = await promisePool.execute(query, params);
    
    console.log(`Meal plans query returned ${results.length} results for user ${userId}`);
    if (results.length > 0) {
      console.log('Date range in results:', {
        first: results[0].date,
        last: results[results.length - 1].date
      });
      
      // Group by date for debugging
      const byDate = results.reduce((acc, plan) => {
        // Handle both string and Date object formats
        const date = plan.date instanceof Date 
          ? plan.date.toISOString().split('T')[0] 
          : (typeof plan.date === 'string' ? plan.date.split('T')[0] : plan.date);
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});
      console.log('Meal plans by date:', byDate);
    }
    
    res.json(results);
  } catch (error) {
    console.error('Get meal plans error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Generate meal plans for active diet
app.post('/api/meal-plans/generate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get active diet plan
    const dietQuery = `
      SELECT udp.*, dp.type, dp.daily_calories, dp.name
      FROM user_diet_plans udp
      JOIN diet_plans dp ON udp.diet_plan_id = dp.id
      WHERE udp.user_id = ? AND udp.is_active = 1
      LIMIT 1
    `;
    const [dietResults] = await promisePool.execute(dietQuery, [userId]);
    
    if (dietResults.length === 0) {
      return res.status(400).json({ error: 'No active diet plan found' });
    }
    
    const activeDiet = dietResults[0];
    const startDate = new Date(activeDiet.start_date);
    const endDate = new Date(activeDiet.end_date);
    
    // Clear existing meal plans for this diet period
    const clearQuery = 'DELETE FROM meal_plans WHERE user_id = ? AND date BETWEEN ? AND ?';
    await promisePool.execute(clearQuery, [
      userId, 
      startDate.toISOString().split('T')[0], 
      endDate.toISOString().split('T')[0]
    ]);
    
    // Generate meal plans based on diet type
    const mealPlansData = generateMealPlansForDiet(activeDiet.type, activeDiet.daily_calories);
    
    const currentDate = new Date(startDate);
    let planCount = 0;
    
    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split('T')[0];
      const dayIndex = (Math.floor((currentDate - startDate) / (1000 * 60 * 60 * 24))) % 7;
      
      for (const mealType of ['breakfast', 'lunch', 'dinner', 'snack']) {
        const mealData = mealPlansData[mealType][dayIndex % mealPlansData[mealType].length];
        
        const insertQuery = `
          INSERT INTO meal_plans (user_id, diet_plan_id, date, meal_type, planned_food_name, planned_calories, planned_protein, planned_carbs, planned_fat, instructions)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        await promisePool.execute(insertQuery, [
          userId,
          activeDiet.diet_plan_id,
          dateString,
          mealType,
          mealData.name,
          mealData.calories,
          mealData.protein,
          mealData.carbs,
          mealData.fat,
          mealData.instructions
        ]);
        
        planCount++;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    res.json({
      message: 'Meal plans generated successfully!',
      totalPlans: planCount,
      dietPlan: activeDiet.name,
      period: `${startDate.toISOString().split('T')[0]} - ${endDate.toISOString().split('T')[0]}`
    });
    
  } catch (error) {
    console.error('Generate meal plans error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Mark meal as completed
app.put('/api/meal-plans/:id/complete', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { actualCalories, actualProtein, actualCarbs, actualFat, notes } = req.body;
    const userId = req.user.userId;
    
    // Get meal plan details first
    const getMealPlanQuery = 'SELECT * FROM meal_plans WHERE id = ? AND user_id = ?';
    const [mealPlanResults] = await promisePool.execute(getMealPlanQuery, [id, userId]);
    
    if (mealPlanResults.length === 0) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }
    
    const mealPlan = mealPlanResults[0];
    
    // Update meal plan as completed
    const updateQuery = `
      UPDATE meal_plans 
      SET is_completed = TRUE, 
          actual_calories = ?, 
          actual_protein = ?, 
          actual_carbs = ?, 
          actual_fat = ?, 
          notes = ?,
          updated_at = NOW()
      WHERE id = ? AND user_id = ?
    `;
    
    await promisePool.execute(updateQuery, [
      actualCalories || mealPlan.planned_calories,
      actualProtein || mealPlan.planned_protein, 
      actualCarbs || mealPlan.planned_carbs,
      actualFat || mealPlan.planned_fat,
      notes || `${mealPlan.planned_food_name} (Diyet Planından)`,
      id,
      userId
    ]);
    
    // Add entry to meals table for calorie tracking
    const addMealQuery = `
      INSERT INTO meals (
        user_id, name, calories, protein, carbs, fat, 
        meal_type, date, notes, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'meal_plan')
    `;
    
    // Handle date format properly
    const mealDate = mealPlan.date instanceof Date 
      ? mealPlan.date.toISOString().split('T')[0]
      : (typeof mealPlan.date === 'string' ? mealPlan.date.split('T')[0] : mealPlan.date);
    
    await promisePool.execute(addMealQuery, [
      userId,
      mealPlan.planned_food_name,
      actualCalories || mealPlan.planned_calories,
      actualProtein || mealPlan.planned_protein,
      actualCarbs || mealPlan.planned_carbs,
      actualFat || mealPlan.planned_fat,
      mealPlan.meal_type,
      mealDate,
      notes || `${mealPlan.planned_food_name} (Diyet Planından Tamamlandı)`
    ]);
    
    // Check for achievements after meal completion
    
    res.json({ 
      message: 'Meal marked as completed and added to daily tracking!',
      calories: actualCalories || mealPlan.planned_calories
    });
  } catch (error) {
    console.error('Complete meal error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Helper function to generate meal plans based on diet type
function generateMealPlansForDiet(dietType, dailyCalories) {
  const calorieDistribution = {
    breakfast: 0.25,
    lunch: 0.35, 
    dinner: 0.30,
    snack: 0.10
  };
  
  const mealPlans = {
    ketogenic: {
      breakfast: [
        { name: 'Avokadolu Omlet', calories: Math.round(dailyCalories * 0.25), protein: 18, carbs: 6, fat: 38, instructions: 'Yumurtaları tereyağında pişirin, dilimlediğiniz avokado ile servis edin.' },
        { name: 'Ketojenik Smoothie', calories: Math.round(dailyCalories * 0.25), protein: 15, carbs: 8, fat: 35, instructions: 'Hindistan cevizi sütü, avokado, protein tozu ile karıştırın.' },
        { name: 'Peynirli Scrambled Eggs', calories: Math.round(dailyCalories * 0.25), protein: 20, carbs: 4, fat: 32, instructions: 'Yumurtaları kaşar peyniri ile pişirin.' },
        { name: 'Keto Pancake', calories: Math.round(dailyCalories * 0.25), protein: 16, carbs: 5, fat: 28, instructions: 'Badem unu ile keto pancake yapın.' },
        { name: 'Sosis ve Yumurta', calories: Math.round(dailyCalories * 0.25), protein: 22, carbs: 3, fat: 35, instructions: 'Sosis ile yumurta pişirin.' },
        { name: 'Keto Coffee', calories: Math.round(dailyCalories * 0.25), protein: 12, carbs: 4, fat: 30, instructions: 'Kahveye tereyağı ve MCT yağı ekleyin.' },
        { name: 'Chia Pudding Keto', calories: Math.round(dailyCalories * 0.25), protein: 14, carbs: 6, fat: 32, instructions: 'Chia tohumunu hindistan cevizi sütü ile karıştırın.' }
      ],
      lunch: [
        { name: 'Izgara Somon Salatası', calories: Math.round(dailyCalories * 0.35), protein: 32, carbs: 8, fat: 26, instructions: 'Somonu ızgarada pişirin, yeşil salatalar üzerine yerleştirin.' },
        { name: 'Ton Balığı Salatası', calories: Math.round(dailyCalories * 0.35), protein: 28, carbs: 6, fat: 24, instructions: 'Ton balığını mayonez ile karıştırın, salatalık ekleyin.' },
        { name: 'Tavuk Caesar Salad', calories: Math.round(dailyCalories * 0.35), protein: 30, carbs: 7, fat: 28, instructions: 'Izgara tavuk ile caesar salatası hazırlayın.' },
        { name: 'Keto Burger Bowl', calories: Math.round(dailyCalories * 0.35), protein: 35, carbs: 8, fat: 30, instructions: 'Köfte ile salata kasesi hazırlayın.' },
        { name: 'Avokado Tuna Bowl', calories: Math.round(dailyCalories * 0.35), protein: 26, carbs: 9, fat: 32, instructions: 'Avokado ile ton balığı karıştırın.' },
        { name: 'Keto Wrap', calories: Math.round(dailyCalories * 0.35), protein: 24, carbs: 6, fat: 28, instructions: 'Marul yaprağı ile wrap yapın.' },
        { name: 'Peynirli Sebze Gratin', calories: Math.round(dailyCalories * 0.35), protein: 22, carbs: 10, fat: 26, instructions: 'Sebzeleri peynir ile fırınlayın.' }
      ],
      dinner: [
        { name: 'Kremalı Mantarlı Tavuk', calories: Math.round(dailyCalories * 0.30), protein: 35, carbs: 5, fat: 33, instructions: 'Tavuğu pişirin, mantar ve krema ile sosunu hazırlayın.' },
        { name: 'Kuzu Pirzola', calories: Math.round(dailyCalories * 0.30), protein: 40, carbs: 2, fat: 34, instructions: 'Kuzu pirzolaları biberiye ile marine edin ve ızgarada pişirin.' },
        { name: 'Izgara Levrek', calories: Math.round(dailyCalories * 0.30), protein: 38, carbs: 4, fat: 28, instructions: 'Levreği ızgarada pişirin, zeytinyağı ile servis edin.' },
        { name: 'Keto Meatballs', calories: Math.round(dailyCalories * 0.30), protein: 32, carbs: 6, fat: 30, instructions: 'Köfte yapın, kremalı sos ile servis edin.' },
        { name: 'Fırında Somon', calories: Math.round(dailyCalories * 0.30), protein: 36, carbs: 3, fat: 32, instructions: 'Somonu fırında pişirin, tereyağı ile servis edin.' },
        { name: 'Izgara Dana Eti', calories: Math.round(dailyCalories * 0.30), protein: 42, carbs: 2, fat: 28, instructions: 'Dana etini ızgarada pişirin.' },
        { name: 'Keto Casserole', calories: Math.round(dailyCalories * 0.30), protein: 28, carbs: 8, fat: 35, instructions: 'Sebze ve et ile güveç yapın.' }
      ],
      snack: [
        { name: 'Ceviz ve Peynir', calories: Math.round(dailyCalories * 0.10), protein: 12, carbs: 3, fat: 25, instructions: 'Basit atıştırmalık olarak tüketin.' },
        { name: 'Avokado Dilimleri', calories: Math.round(dailyCalories * 0.10), protein: 8, carbs: 4, fat: 22, instructions: 'Avokadoyu dilimleyin, tuz ile servis edin.' },
        { name: 'Keto Fat Bomb', calories: Math.round(dailyCalories * 0.10), protein: 6, carbs: 2, fat: 28, instructions: 'Hindistan cevizi yağı ile fat bomb yapın.' },
        { name: 'Peynir Küpleri', calories: Math.round(dailyCalories * 0.10), protein: 14, carbs: 2, fat: 20, instructions: 'Kaşar peynirini küp küp kesin.' },
        { name: 'Badem Ezmesi', calories: Math.round(dailyCalories * 0.10), protein: 10, carbs: 3, fat: 24, instructions: 'Badem ezmesini kaşık ile tüketin.' },
        { name: 'Keto Smoothie', calories: Math.round(dailyCalories * 0.10), protein: 12, carbs: 4, fat: 26, instructions: 'Avokado ve protein tozu ile smoothie yapın.' },
        { name: 'Zeytin ve Feta', calories: Math.round(dailyCalories * 0.10), protein: 8, carbs: 3, fat: 18, instructions: 'Zeytin ile feta peyniri tüketin.' }
      ]
    },
    
    mediterranean: {
      breakfast: [
        { name: 'Yunan Yoğurdu ve Fındık', calories: Math.round(dailyCalories * 0.25), protein: 20, carbs: 25, fat: 16, instructions: 'Yoğurdun üzerine fındık ve bal ekleyin.' },
        { name: 'Zeytinyağlı Omlet', calories: Math.round(dailyCalories * 0.25), protein: 18, carbs: 8, fat: 22, instructions: 'Yumurtaları zeytinyağında pişirin.' },
        { name: 'Tam Buğday Ekmeği ve Peynir', calories: Math.round(dailyCalories * 0.25), protein: 16, carbs: 35, fat: 12, instructions: 'Tam buğday ekmeği ile beyaz peynir tüketin.' }
      ],
      lunch: [
        { name: 'Akdeniz Salatası', calories: Math.round(dailyCalories * 0.35), protein: 12, carbs: 35, fat: 22, instructions: 'Domates, salatalık, zeytin, beyaz peynir, zeytinyağı ile karıştırın.' },
        { name: 'Balık Izgara', calories: Math.round(dailyCalories * 0.35), protein: 35, carbs: 15, fat: 20, instructions: 'Balığı ızgarada pişirin, limon ile servis edin.' },
        { name: 'Mercimek Salatası', calories: Math.round(dailyCalories * 0.35), protein: 18, carbs: 45, fat: 15, instructions: 'Mercimeği haşlayın, sebzeler ile karıştırın.' }
      ],
      dinner: [
        { name: 'Fırında Levrek', calories: Math.round(dailyCalories * 0.30), protein: 35, carbs: 20, fat: 22, instructions: 'Levreği patates ile fırında pişirin.' },
        { name: 'Izgara Tavuk Akdeniz', calories: Math.round(dailyCalories * 0.30), protein: 40, carbs: 15, fat: 18, instructions: 'Tavuğu akdeniz baharatları ile marine edin.' },
        { name: 'Sebzeli Güveç', calories: Math.round(dailyCalories * 0.30), protein: 15, carbs: 45, fat: 20, instructions: 'Sebzeleri zeytinyağı ile güveç yapın.' }
      ],
      snack: [
        { name: 'Zeytin ve Peynir', calories: Math.round(dailyCalories * 0.10), protein: 8, carbs: 5, fat: 15, instructions: 'Basit Akdeniz atıştırmalığı.' },
        { name: 'Fındık ve Kuru Meyve', calories: Math.round(dailyCalories * 0.10), protein: 6, carbs: 18, fat: 12, instructions: 'Karışık fındık ve kuru meyve tüketin.' },
        { name: 'Hummus ve Sebze', calories: Math.round(dailyCalories * 0.10), protein: 8, carbs: 15, fat: 10, instructions: 'Hummus ile taze sebze tüketin.' }
      ]
    },
    
    // Default plan for other diet types
    default: {
      breakfast: [
        { name: 'Yulaf Ezmesi', calories: Math.round(dailyCalories * 0.25), protein: 12, carbs: 45, fat: 8, instructions: 'Yulaf ezmeyi süt ile pişirin, meyve ekleyin.' },
        { name: 'Protein Smoothie', calories: Math.round(dailyCalories * 0.25), protein: 20, carbs: 30, fat: 8, instructions: 'Protein tozu, muz ve süt ile karıştırın.' },
        { name: 'Omlet ve Tam Buğday Ekmeği', calories: Math.round(dailyCalories * 0.25), protein: 18, carbs: 32, fat: 12, instructions: 'Omlet yapın, tam buğday ekmeği ile servis edin.' }
      ],
      lunch: [
        { name: 'Izgara Tavuk Salatası', calories: Math.round(dailyCalories * 0.35), protein: 35, carbs: 20, fat: 15, instructions: 'Tavuğu ızgarada pişirin, salata ile servis edin.' },
        { name: 'Kinoa Salatası', calories: Math.round(dailyCalories * 0.35), protein: 18, carbs: 50, fat: 12, instructions: 'Kinoa ile sebze salatası hazırlayın.' },
        { name: 'Balık ve Pilav', calories: Math.round(dailyCalories * 0.35), protein: 30, carbs: 45, fat: 15, instructions: 'Balığı pişirin, pilav ile servis edin.' }
      ],
      dinner: [
        { name: 'Somon ve Sebzeler', calories: Math.round(dailyCalories * 0.30), protein: 28, carbs: 15, fat: 18, instructions: 'Somonu fırında pişirin, sebzeler ile servis edin.' },
        { name: 'Izgara Et ve Salata', calories: Math.round(dailyCalories * 0.30), protein: 35, carbs: 12, fat: 20, instructions: 'Eti ızgarada pişirin, salata ile servis edin.' },
        { name: 'Tavuk Güveç', calories: Math.round(dailyCalories * 0.30), protein: 32, carbs: 25, fat: 16, instructions: 'Tavuk ile sebze güveci yapın.' }
      ],
      snack: [
        { name: 'Yoğurt ve Meyve', calories: Math.round(dailyCalories * 0.10), protein: 8, carbs: 15, fat: 6, instructions: 'Yoğurt ile taze meyve tüketin.' },
        { name: 'Badem ve Elma', calories: Math.round(dailyCalories * 0.10), protein: 6, carbs: 12, fat: 10, instructions: 'Badem ile elma tüketin.' },
        { name: 'Protein Bar', calories: Math.round(dailyCalories * 0.10), protein: 12, carbs: 8, fat: 8, instructions: 'Ev yapımı protein bar tüketin.' }
      ]
    }
  };
  
  return mealPlans[dietType] || mealPlans.default;
}

// ===============================
// WATER TRACKING ROUTES
// ===============================

// Get today's water intake
app.get('/api/water/today', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 GET /api/water/today - User:', req.user.userId);
    const today = new Date().toISOString().split('T')[0];
    console.log('📅 Today date:', today);
    
    const query = `
      SELECT glasses_count, goal_glasses 
      FROM water_intake 
      WHERE user_id = ? AND date = ?
    `;
    const [results] = await promisePool.execute(query, [req.user.userId, today]);
    console.log('💧 Water intake query results:', results);
    
    if (results.length === 0) {
      console.log('❌ No water record found for today, returning defaults');
      // No record for today, return default
      res.json({ glasses_count: 0, goal_glasses: 8 });
    } else {
      console.log('✅ Water record found:', results[0]);
      res.json(results[0]);
    }
  } catch (error) {
    console.error('❌ Get water intake error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update water intake
app.post('/api/water/intake', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 POST /api/water/intake - User:', req.user.userId);
    const { glasses_count } = req.body;
    console.log('💧 Glasses count to update:', glasses_count);
    const today = new Date().toISOString().split('T')[0];
    console.log('📅 Today date:', today);
    
    const query = `
      INSERT INTO water_intake (user_id, date, glasses_count) 
      VALUES (?, ?, ?) 
      ON DUPLICATE KEY UPDATE 
      glasses_count = VALUES(glasses_count),
      updated_at = CURRENT_TIMESTAMP
    `;
    
    await promisePool.execute(query, [req.user.userId, today, glasses_count]);
    console.log('✅ Water intake updated successfully');
    
    res.json({ 
      message: 'Water intake updated successfully',
      glasses_count,
      date: today
    });
  } catch (error) {
    console.error('❌ Update water intake error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get water settings
app.get('/api/water/settings', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 GET /api/water/settings - User:', req.user.userId);
    const query = `
      SELECT notifications_enabled, reminder_hours, daily_goal 
      FROM water_settings 
      WHERE user_id = ?
    `;
    const [results] = await promisePool.execute(query, [req.user.userId]);
    console.log('⚙️ Water settings query results:', results);
    
    if (results.length === 0) {
      console.log('❌ No water settings found, returning defaults');
      // No settings yet, return defaults
      res.json({ 
        notifications_enabled: true, 
        reminder_hours: [9, 12, 15, 18, 21], 
        daily_goal: 8 
      });
    } else {
      const settings = results[0];
      console.log('🔧 Raw settings from DB:', settings);
      
      // Parse reminder_hours if it's a JSON string
      let reminderHours = settings.reminder_hours;
      if (typeof reminderHours === 'string') {
        try {
          reminderHours = JSON.parse(reminderHours);
        } catch (e) {
          console.log('⚠️ Failed to parse reminder_hours JSON, using default');
          reminderHours = [9, 12, 15, 18, 21];
        }
      }
      
      const responseData = {
        notifications_enabled: Boolean(settings.notifications_enabled),
        reminder_hours: reminderHours || [9, 12, 15, 18, 21],
        daily_goal: settings.daily_goal || 8
      };
      
      console.log('✅ Water settings response:', responseData);
      res.json(responseData);
    }
  } catch (error) {
    console.error('❌ Get water settings error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update water settings
app.post('/api/water/settings', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 POST /api/water/settings - User:', req.user.userId);
    const { notifications_enabled, reminder_hours, daily_goal } = req.body;
    console.log('⚙️ Settings to update:', { notifications_enabled, reminder_hours, daily_goal });
    
    const query = `
      INSERT INTO water_settings (user_id, notifications_enabled, reminder_hours, daily_goal) 
      VALUES (?, ?, ?, ?) 
      ON DUPLICATE KEY UPDATE 
      notifications_enabled = VALUES(notifications_enabled),
      reminder_hours = VALUES(reminder_hours),
      daily_goal = VALUES(daily_goal),
      updated_at = CURRENT_TIMESTAMP
    `;
    
    await promisePool.execute(query, [
      req.user.userId, 
      notifications_enabled, 
      JSON.stringify(reminder_hours), 
      daily_goal
    ]);
    
    console.log('✅ Water settings updated successfully');
    
    res.json({ 
      message: 'Water settings updated successfully',
      notifications_enabled,
      reminder_hours,
      daily_goal
    });
  } catch (error) {
    console.error('❌ Update water settings error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get water intake history
app.get('/api/water/history', authenticateToken, async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const query = `
      SELECT date, glasses_count, goal_glasses 
      FROM water_intake 
      WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      ORDER BY date DESC
    `;
    const [results] = await promisePool.execute(query, [req.user.userId, days]);
    
    res.json(results);
  } catch (error) {
    console.error('Get water history error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ===============================
// NOTIFICATION ROUTES
// ===============================

// Register push token
app.post('/api/notifications/register-token', authenticateToken, async (req, res) => {
  try {
    console.log('🔔 POST /api/notifications/register-token - User:', req.user.userId);
    const { token, device_type = 'ios' } = req.body;
    console.log('📱 Push token to register:', { token: token ? token.substring(0, 20) + '...' : 'null', device_type });
    
    if (!token) {
      return res.status(400).json({ error: 'Push token is required' });
    }
    
    const query = `
      INSERT INTO push_tokens (user_id, token, device_type) 
      VALUES (?, ?, ?) 
      ON DUPLICATE KEY UPDATE 
      is_active = TRUE,
      updated_at = CURRENT_TIMESTAMP
    `;
    
    const [result] = await promisePool.execute(query, [req.user.userId, token, device_type]);
    console.log('✅ Push token registered successfully, result:', result);
    
    // Log success to database
    const logQuery = `
      INSERT INTO notification_logs (user_id, notification_type, title, body, status) 
      VALUES (?, 'general', 'Push Token Registered', ?, 'sent')
    `;
    await promisePool.execute(logQuery, [req.user.userId, `Token registered: ${token.substring(0, 20)}...`]);
    
    res.json({ 
      message: 'Push token registered successfully',
      token_preview: token.substring(0, 20) + '...',
      user_id: req.user.userId,
      device_type
    });
  } catch (error) {
    console.error('❌ Register push token error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get user's push tokens (debug endpoint)
app.get('/api/notifications/tokens', authenticateToken, async (req, res) => {
  try {
    console.log('🔍 GET /api/notifications/tokens - User:', req.user.userId);
    const query = `
      SELECT id, token, device_type, is_active, created_at, updated_at
      FROM push_tokens 
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `;
    const [results] = await promisePool.execute(query, [req.user.userId]);
    
    // Mask tokens for security
    const maskedResults = results.map(token => ({
      ...token,
      token: token.token.substring(0, 20) + '...' + token.token.substring(token.token.length - 10)
    }));
    
    console.log('📱 Found', results.length, 'push tokens for user');
    res.json(maskedResults);
  } catch (error) {
    console.error('❌ Get push tokens error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get notification settings
app.get('/api/notifications/settings', authenticateToken, async (req, res) => {
  try {
    console.log('🔔 GET /api/notifications/settings - User:', req.user.userId);
    const query = `
      SELECT * FROM notification_settings 
      WHERE user_id = ?
    `;
    const [results] = await promisePool.execute(query, [req.user.userId]);
    
    if (results.length === 0) {
      console.log('❌ No notification settings found, returning defaults');
      // No settings yet, return defaults
      res.json({ 
        water_reminders: true,
        meal_reminders: true,
        challenge_notifications: true,
        achievement_notifications: true,
        general_notifications: true,
        quiet_hours_start: '22:00:00',
        quiet_hours_end: '07:00:00'
      });
    } else {
      console.log('✅ Notification settings found:', results[0]);
      res.json(results[0]);
    }
  } catch (error) {
    console.error('❌ Get notification settings error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Update notification settings
app.post('/api/notifications/settings', authenticateToken, async (req, res) => {
  try {
    console.log('🔔 POST /api/notifications/settings - User:', req.user.userId);
    const { 
      water_reminders, 
      meal_reminders, 
      challenge_notifications, 
      achievement_notifications, 
      general_notifications,
      quiet_hours_start,
      quiet_hours_end
    } = req.body;
    
    console.log('⚙️ Notification settings to update:', req.body);
    
    // First, get existing settings
    const getQuery = 'SELECT * FROM notification_settings WHERE user_id = ?';
    const [existing] = await promisePool.execute(getQuery, [req.user.userId]);
    
    let finalSettings;
    if (existing.length === 0) {
      // No existing settings, create with defaults and provided values
      finalSettings = {
        water_reminders: (water_reminders !== null && water_reminders !== undefined) ? water_reminders : true,
        meal_reminders: (meal_reminders !== null && meal_reminders !== undefined) ? meal_reminders : true,
        challenge_notifications: (challenge_notifications !== null && challenge_notifications !== undefined) ? challenge_notifications : true,
        achievement_notifications: (achievement_notifications !== null && achievement_notifications !== undefined) ? achievement_notifications : true,
        general_notifications: (general_notifications !== null && general_notifications !== undefined) ? general_notifications : true,
        quiet_hours_start: (quiet_hours_start !== null && quiet_hours_start !== undefined) ? quiet_hours_start : '22:00:00',
        quiet_hours_end: (quiet_hours_end !== null && quiet_hours_end !== undefined) ? quiet_hours_end : '07:00:00'
      };
    } else {
      // Update existing settings with only provided values
      const current = existing[0];
      finalSettings = {
        water_reminders: (water_reminders !== null && water_reminders !== undefined) ? water_reminders : current.water_reminders,
        meal_reminders: (meal_reminders !== null && meal_reminders !== undefined) ? meal_reminders : current.meal_reminders,
        challenge_notifications: (challenge_notifications !== null && challenge_notifications !== undefined) ? challenge_notifications : current.challenge_notifications,
        achievement_notifications: (achievement_notifications !== null && achievement_notifications !== undefined) ? achievement_notifications : current.achievement_notifications,
        general_notifications: (general_notifications !== null && general_notifications !== undefined) ? general_notifications : current.general_notifications,
        quiet_hours_start: (quiet_hours_start !== null && quiet_hours_start !== undefined) ? quiet_hours_start : current.quiet_hours_start,
        quiet_hours_end: (quiet_hours_end !== null && quiet_hours_end !== undefined) ? quiet_hours_end : current.quiet_hours_end
      };
    }
    
    console.log('🔧 Final settings to save:', finalSettings);
    
    const query = `
      INSERT INTO notification_settings (
        user_id, water_reminders, meal_reminders, challenge_notifications, 
        achievement_notifications, general_notifications, quiet_hours_start, quiet_hours_end
      ) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?) 
      ON DUPLICATE KEY UPDATE 
      water_reminders = VALUES(water_reminders),
      meal_reminders = VALUES(meal_reminders),
      challenge_notifications = VALUES(challenge_notifications),
      achievement_notifications = VALUES(achievement_notifications),
      general_notifications = VALUES(general_notifications),
      quiet_hours_start = VALUES(quiet_hours_start),
      quiet_hours_end = VALUES(quiet_hours_end),
      updated_at = CURRENT_TIMESTAMP
    `;
    
    await promisePool.execute(query, [
      req.user.userId, 
      finalSettings.water_reminders, 
      finalSettings.meal_reminders, 
      finalSettings.challenge_notifications, 
      finalSettings.achievement_notifications, 
      finalSettings.general_notifications,
      finalSettings.quiet_hours_start,
      finalSettings.quiet_hours_end
    ]);
    
    console.log('✅ Notification settings updated successfully');
    
    res.json({ 
      message: 'Notification settings updated successfully',
      settings: finalSettings
    });
  } catch (error) {
    console.error('❌ Update notification settings error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Send notification (for testing)
app.post('/api/notifications/send-test', authenticateToken, async (req, res) => {
  try {
    console.log('🧪 POST /api/notifications/send-test - User:', req.user.userId);
    const { title = '🔔 Caloria - Test Bildirimi', body = '💧 Test hatırlatması! Su içme zamanı geldi! 🌊' } = req.body;
    
    // Log the notification (in real app, this would send via Expo push service)
    const logQuery = `
      INSERT INTO notification_logs (user_id, notification_type, title, body, status) 
      VALUES (?, 'general', ?, ?, 'sent')
    `;
    
    await promisePool.execute(logQuery, [req.user.userId, title, body]);
    console.log('✅ Test notification logged successfully');
    
    res.json({ 
      message: 'Test notification sent successfully',
      title,
      body,
      logged_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Send test notification error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get notification history
app.get('/api/notifications/history', authenticateToken, async (req, res) => {
  try {
    console.log('🔔 GET /api/notifications/history - User:', req.user.userId);
    const { limit = 50 } = req.query;
    
    const query = `
      SELECT id, notification_type, title, body, status, sent_at, created_at
      FROM notification_logs 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `;
    const [results] = await promisePool.execute(query, [req.user.userId, parseInt(limit)]);
    
    console.log('📜 Found', results.length, 'notifications');
    res.json(results);
  } catch (error) {
    console.error('❌ Get notification history error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Deactivate push token (logout)
app.post('/api/notifications/deactivate-token', authenticateToken, async (req, res) => {
  try {
    console.log('🔔 POST /api/notifications/deactivate-token - User:', req.user.userId);
    const { token } = req.body;
    
    const query = `
      UPDATE push_tokens 
      SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND token = ?
    `;
    
    await promisePool.execute(query, [req.user.userId, token]);
    console.log('✅ Push token deactivated successfully');
    
    res.json({ 
      message: 'Push token deactivated successfully'
    });
  } catch (error) {
    console.error('❌ Deactivate push token error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ===============================
// XP REWARDS & LEADERBOARD SYSTEM
// ===============================

// Get leaderboard
app.get('/api/leaderboard', authenticateToken, async (req, res) => {
  try {
    const { period = 'all_time', limit = 50 } = req.query;
    
    let query = `
      SELECT up.user_id, u.username, u.full_name, u.avatar,
             up.total_xp, up.level
      FROM user_profiles up
      JOIN users u ON up.user_id = u.id
      WHERE u.is_active = TRUE
    `;
    
    if (period === 'weekly') {
      query += ` AND up.updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`;
    } else if (period === 'monthly') {
      query += ` AND up.updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`;
    }
    
    query += ` ORDER BY up.total_xp DESC LIMIT ?`;
    
    const [results] = await promisePool.execute(query, [parseInt(limit)]);
    
    // Add rank manually
    const leaderboardWithRank = results.map((user, index) => ({
      ...user,
      rank: index + 1
    }));
    
    // Get current user's rank
    const userRankQuery = `
      SELECT COUNT(*) + 1 as rank FROM user_profiles up
      JOIN users u ON up.user_id = u.id
      WHERE u.is_active = TRUE AND up.total_xp > (
        SELECT total_xp FROM user_profiles WHERE user_id = ?
      )
    `;
    const [userRank] = await promisePool.execute(userRankQuery, [req.user.userId]);
    
    res.json({
      leaderboard: leaderboardWithRank,
      userRank: (userRank[0] && userRank[0].rank) || null,
      period: period
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get rewards shop
app.get('/api/rewards-shop', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get available rewards
    const rewardsQuery = `
      SELECT r.*, 
             CASE WHEN ur.user_id IS NOT NULL THEN TRUE ELSE FALSE END as is_purchased
      FROM rewards r
      LEFT JOIN user_rewards ur ON r.id = ur.reward_id AND ur.user_id = ?
      WHERE r.is_active = TRUE
      ORDER BY r.category, r.xp_cost
    `;
    const [rewards] = await promisePool.execute(rewardsQuery, [userId]);
    
    // Parse JSON fields for rewards
    const parsedRewards = rewards.map(reward => {
      const parsedName = parseJsonField(reward.name);
      const parsedDesc = parseJsonField(reward.description);
      
      // Ensure we return proper objects, not strings
      return {
        ...reward,
        name: parsedName,
        description: parsedDesc
      };
    });
    
    // Get user's current XP
    const userXpQuery = 'SELECT total_xp FROM user_profiles WHERE user_id = ?';
    const [userXp] = await promisePool.execute(userXpQuery, [userId]);
    
    res.json({
      rewards: parsedRewards,
      userXP: (userXp[0] && userXp[0].total_xp) || 0,
      categories: ['avatar', 'theme', 'badge', 'feature', 'discount']
    });
  } catch (error) {
    console.error('Get rewards shop error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Purchase reward
app.post('/api/rewards/:id/purchase', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // Get reward details
    const rewardQuery = 'SELECT * FROM rewards WHERE id = ? AND is_active = TRUE';
    const [rewardResults] = await promisePool.execute(rewardQuery, [id]);
    
    if (rewardResults.length === 0) {
      return res.status(404).json({ error: 'Reward not found' });
    }
    
    const reward = rewardResults[0];
    
    // Check if already purchased
    const purchaseCheckQuery = 'SELECT * FROM user_rewards WHERE user_id = ? AND reward_id = ?';
    const [existingPurchase] = await promisePool.execute(purchaseCheckQuery, [userId, id]);
    
    if (existingPurchase.length > 0) {
      return res.status(400).json({ error: 'Reward already purchased' });
    }
    
    // Check if user has enough XP
    const userXpQuery = 'SELECT total_xp FROM user_profiles WHERE user_id = ?';
    const [userXpResults] = await promisePool.execute(userXpQuery, [userId]);
    
    if (userXpResults.length === 0 || userXpResults[0].total_xp < reward.xp_cost) {
      return res.status(400).json({ error: 'Insufficient XP' });
    }
    
    // Process purchase with manual transaction
    const connection = await promisePool.getConnection();
    
    try {
      await connection.query('START TRANSACTION');
      
      // Deduct XP
      const deductXpQuery = 'UPDATE user_profiles SET total_xp = total_xp - ? WHERE user_id = ?';
      await connection.execute(deductXpQuery, [reward.xp_cost, userId]);
      
      // Add to user rewards
      const addRewardQuery = 'INSERT INTO user_rewards (user_id, reward_id, purchased_at) VALUES (?, ?, NOW())';
      await connection.execute(addRewardQuery, [userId, id]);
      
      // Log transaction
      const logQuery = 'INSERT INTO xp_transactions (user_id, amount, source, source_id, description) VALUES (?, ?, ?, ?, ?)';
      await connection.execute(logQuery, [
        userId, -reward.xp_cost, 'reward_purchase', id, `Purchased: ${reward.name}`
      ]);
      
      await connection.query('COMMIT');
      
      res.json({
        message: 'Reward purchased successfully!',
        reward: reward,
        xpSpent: reward.xp_cost
      });
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Purchase reward error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Daily bonus XP
app.post('/api/user/daily-bonus', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const today = new Date().toISOString().split('T')[0];
    
    // Check if already claimed today
    const checkQuery = `
      SELECT * FROM xp_transactions 
      WHERE user_id = ? AND source = 'daily_bonus' AND DATE(created_at) = ?
    `;
    const [existing] = await promisePool.execute(checkQuery, [userId, today]);
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Daily bonus already claimed today' });
    }
    
    // Calculate bonus based on streak
    const streakQuery = `
      SELECT COUNT(DISTINCT DATE(created_at)) as streak
      FROM xp_transactions 
      WHERE user_id = ? AND source = 'daily_bonus' 
      AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `;
    const [streakResult] = await promisePool.execute(streakQuery, [userId]);
    const streak = (streakResult[0] && streakResult[0].streak) || 0;
    
    const bonusXP = Math.min(10 + (streak * 2), 50); // 10-50 XP based on streak
    
    // Award bonus
    const updateXpQuery = 'UPDATE user_profiles SET total_xp = total_xp + ? WHERE user_id = ?';
    await promisePool.execute(updateXpQuery, [bonusXP, userId]);
    
    // Log transaction
    const logQuery = 'INSERT INTO xp_transactions (user_id, amount, source, description) VALUES (?, ?, ?, ?)';
    await promisePool.execute(logQuery, [
      userId, bonusXP, 'daily_bonus', `Daily bonus: ${bonusXP} XP (${streak + 1} day streak)`
    ]);
    
    res.json({
      message: 'Daily bonus claimed!',
      xpAwarded: bonusXP,
      streak: streak + 1
    });
  } catch (error) {
    console.error('Daily bonus error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get user's purchased rewards
// Get user rewards
app.get('/api/user/rewards', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const query = `
      SELECT ur.*, r.name, r.description, r.icon, r.category, r.reward_data
      FROM user_rewards ur
      JOIN rewards r ON ur.reward_id = r.id
      WHERE ur.user_id = ? AND ur.is_active = TRUE
      ORDER BY ur.purchased_at DESC
    `;
    
    const [results] = await promisePool.execute(query, [userId]);
    
    // Parse JSON fields for user rewards
    const parsedResults = results.map(reward => {
      const parsedName = parseJsonField(reward.name);
      const parsedDesc = parseJsonField(reward.description);
      
      return {
        ...reward,
        name: parsedName,
        description: parsedDesc
      };
    });
    
    res.json(parsedResults);
  } catch (error) {
    console.error('Get user rewards error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get user's active theme
app.get('/api/user/active-theme', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const query = `
      SELECT ur.*, r.name, r.description, r.icon, r.reward_data
      FROM user_rewards ur
      JOIN rewards r ON ur.reward_id = r.id
      WHERE ur.user_id = ? AND r.category = 'theme' AND ur.is_active = TRUE
      ORDER BY ur.activated_at DESC, ur.purchased_at DESC
      LIMIT 1
    `;
    
    const [results] = await promisePool.execute(query, [userId]);
    
    if (results.length > 0) {
      // Parse JSON fields
      const parsedResult = {
        ...results[0],
        name: parseJsonField(results[0].name),
        description: parseJsonField(results[0].description)
      };
      
      let rewardData = parsedResult.reward_data;
      
      // Parse JSON if it's a string
      if (typeof rewardData === 'string') {
        try {
          rewardData = JSON.parse(rewardData);
        } catch (e) {
          console.error('Failed to parse reward_data for theme:', e);
          rewardData = {};
        }
      }
      
      res.json({
        ...parsedResult,
        reward_data: rewardData
      });
    } else {
      // Return default theme
      res.json({
        name: 'Default Theme',
        reward_data: {
          primaryColor: '#667eea',
          secondaryColor: '#764ba2',
          accentColor: '#6B73FF'
        }
      });
    }
  } catch (error) {
    console.error('Get active theme error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get user's active features
app.get('/api/user/active-features', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const query = `
      SELECT ur.*, r.name, r.description, r.icon, r.reward_data
      FROM user_rewards ur
      JOIN rewards r ON ur.reward_id = r.id
      WHERE ur.user_id = ? AND r.category = 'feature' AND ur.is_active = TRUE
      ORDER BY ur.activated_at DESC, ur.purchased_at DESC
    `;
    
    const [results] = await promisePool.execute(query, [userId]);
    
    // Parse reward_data for each feature
    const processedResults = results.map(feature => {
      let rewardData = feature.reward_data;
      
      // Parse JSON if it's a string
      if (typeof rewardData === 'string') {
        try {
          rewardData = JSON.parse(rewardData);
        } catch (e) {
          console.error('Failed to parse reward_data for feature:', e);
          rewardData = {};
        }
      }
      
      return {
        ...feature,
        reward_data: rewardData
      };
    });
    
    res.json(processedResults);
  } catch (error) {
    console.error('Get active features error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Activate a purchased reward
app.post('/api/user/rewards/:id/activate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    
    // Check if user owns this reward
    const checkQuery = `
      SELECT ur.*, r.category 
      FROM user_rewards ur
      JOIN rewards r ON ur.reward_id = r.id
      WHERE ur.user_id = ? AND ur.reward_id = ? AND ur.is_active = TRUE
    `;
    const [checkResults] = await promisePool.execute(checkQuery, [userId, id]);
    
    if (checkResults.length === 0) {
      return res.status(404).json({ error: 'Reward not found or not owned' });
    }
    
    const reward = checkResults[0];
    
    // For themes, deactivate other active themes first
    if (reward.category === 'theme') {
      const deactivateQuery = `
        UPDATE user_rewards ur
        JOIN rewards r ON ur.reward_id = r.id
        SET ur.activated_at = NULL
        WHERE ur.user_id = ? AND r.category = 'theme'
      `;
      await promisePool.execute(deactivateQuery, [userId]);
    }
    
    // Activate the selected reward
    const activateQuery = `
      UPDATE user_rewards 
      SET activated_at = NOW() 
      WHERE user_id = ? AND reward_id = ?
    `;
    await promisePool.execute(activateQuery, [userId, id]);
    
    res.json({ message: 'Reward activated successfully!' });
  } catch (error) {
    console.error('Activate reward error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Deactivate all themes (switch to default theme)
app.post('/api/user/themes/deactivate-all', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Deactivate all theme rewards for the user
    const deactivateQuery = `
      UPDATE user_rewards ur
      JOIN rewards r ON ur.reward_id = r.id
      SET ur.activated_at = NULL
      WHERE ur.user_id = ? AND r.category = 'theme'
    `;
    await promisePool.execute(deactivateQuery, [userId]);
    
    res.json({ message: 'All themes deactivated successfully! Switched to default theme.' });
  } catch (error) {
    console.error('Deactivate all themes error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ===============================

// Nutrition Expert endpoints
app.get('/api/nutrition/daily-advice', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const today = new Date().toISOString().split('T')[0];
    
    // Get user profile and today's meals
    const [userRows] = await promisePool.execute(
      'SELECT * FROM user_profiles WHERE user_id = ?',
      [userId]
    );
    
    const [mealsRows] = await promisePool.execute(
      'SELECT * FROM meals WHERE user_id = ? AND DATE(created_at) = ?',
      [userId, today]
    );
    
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    const user = userRows[0];
    const todayMeals = mealsRows;
    
    // Calculate today's nutrition
    const totalCalories = todayMeals.reduce((sum, meal) => sum + (parseFloat(meal.calories) || 0), 0);
    const totalProtein = todayMeals.reduce((sum, meal) => sum + (parseFloat(meal.protein) || 0), 0);
    const totalCarbs = todayMeals.reduce((sum, meal) => sum + (parseFloat(meal.carbs) || 0), 0);
    const totalFat = todayMeals.reduce((sum, meal) => sum + (parseFloat(meal.fat) || 0), 0);
    
    // Generate AI advice based on user data
    const advice = generateNutritionAdvice(user, {
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat,
      mealsCount: todayMeals.length
    });
    
    res.json(advice);
  } catch (error) {
    console.error('Get daily advice error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/nutrition/weekly-plan', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user profile
    const [userRows] = await promisePool.execute(
      'SELECT * FROM user_profiles WHERE user_id = ?',
      [userId]
    );
    
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    const user = userRows[0];
    
    // Generate weekly nutrition plan
    const weeklyPlan = generateWeeklyNutritionPlan(user);
    
    res.json(weeklyPlan);
  } catch (error) {
    console.error('Get weekly plan error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/nutrition/analysis', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { days = 7 } = req.query;
    
    // Get meals from last N days
    const [mealsRows] = await promisePool.execute(
      'SELECT * FROM meals WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) ORDER BY created_at DESC',
      [userId, days]
    );
    
    // Get user profile
    const [userRows] = await promisePool.execute(
      'SELECT * FROM user_profiles WHERE user_id = ?',
      [userId]
    );
    
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    const user = userRows[0];
    const analysis = analyzeNutritionData(mealsRows, user);
    
    res.json(analysis);
  } catch (error) {
    console.error('Get nutrition analysis error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/nutrition/custom-plan', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { preferences, restrictions, goal } = req.body;
    
    // Get user profile
    const [userRows] = await promisePool.execute(
      'SELECT * FROM user_profiles WHERE user_id = ?',
      [userId]
    );
    
    if (userRows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    const user = userRows[0];
    
    // Generate custom nutrition plan
    const customPlan = generateCustomNutritionPlan(user, preferences, restrictions, goal);
    
    res.json(customPlan);
  } catch (error) {
    console.error('Create custom plan error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Nutrition Expert AI Functions
function generateNutritionAdvice(user, todayNutrition) {
  const { totalCalories, totalProtein, totalCarbs, totalFat, mealsCount } = todayNutrition;
  const { daily_calorie_goal, daily_protein_goal, daily_carbs_goal, daily_fat_goal, goal } = user;
  
  const advice = {
    overview: {},
    recommendations: [],
    warnings: [],
    tips: [],
    score: 0
  };
  
  // Calculate completion percentages
  const caloriePercent = (totalCalories / (daily_calorie_goal || 2000)) * 100;
  const proteinPercent = (totalProtein / (daily_protein_goal || 150)) * 100;
  const carbsPercent = (totalCarbs / (daily_carbs_goal || 250)) * 100;
  const fatPercent = (totalFat / (daily_fat_goal || 67)) * 100;
  
  advice.overview = {
    calorieStatus: caloriePercent,
    proteinStatus: proteinPercent,
    carbsStatus: carbsPercent,
    fatStatus: fatPercent,
    mealsToday: mealsCount
  };
  
  // Generate recommendations
  if (caloriePercent < 70) {
    advice.recommendations.push({
      type: 'calorie',
      icon: '🔥',
      title: 'Kalori Eksikliği',
      message: 'Günlük kalori hedefinizin %70\'ine henüz ulaşmadınız. Sağlıklı atıştırmalıklar ekleyin.',
      priority: 'high'
    });
  } else if (caloriePercent > 120) {
    advice.warnings.push({
      type: 'calorie',
      icon: '⚠️',
      title: 'Kalori Fazlası',
      message: 'Günlük kalori hedefinizi aştınız. Yarın daha az kalori almaya odaklanın.',
      priority: 'medium'
    });
  }
  
  if (proteinPercent < 80) {
    advice.recommendations.push({
      type: 'protein',
      icon: '💪',
      title: 'Protein Ekleyin',
      message: 'Protein hedefinize ulaşmak için tavuk, balık, yumurta veya bakliyat tüketin.',
      priority: 'high'
    });
  }
  
  if (mealsCount < 3) {
    advice.recommendations.push({
      type: 'meals',
      icon: '🍽️',
      title: 'Öğün Sayısı',
      message: 'En az 3 ana öğün tüketmeye çalışın. Metabolizmanızı hızlı tutmak için düzenli beslenin.',
      priority: 'medium'
    });
  }
  
  // Generate tips based on goal
  if (goal === 'lose') {
    advice.tips.push('💡 Kilo vermek için kalori açığı oluşturun ama çok düşük kalori almayın');
    advice.tips.push('🥗 Sebze ağırlıklı öğünler tercih edin');
    advice.tips.push('💧 Günde en az 2-3 litre su için');
  } else if (goal === 'gain') {
    advice.tips.push('💡 Kilo almak için kalori fazlası oluşturun');
    advice.tips.push('🥜 Sağlıklı yağlar ekleyin (fındık, avokado, zeytinyağı)');
    advice.tips.push('💪 Protein alımınızı artırın');
  } else {
    advice.tips.push('💡 Mevcut kilonuzu korumak için dengeli beslenin');
    advice.tips.push('🏃 Düzenli egzersiz yapın');
    advice.tips.push('😴 Kaliteli uyku alın');
  }
  
  // Calculate score
  const scores = [
    Math.min(caloriePercent / 100, 1) * 25,
    Math.min(proteinPercent / 100, 1) * 25,
    Math.min(carbsPercent / 100, 1) * 25,
    (mealsCount / 3) * 25
  ];
  advice.score = Math.round(scores.reduce((sum, score) => sum + score, 0));
  
  return advice;
}

function generateWeeklyNutritionPlan(user) {
  const { daily_calorie_goal, daily_protein_goal, goal, height, weight, age, gender, activity_level } = user;
  
  const plan = {
    weeklyGoals: {},
    dailyPlans: {},
    shoppingList: [],
    tips: []
  };
  
  // Calculate weekly goals
  plan.weeklyGoals = {
    totalCalories: (daily_calorie_goal || 2000) * 7,
    totalProtein: (daily_protein_goal || 150) * 7,
    workouts: activity_level === 'very_active' ? 6 : activity_level === 'active' ? 4 : 2,
    waterGlasses: 8 * 7
  };
  
  // Generate daily plans for 7 days
  const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  
  days.forEach((day, index) => {
    plan.dailyPlans[day] = generateDailyMealPlan(user, index);
  });
  
  // Generate shopping list
  plan.shoppingList = [
    { category: 'Protein', items: ['Tavuk göğsü', 'Balık fileto', 'Yumurta', 'Nohut'] },
    { category: 'Karbonhidrat', items: ['Esmer pirinç', 'Quinoa', 'Tatlı patates', 'Yulaf'] },
    { category: 'Sebze', items: ['Brokoli', 'Ispanak', 'Domates', 'Salatalık'] },
    { category: 'Meyve', items: ['Elma', 'Muz', 'Çilek', 'Portakal'] },
    { category: 'Sağlıklı Yağlar', items: ['Avokado', 'Zeytinyağı', 'Fındık', 'Chia tohumu'] }
  ];
  
  // Add tips
  plan.tips = [
    '📋 Haftalık meal prep yapın',
    '🛒 Alışveriş listesine sadık kalın',
    '💧 Her öğünle birlikte su için',
    '🥗 Tabağınızın yarısını sebze ile doldurun',
    '⏰ Öğünlerinizi düzenli saatlerde yiyin'
  ];
  
  return plan;
}

function generateDailyMealPlan(user, dayIndex) {
  const { daily_calorie_goal, goal } = user;
  const targetCalories = daily_calorie_goal || 2000;
  
  const mealPlans = [
    {
      breakfast: { name: 'Yulaf + Meyve + Fındık', calories: Math.round(targetCalories * 0.25), protein: 15 },
      lunch: { name: 'Tavuk Salatası', calories: Math.round(targetCalories * 0.35), protein: 30 },
      dinner: { name: 'Balık + Sebze', calories: Math.round(targetCalories * 0.30), protein: 25 },
      snack: { name: 'Yunan Yoğurdu', calories: Math.round(targetCalories * 0.10), protein: 10 }
    },
    {
      breakfast: { name: 'Omlet + Avokado', calories: Math.round(targetCalories * 0.25), protein: 20 },
      lunch: { name: 'Quinoa Bowl', calories: Math.round(targetCalories * 0.35), protein: 18 },
      dinner: { name: 'Et + Pilav', calories: Math.round(targetCalories * 0.30), protein: 30 },
      snack: { name: 'Meyve + Fındık', calories: Math.round(targetCalories * 0.10), protein: 5 }
    }
  ];
  
  return mealPlans[dayIndex % 2];
}

function analyzeNutritionData(meals, user) {
  const analysis = {
    summary: {},
    trends: {},
    recommendations: [],
    vitamins: {},
    minerals: {}
  };
  
  // Calculate totals
  const totalCalories = meals.reduce((sum, meal) => sum + (parseFloat(meal.calories) || 0), 0);
  const totalProtein = meals.reduce((sum, meal) => sum + (parseFloat(meal.protein) || 0), 0);
  const totalCarbs = meals.reduce((sum, meal) => sum + (parseFloat(meal.carbs) || 0), 0);
  const totalFat = meals.reduce((sum, meal) => sum + (parseFloat(meal.fat) || 0), 0);
  
  const days = meals.length > 0 ? Math.ceil((new Date() - new Date(meals[meals.length - 1].created_at)) / (1000 * 60 * 60 * 24)) || 1 : 1;
  
  analysis.summary = {
    avgDailyCalories: Math.round(totalCalories / days),
    avgDailyProtein: Math.round(totalProtein / days),
    avgDailyCarbs: Math.round(totalCarbs / days),
    avgDailyFat: Math.round(totalFat / days),
    totalMeals: meals.length,
    daysAnalyzed: days
  };
  
  // Analyze trends
  const calorieGoal = user.daily_calorie_goal || 2000;
  const proteinGoal = user.daily_protein_goal || 150;
  
  analysis.trends = {
    calorieAdherence: Math.round((analysis.summary.avgDailyCalories / calorieGoal) * 100),
    proteinAdherence: Math.round((analysis.summary.avgDailyProtein / proteinGoal) * 100),
    consistencyScore: calculateConsistencyScore(meals)
  };
  
  // Generate recommendations
  if (analysis.trends.calorieAdherence < 90) {
    analysis.recommendations.push({
      type: 'calorie',
      message: 'Kalori hedefinize daha yakın olmaya çalışın',
      action: 'Düzenli öğünler ekleyin'
    });
  }
  
  if (analysis.trends.proteinAdherence < 80) {
    analysis.recommendations.push({
      type: 'protein',
      message: 'Protein alımınızı artırın',
      action: 'Her öğüne protein kaynağı ekleyin'
    });
  }
  
  // Mock vitamin/mineral data
  analysis.vitamins = {
    vitaminC: Math.round(Math.random() * 100 + 50),
    vitaminD: Math.round(Math.random() * 100 + 30),
    vitaminB12: Math.round(Math.random() * 100 + 60),
    folate: Math.round(Math.random() * 100 + 40)
  };
  
  analysis.minerals = {
    iron: Math.round(Math.random() * 100 + 70),
    calcium: Math.round(Math.random() * 100 + 60),
    magnesium: Math.round(Math.random() * 100 + 50),
    zinc: Math.round(Math.random() * 100 + 45)
  };
  
  return analysis;
}

function calculateConsistencyScore(meals) {
  if (meals.length < 2) return 100;
  
  // Group meals by day
  const mealsByDay = {};
  meals.forEach(meal => {
    // Handle both Date objects and string dates
    let day;
    if (meal.created_at instanceof Date) {
      day = meal.created_at.toISOString().split('T')[0];
    } else if (typeof meal.created_at === 'string') {
      day = meal.created_at.split('T')[0];
    } else {
      // Fallback to current date if format is unknown
      day = new Date().toISOString().split('T')[0];
    }
    
    if (!mealsByDay[day]) mealsByDay[day] = [];
    mealsByDay[day].push(meal);
  });
  
  const dailyCalories = Object.values(mealsByDay).map(dayMeals => 
    dayMeals.reduce((sum, meal) => sum + (parseFloat(meal.calories) || 0), 0)
  );
  
  // Calculate coefficient of variation
  const mean = dailyCalories.reduce((sum, cal) => sum + cal, 0) / dailyCalories.length;
  const variance = dailyCalories.reduce((sum, cal) => sum + Math.pow(cal - mean, 2), 0) / dailyCalories.length;
  const cv = Math.sqrt(variance) / mean;
  
  // Convert to score (lower CV = higher consistency)
  return Math.max(0, Math.round(100 - (cv * 100)));
}

function generateCustomNutritionPlan(user, preferences, restrictions, goal) {
  return {
    message: 'Kişisel beslenme planınız hazırlanıyor...',
    estimatedTime: '24 saat',
    features: [
      'Kişisel makro hedefleri',
      'Yemek önerileri',
      'Alışveriş listesi',
      'Haftalık meal prep rehberi'
    ]
  };
}

// Simple theme setting (not reward-based)
app.post('/api/user/theme', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { theme } = req.body; // 'light' or 'dark'
    
    console.log(`Setting theme for user ${userId}: ${theme}`);
    
    // If user wants dark theme, check if they have the reward
    if (theme === 'dark') {
      const rewardQuery = `
        SELECT ur.*, r.name 
        FROM user_rewards ur
        JOIN rewards r ON ur.reward_id = r.id
        WHERE ur.user_id = ? AND r.category = 'theme' AND 
              (r.name = 'Gece Teması' OR r.id = 2) AND ur.is_active = TRUE
      `;
      const [rewardResults] = await promisePool.execute(rewardQuery, [userId]);
      
      if (rewardResults.length === 0) {
        return res.status(403).json({ 
          error: 'Dark theme is locked. Purchase the "Gece Teması" reward first.',
          errorCode: 'THEME_LOCKED',
          requiredReward: 'Gece Teması'
        });
      }
      
      console.log(`✅ User ${userId} has dark theme reward, allowing theme change`);
    }
    
    // First check if user profile exists
    const checkQuery = 'SELECT id FROM user_profiles WHERE user_id = ?';
    const [existing] = await promisePool.execute(checkQuery, [userId]);
    
    if (existing.length === 0) {
      // No profile exists, return error
      return res.status(400).json({ 
        error: 'User profile not found. Please complete your profile first.' 
      });
    }
    
    // Update existing user theme preference
    const updateQuery = 'UPDATE user_profiles SET theme_preference = ? WHERE user_id = ?';
    await promisePool.execute(updateQuery, [theme, userId]);
    
    res.json({ 
      message: `Theme set to ${theme} successfully!`,
      theme: theme
    });
  } catch (error) {
    console.error('Set theme error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/user/theme', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user theme preference
    const [rows] = await promisePool.execute(
      'SELECT theme_preference FROM user_profiles WHERE user_id = ?',
      [userId]
    );
    
    const theme = rows.length > 0 ? (rows[0].theme_preference || 'light') : 'light';
    
    console.log(`Getting theme for user ${userId}: ${theme}`);
    
    res.json({ 
      theme: theme,
      name: theme === 'dark' ? 'Gece Teması' : 'Default Theme'
    });
  } catch (error) {
    console.error('Get theme error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// ===============================
// GAME ROOM API ENDPOINTS
// ===============================

// Get all game rooms
app.get('/api/game-rooms', authenticateToken, async (req, res) => {
  try {
    const { game_type } = req.query;
    
    let query = `
      SELECT 
        gr.*,
        COUNT(gp.id) as actual_players,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'user_id', gp.user_id,
            'player_name', gp.player_name,
            'is_host', gp.is_host,
            'score', gp.score,
            'joined_at', gp.joined_at
          )
        ) as players
      FROM game_rooms gr
      LEFT JOIN game_players gp ON gr.id = gp.room_id AND gp.left_at IS NULL
      WHERE gr.status != 'finished'
    `;
    
    const params = [];
    if (game_type) {
      query += ' AND gr.game_type = ?';
      params.push(game_type);
    }
    
    query += ' GROUP BY gr.id ORDER BY gr.created_at DESC';
    
    const [rooms] = await promisePool.execute(query, params);
    
    // Format the response
    const formattedRooms = rooms.map(room => {
      let players = [];
      if (room.players) {
        try {
          // Check if it's already an object or needs parsing
          players = typeof room.players === 'string' 
            ? JSON.parse(room.players).filter(p => p.user_id !== null)
            : room.players.filter(p => p.user_id !== null);
        } catch (error) {
          console.error('Error parsing players data:', error);
          players = [];
        }
      }
      
      // Use actual count instead of potentially stale current_players column
      const actualPlayerCount = players.length;
      
      // Update database current_players to match actual count if different
      if (room.current_players !== actualPlayerCount) {
        promisePool.execute(
          'UPDATE game_rooms SET current_players = ? WHERE id = ?',
          [actualPlayerCount, room.id]
        ).catch(err => console.error('Error syncing player count:', err));
      }
      
      return {
        ...room,
        current_players: actualPlayerCount, // Use actual count
        players: players
      };
    });
    
    res.json({
      rooms: formattedRooms,
      totalRooms: formattedRooms.length
    });
  } catch (error) {
    console.error('Get game rooms error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Create a new game room
app.post('/api/game-rooms', authenticateToken, async (req, res) => {
  try {
    const { game_type, game_mode, player_name, max_players = 4 } = req.body;
    const userId = req.user.userId;
    
    // Generate unique room code
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const roomId = require('crypto').randomUUID();
    
    // Create the room
    const roomQuery = `
      INSERT INTO game_rooms (id, room_code, game_type, game_mode, host_user_id, host_name, max_players)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    await promisePool.execute(roomQuery, [
      roomId, roomCode, game_type, game_mode, userId, player_name, max_players
    ]);
    
    // Add the host as a player
    const playerQuery = `
      INSERT INTO game_players (room_id, user_id, player_name, is_host, is_ready) VALUES (?, ?, ?, TRUE, FALSE)
    `;
    
    await promisePool.execute(playerQuery, [roomId, userId, player_name]);
    
    // Return the created room
    const [newRoom] = await promisePool.execute(
      'SELECT * FROM game_rooms WHERE id = ?',
      [roomId]
    );
    
    const [players] = await promisePool.execute(
      'SELECT * FROM game_players WHERE room_id = ? AND left_at IS NULL',
      [roomId]
    );
    
    res.status(201).json({
      ...newRoom[0],
      players: players
    });
  } catch (error) {
    console.error('Create game room error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Join a game room
app.post('/api/game-rooms/join', authenticateToken, async (req, res) => {
  try {
    const { room_code, player_name } = req.body;
    const userId = req.user.userId;
    
    // Find the room
    const [rooms] = await promisePool.execute(
      'SELECT * FROM game_rooms WHERE room_code = ? AND status = "waiting"',
      [room_code]
    );
    
    if (rooms.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const room = rooms[0];
    
    // Check if room is full
    const [playerCount] = await promisePool.execute(
      'SELECT COUNT(*) as count FROM game_players WHERE room_id = ? AND left_at IS NULL',
      [room.id]
    );
    
    if (playerCount[0].count >= room.max_players) {
      return res.status(400).json({ error: 'Room is full' });
    }
    
    // Check if user is already in the room
    const [existingPlayer] = await promisePool.execute(
      'SELECT * FROM game_players WHERE room_id = ? AND user_id = ? AND left_at IS NULL',
      [room.id, userId]
    );
    
    if (existingPlayer.length > 0) {
      return res.status(400).json({ error: 'Already in this room' });
    }
    
    // Add player to room
    await promisePool.execute(
      'INSERT INTO game_players (room_id, user_id, player_name, is_host, is_ready) VALUES (?, ?, ?, FALSE, FALSE)',
      [room.id, userId, player_name]
    );
    
    // Update room player count
    await promisePool.execute(
      'UPDATE game_rooms SET current_players = current_players + 1 WHERE id = ?',
      [room.id]
    );
    
    // Return updated room info
    const [updatedRoom] = await promisePool.execute(
      'SELECT * FROM game_rooms WHERE id = ?',
      [room.id]
    );
    
    const [players] = await promisePool.execute(
      'SELECT * FROM game_players WHERE room_id = ? AND left_at IS NULL',
      [room.id]
    );
    
    res.json({
      ...updatedRoom[0],
      players: players
    });
  } catch (error) {
    console.error('Join game room error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Set player ready status
app.post('/api/game-rooms/ready', authenticateToken, async (req, res) => {
  try {
    const { room_code, is_ready } = req.body;
    const userId = req.user.userId;
    
    console.log(`Setting ready status for user ${userId} in room ${room_code} to ${is_ready}`);
    
    // Find the room
    const [rooms] = await promisePool.execute(
      'SELECT * FROM game_rooms WHERE room_code = ?',
      [room_code]
    );
    
    if (rooms.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const room = rooms[0];
    
    // Convert boolean to 0/1 for MySQL
    const readyValue = is_ready ? 1 : 0;
    console.log(`Converting ready status to MySQL value: ${readyValue}`);
    
    // Update player ready status  
    await promisePool.execute(
      'UPDATE game_players SET is_ready = ? WHERE room_id = ? AND user_id = ? AND left_at IS NULL',
      [readyValue, room.id, userId]
    );
    
    // Check if all players are ready
    const [allPlayers] = await promisePool.execute(
      'SELECT * FROM game_players WHERE room_id = ? AND left_at IS NULL',
      [room.id]
    );
    
    const readyPlayers = allPlayers.filter(p => p.is_ready === 1);
    const allReady = allPlayers.length >= 2 && readyPlayers.length === allPlayers.length;
    
    console.log(`Ready status updated: ${readyPlayers.length}/${allPlayers.length} players ready`);
    
    res.json({
      message: 'Ready status updated',
      all_ready: allReady,
      ready_count: readyPlayers.length,
      total_count: allPlayers.length
    });
  } catch (error) {
    console.error('Set ready status error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Leave a game room
app.post('/api/game-rooms/leave', authenticateToken, async (req, res) => {
  try {
    const { room_code } = req.body;
    const userId = req.user.userId;
    
    console.log(`Player ${userId} leaving room ${room_code}`);
    
    // Find the room
    const [rooms] = await promisePool.execute(
      'SELECT * FROM game_rooms WHERE room_code = ?',
      [room_code]
    );
    
    if (rooms.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const room = rooms[0];
    
    // Delete player from game_players
    await promisePool.execute(
      'DELETE FROM game_players WHERE room_id = ? AND user_id = ?',
      [room.id, userId]
    );
    
    console.log(`Deleted player ${userId} from room ${room.id}`);
    
    // Update room player count based on remaining players
    const [remainingPlayers] = await promisePool.execute(
      'SELECT COUNT(*) as count FROM game_players WHERE room_id = ?',
      [room.id]
    );
    
    const currentPlayers = remainingPlayers[0].count;
    
    await promisePool.execute(
      'UPDATE game_rooms SET current_players = ? WHERE id = ?',
      [currentPlayers, room.id]
    );
    
    console.log(`Updated room ${room.id} player count to ${currentPlayers}`);
    
    // If host left, either transfer host or close room
    if (room.host_user_id === userId) {
      const [newHostPlayers] = await promisePool.execute(
        'SELECT * FROM game_players WHERE room_id = ? ORDER BY joined_at ASC LIMIT 1',
        [room.id]
      );
      
      if (newHostPlayers.length > 0) {
        // Transfer host to next player
        const newHost = newHostPlayers[0];
        await promisePool.execute(
          'UPDATE game_rooms SET host_user_id = ?, host_name = ? WHERE id = ?',
          [newHost.user_id, newHost.player_name, room.id]
        );
        
        await promisePool.execute(
          'UPDATE game_players SET is_host = 1 WHERE room_id = ? AND user_id = ?',
          [room.id, newHost.user_id]
        );
        
        console.log(`Transferred host to player ${newHost.user_id}`);
      } else {
        // No players left, close room
        await promisePool.execute(
          'UPDATE game_rooms SET status = "finished", finished_at = NOW() WHERE id = ?',
          [room.id]
        );
        console.log(`Closed empty room ${room.id}`);
      }
    }
    
    res.json({ 
      message: 'Left room successfully',
      current_players: currentPlayers
    });
  } catch (error) {
    console.error('Leave game room error:', error);
    console.error(error.stack);
    res.status(500).json({ error: 'Database error' });
  }
});

// Start a game
app.post('/api/game-rooms/start', authenticateToken, async (req, res) => {
  try {
    const { room_code } = req.body;
    const userId = req.user.userId;
    
    // Find the room and verify host
    const [rooms] = await promisePool.execute(
      'SELECT * FROM game_rooms WHERE room_code = ? AND host_user_id = ? AND status = "waiting"',
      [room_code, userId]
    );
    
    if (rooms.length === 0) {
      return res.status(404).json({ error: 'Room not found or you are not the host' });
    }
    
    const room = rooms[0];
    
    // Check minimum players and all ready status
    const [allPlayers] = await promisePool.execute(
      'SELECT * FROM game_players WHERE room_id = ? AND left_at IS NULL',
      [room.id]
    );
    
    if (allPlayers.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 players to start' });
    }
    
    // Check if all players are ready
    const readyPlayers = allPlayers.filter(p => p.is_ready);
    if (readyPlayers.length !== allPlayers.length) {
      return res.status(400).json({ 
        error: `Not all players are ready. ${readyPlayers.length}/${allPlayers.length} players ready.` 
      });
    }
    
    // Update room status
    await promisePool.execute(
      'UPDATE game_rooms SET status = "playing", started_at = NOW() WHERE id = ?',
      [room.id]
    );
    
    // Create game session with game data
    const gameData = generateGameData(room.game_type);
    
    await promisePool.execute(
      'INSERT INTO game_sessions (room_id, game_data) VALUES (?, ?)',
      [room.id, JSON.stringify(gameData)]
    );
    
    res.json({
      message: 'Game started successfully',
      game_data: gameData
    });
  } catch (error) {
    console.error('Start game error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Submit game score
app.post('/api/game-rooms/score', authenticateToken, async (req, res) => {
  try {
    const { room_code, score } = req.body;
    const userId = req.user.userId;
    
    // Find the room and session
    const [rooms] = await promisePool.execute(
      'SELECT gr.*, gs.id as session_id FROM game_rooms gr ' +
      'JOIN game_sessions gs ON gr.id = gs.room_id ' +
      'WHERE gr.room_code = ? AND gr.status = "playing"',
      [room_code]
    );
    
    if (rooms.length === 0) {
      return res.status(404).json({ error: 'Game session not found' });
    }
    
    const room = rooms[0];
    
    // Get player info
    const [players] = await promisePool.execute(
      'SELECT * FROM game_players WHERE room_id = ? AND user_id = ? AND left_at IS NULL',
      [room.id, userId]
    );
    
    if (players.length === 0) {
      return res.status(404).json({ error: 'Player not found in room' });
    }
    
    const player = players[0];
    
    // Update player score
    await promisePool.execute(
      'UPDATE game_players SET score = ? WHERE room_id = ? AND user_id = ?',
      [score, room.id, userId]
    );
    
    // Check if all players have submitted scores
    const [allPlayers] = await promisePool.execute(
      'SELECT * FROM game_players WHERE room_id = ? AND left_at IS NULL',
      [room.id]
    );
    
    const playersWithScores = allPlayers.filter(p => p.score > 0 || p.user_id === userId);
    
    let finalResults = null;
    
    if (playersWithScores.length === allPlayers.length) {
      // Game finished, calculate final results
      const sortedPlayers = allPlayers.sort((a, b) => {
        if (a.user_id === userId) a.score = score; // Update current player's score
        if (b.user_id === userId) b.score = score;
        return b.score - a.score;
      });
      
      // Insert final scores
      for (let i = 0; i < sortedPlayers.length; i++) {
        const p = sortedPlayers[i];
        const finalScore = p.user_id === userId ? score : p.score;
        const xpEarned = Math.floor(finalScore / 10) + (i === 0 ? 50 : 25); // Winner bonus
        
        await promisePool.execute(
          'INSERT INTO game_scores (session_id, user_id, player_name, final_score, xp_earned, rank_position) VALUES (?, ?, ?, ?, ?, ?)',
          [room.session_id, p.user_id, p.player_name, finalScore, xpEarned, i + 1]
        );
        
        // Award XP to player
        await promisePool.execute(
          'UPDATE user_profiles SET total_xp = total_xp + ? WHERE user_id = ?',
          [xpEarned, p.user_id]
        );
        
        // Log XP transaction
        await promisePool.execute(
          'INSERT INTO xp_transactions (user_id, amount, source, description) VALUES (?, ?, "game", ?)',
          [p.user_id, xpEarned, `Game: ${room.game_type} - Rank ${i + 1}`]
        );
      }
      
      // Update room status
      await promisePool.execute(
        'UPDATE game_rooms SET status = "finished", finished_at = NOW() WHERE id = ?',
        [room.id]
      );
      
      await promisePool.execute(
        'UPDATE game_sessions SET ended_at = NOW(), winner_user_id = ? WHERE id = ?',
        [sortedPlayers[0].user_id, room.session_id]
      );
      
      finalResults = {
        winner: sortedPlayers[0],
        rankings: sortedPlayers.map((p, i) => ({
          rank: i + 1,
          player_name: p.player_name,
          score: p.user_id === userId ? score : p.score,
          xp_earned: Math.floor((p.user_id === userId ? score : p.score) / 10) + (i === 0 ? 50 : 25)
        }))
      };
    }
    
    res.json({
      message: 'Score submitted successfully',
      final_results: finalResults
    });
  } catch (error) {
    console.error('Submit score error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get specific room details
app.get('/api/game-rooms/:roomCode', authenticateToken, async (req, res) => {
  try {
    const { roomCode } = req.params;
    
    const [rooms] = await promisePool.execute(
      'SELECT * FROM game_rooms WHERE room_code = ?',
      [roomCode]
    );
    
    if (rooms.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const [players] = await promisePool.execute(
      'SELECT * FROM game_players WHERE room_id = ? AND left_at IS NULL',
      [rooms[0].id]
    );
    
    res.json({
      ...rooms[0],
      players: players
    });
  } catch (error) {
    console.error('Get room details error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

// Helper function to generate game data
function generateGameData(gameType) {
  switch (gameType) {
    case 'quiz':
      return {
        questions: [
          {
            question: "Bir orta boy elmada kaç kalori vardır?",
            options: ["52", "95", "125", "180"],
            correct: 1
          },
          {
            question: "Hangi vitamin C kaynağıdır?",
            options: ["Portakal", "Et", "Ekmek", "Süt"],
            correct: 0
          },
          {
            question: "Günde kaç bardak su içmeliyiz?",
            options: ["2-3", "5-6", "8-10", "12-15"],
            correct: 2
          },
          {
            question: "Protein hangi besinlerde bulunur?",
            options: ["Şeker", "Tavuk", "Patates", "Yağ"],
            correct: 1
          },
          {
            question: "Hangi besin grubundan enerji alırız?",
            options: ["Vitamin", "Mineral", "Karbonhidrat", "Su"],
            correct: 2
          }
        ],
        timeLimit: 15
      };
    case 'guess':
      return {
        foods: [
          { name: "Hamburger", calories: 540, image: "🍔" },
          { name: "Pizza Dilimi", calories: 285, image: "🍕" },
          { name: "Elma", calories: 95, image: "🍎" },
          { name: "Çikolata", calories: 210, image: "🍫" },
          { name: "Avokado", calories: 160, image: "🥑" }
        ],
        timeLimit: 20
      };
    case 'math':
      return {
        problems: Array.from({ length: 5 }, () => {
          const num1 = Math.floor(Math.random() * 500) + 100;
          const num2 = Math.floor(Math.random() * 300) + 50;
          const operation = Math.random() > 0.5 ? '+' : '-';
          return {
            question: `${num1} ${operation} ${num2}`,
            answer: operation === '+' ? num1 + num2 : num1 - num2
          };
        }),
        timeLimit: 10
      };
    case 'word':
      return {
        categories: [
          {
            category: "Meyveler",
            words: ["elma", "muz", "portakal", "çilek", "üzüm", "karpuz", "kavun", "şeftali"],
            hint: "Tatlı ve sağlıklı besinler"
          },
          {
            category: "Sebzeler", 
            words: ["domates", "salatalık", "havuç", "brokoli", "ıspanak", "lahana", "biber"],
            hint: "Vitamin deposu yeşillikler"
          }
        ],
        timeLimit: 30
      };
    default:
      return {};
  }
}

// Beslenme uzmanı erişim kontrolü
app.get('/api/user/features/check-nutritionist', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // ID 3 olan beslenme uzmanı rozetini kontrol et
    const [rows] = await promisePool.query(
      'SELECT COUNT(*) as has_access FROM user_rewards WHERE user_id = ? AND reward_id = 3',
      [userId]
    );

    return res.json({
      hasAccess: rows[0].has_access > 0,
      message: 'Başarıyla kontrol edildi'
    });

  } catch (error) {
    console.error('Error checking nutritionist access:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User Features & Rewards
app.get('/api/user/active-features', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const [features] = await pool.query(
      'SELECT * FROM user_features WHERE user_id = ? AND is_active = TRUE',
      [userId]
    );
    res.json(features);
  } catch (error) {
    console.error('Error getting active features:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/user/features/unlock', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { featureId } = req.body;

    if (!featureId) {
      return res.status(400).json({ error: 'Feature ID is required' });
    }

    // ... rest of the code ...
  } catch (error) {
    console.error('Error unlocking feature:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Beslenme uzmanı chat endpoint'i - Python backend'e yönlendiriliyor
app.post('/api/chat/nutritionist', authenticateToken, async (req, res) => {
  try {
    const { messages } = req.body;
    
    // Kullanıcının özelliğe erişimi var mı kontrol et
    const [userRewards] = await promisePool.execute(
      'SELECT * FROM user_rewards WHERE user_id = ? AND reward_id = 3',
      [req.user.userId]
    );

    if (userRewards.length === 0) {
      return res.status(403).json({ error: 'Bu özelliğe erişiminiz yok' });
    }

    // Python backend'e yönlendir (Node.js 18+ built-in fetch kullanılıyor)
    const pythonBackendUrl = process.env.PYTHON_BACKEND_URL || 'http://localhost:5001';
    try {
      const pythonResponse = await fetch(`${pythonBackendUrl}/nutritionist/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers['authorization'] || ''
        },
        body: JSON.stringify({ messages: messages })
      });
      
      if (pythonResponse.ok) {
        const data = await pythonResponse.json();
        return res.json(data);
      } else {
        throw new Error('Python backend error');
      }
    } catch (pythonError) {
      // Python backend yanıt vermezse basit bir fallback yanıt ver
      const userMessage = (messages.length > 0 && messages[messages.length - 1] && messages[messages.length - 1].content) || '';
      const fallbackResponses = [
        'Merhaba! Beslenme konularında size yardımcı olmaya hazırım. Ne konuda danışmak istiyorsunuz?',
        'Sağlıklı beslenme konusunda size yardımcı olabilirim. Sorunuz nedir?',
        'Beslenme ve diyet konularında danışmanlık yapabilirim. Nasıl yardımcı olabilirim?'
      ];
      const response = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      return res.json({ response });
    }
  } catch (error) {
    console.error('Chat error:', error);
    console.error(error.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Chat endpoint'i
app.post('/api/chat', authenticateToken, async (req, res) => {
  try {
    const { messages } = req.body;
    const userId = req.user.id;

    // Kullanıcının XP shop'tan bu özelliği açıp açmadığını kontrol et
    const [rewards] = await pool.execute(
      'SELECT * FROM user_rewards WHERE user_id = ? AND reward_id = 3',
      [userId]
    );

    if (rewards.length === 0) {
      return res.status(403).json({ 
        error: 'Bu özelliği kullanabilmek için XP shop\'tan açmanız gerekiyor!' 
      });
    }

    // Kullanıcının beslenme bilgilerini al
    const [userNutrition] = await pool.execute(
      'SELECT daily_calories, diet_type, restrictions FROM user_nutrition WHERE user_id = ?',
      [userId]
    );

    // Sistem mesajını hazırla
    const systemMessage = {
      role: "system",
      content: `Sen Caloria uygulamasının beslenme uzmanısın. Türkçe konuşan, arkadaş canlısı ve yardımsever bir asistansın.

Kullanıcı Bilgileri:
- Günlük Kalori Hedefi: ${(userNutrition && userNutrition.daily_calories) || 'Belirtilmemiş'}
- Diyet Tipi: ${(userNutrition && userNutrition.diet_type) || 'Standart'}
- Kısıtlamalar: ${(userNutrition && userNutrition.restrictions) || 'Yok'}

Görevlerin:
1. Beslenme, diyet ve fitness konularında danışmanlık yap
2. Sağlıklı yemek tarifleri öner
3. Kalori hesaplamalarında yardımcı ol
4. Kişiselleştirilmiş beslenme tavsiyeleri ver
5. Motivasyon ve destek sağla

Her zaman Türkçe yanıt ver ve samimi bir dil kullan.`
    };

    // OpenAI'ye gönderilecek mesajları hazırla
    const chatMessages = [
      systemMessage,
      ...messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    ];

    // OpenAI'den yanıt al
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: chatMessages,
      temperature: 0.7,
      max_tokens: 500
    });

    res.json({ response: completion.choices[0].message.content });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Sohbet sırasında bir hata oluştu' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Mobile API: http://localhost:${PORT}/api`);
  console.log(`🌐 Web Admin: http://localhost:${PORT}`);
});