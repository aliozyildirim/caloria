-- Caloria Database Schema
-- MySQL Database for Calorie Tracking App

-- Create Database
CREATE DATABASE IF NOT EXISTS caloria_db;
USE caloria_db;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    age INT NOT NULL,
    height DECIMAL(5,2) NOT NULL, -- cm
    weight DECIMAL(5,2) NOT NULL, -- kg
    gender ENUM('male', 'female') NOT NULL,
    activity_level ENUM('sedentary', 'light', 'moderate', 'active', 'very_active') NOT NULL,
    goal ENUM('lose', 'maintain', 'gain') NOT NULL,
    target_weight DECIMAL(5,2) NOT NULL,
    daily_calorie_goal INT NOT NULL,
    daily_protein_goal INT NOT NULL,
    daily_carbs_goal INT NOT NULL,
    daily_fat_goal INT NOT NULL,
    total_xp INT DEFAULT 0,
    level INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Meals Table
CREATE TABLE IF NOT EXISTS meals (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    calories DECIMAL(8,2) NOT NULL,
    protein DECIMAL(6,2) NOT NULL,
    carbs DECIMAL(6,2) NOT NULL,
    fat DECIMAL(6,2) NOT NULL,
    image_uri TEXT,
    meal_type ENUM('breakfast', 'lunch', 'dinner', 'snack') DEFAULT 'snack',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Stories Table
CREATE TABLE IF NOT EXISTS stories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_avatar TEXT,
    image_uri TEXT NOT NULL,
    description TEXT NOT NULL,
    calories INT NOT NULL,
    likes INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Story Likes Table
CREATE TABLE IF NOT EXISTS story_likes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    story_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_like (story_id, user_id),
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Favorites Table
CREATE TABLE IF NOT EXISTS favorites (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    calories DECIMAL(8,2) NOT NULL,
    protein DECIMAL(6,2) NOT NULL,
    carbs DECIMAL(6,2) NOT NULL,
    fat DECIMAL(6,2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    times_used INT DEFAULT 0,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Diet Plans Table
CREATE TABLE IF NOT EXISTS diet_plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type ENUM('keto', 'mediterranean', 'vegan', 'paleo', 'intermittent_fasting', 'low_carb', 'dash', 'vegetarian') NOT NULL,
    duration INT NOT NULL, -- days
    daily_calories INT NOT NULL,
    daily_protein INT NOT NULL,
    daily_carbs INT NOT NULL,
    daily_fat INT NOT NULL,
    benefits JSON,
    restrictions JSON,
    difficulty ENUM('easy', 'medium', 'hard') NOT NULL,
    disclaimer TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Diet Plans Table (Active diet plans for users)
CREATE TABLE IF NOT EXISTS user_diet_plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    diet_plan_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (diet_plan_id) REFERENCES diet_plans(id) ON DELETE CASCADE
);

-- Diet Logs Table (Daily progress tracking)
CREATE TABLE IF NOT EXISTS diet_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    weight DECIMAL(5,2) NOT NULL, -- kg
    mood INT DEFAULT 5, -- 1-10 scale
    energy INT DEFAULT 5, -- 1-10 scale
    water INT DEFAULT 0, -- glasses of water
    notes TEXT,
    exercise TEXT,
    sleep DECIMAL(4,2) DEFAULT 0, -- hours
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_date (user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Achievements Table
CREATE TABLE IF NOT EXISTS achievements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    type ENUM('streak', 'calorie', 'weight', 'social') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(100) NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Meal Plans Table (Weekly meal planning for diet plans)
CREATE TABLE IF NOT EXISTS meal_plans (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    diet_plan_id INT NOT NULL,
    date DATE NOT NULL,
    meal_type ENUM('breakfast', 'lunch', 'dinner', 'snack') NOT NULL,
    planned_food_name VARCHAR(255) NOT NULL,
    planned_calories DECIMAL(8,2) NOT NULL,
    planned_protein DECIMAL(6,2) NOT NULL,
    planned_carbs DECIMAL(6,2) NOT NULL,
    planned_fat DECIMAL(6,2) NOT NULL,
    instructions TEXT,
    is_completed BOOLEAN DEFAULT FALSE,
    actual_calories DECIMAL(8,2) DEFAULT 0,
    actual_protein DECIMAL(6,2) DEFAULT 0,
    actual_carbs DECIMAL(6,2) DEFAULT 0,
    actual_fat DECIMAL(6,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (diet_plan_id) REFERENCES diet_plans(id) ON DELETE CASCADE
);

-- Sessions Table (for JWT token management)
CREATE TABLE IF NOT EXISTS sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Challenges Table
CREATE TABLE IF NOT EXISTS challenges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    type VARCHAR(100) NOT NULL,
    target_days INT NOT NULL,
    xp_reward INT DEFAULT 50,
    icon VARCHAR(100) NOT NULL,
    difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Challenges Table
CREATE TABLE IF NOT EXISTS user_challenges (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    challenge_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    current_progress INT DEFAULT 0,
    target_progress INT NOT NULL,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE
);

-- XP Transactions Table
CREATE TABLE IF NOT EXISTS xp_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    amount INT NOT NULL,
    source ENUM('challenge', 'meal_log', 'daily_goal', 'streak', 'achievement') NOT NULL,
    source_id INT,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Water intake tracking tables
CREATE TABLE water_intake (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    glasses_count INT DEFAULT 0,
    goal_glasses INT DEFAULT 8,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, date)
);

CREATE TABLE water_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    reminder_hours JSON DEFAULT '[]',
    daily_goal INT DEFAULT 8,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_settings (user_id)
);

-- Notification system tables
CREATE TABLE push_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL,
    device_type ENUM('ios', 'android', 'web') DEFAULT 'ios',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_token (user_id, token)
);

CREATE TABLE notification_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    notification_type ENUM('water_reminder', 'meal_reminder', 'challenge', 'achievement', 'general') NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    data JSON,
    status ENUM('pending', 'sent', 'delivered', 'failed') DEFAULT 'pending',
    sent_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_type (user_id, notification_type),
    INDEX idx_status (status),
    INDEX idx_sent_at (sent_at)
);

CREATE TABLE notification_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    water_reminders BOOLEAN DEFAULT TRUE,
    meal_reminders BOOLEAN DEFAULT TRUE,
    challenge_notifications BOOLEAN DEFAULT TRUE,
    achievement_notifications BOOLEAN DEFAULT TRUE,
    general_notifications BOOLEAN DEFAULT TRUE,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '07:00:00',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_notification_settings (user_id)
);

-- Create Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_meals_user_id ON meals(user_id);
CREATE INDEX idx_meals_created_at ON meals(created_at);
CREATE INDEX idx_stories_user_id ON stories(user_id);
CREATE INDEX idx_stories_created_at ON stories(created_at);
CREATE INDEX idx_favorites_user_id ON favorites(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX idx_challenges_is_active ON challenges(is_active);
CREATE INDEX idx_user_challenges_user_id ON user_challenges(user_id);
CREATE INDEX idx_user_challenges_is_completed ON user_challenges(is_completed);
CREATE INDEX idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX idx_meal_plans_user_id ON meal_plans(user_id);
CREATE INDEX idx_meal_plans_date ON meal_plans(date);

-- Insert default challenges
INSERT INTO challenges (title, description, type, target_days, xp_reward, icon, difficulty) VALUES
('Sebze Tüketimi', 'Bu hafta her gün 5 porsiyon sebze tüketin!', 'vegetables', 7, 50, 'salad', 'medium'),
('Su İçme', 'Günde en az 8 bardak su için!', 'water', 7, 40, 'water-drop', 'easy'),
('Egzersiz', 'Haftada 3 kez 30 dakika yürüyüş yapın!', 'exercise', 3, 60, 'fitness', 'medium'),
('Sağlıklı Yağlar', 'Sağlıklı yağları diyetinize ekleyin!', 'healthy_fats', 7, 45, 'nutrition', 'medium'),
('Şeker Kısıtlama', 'Şeker yerine meyve tercih edin!', 'no_sugar', 7, 55, 'apple', 'hard'),
('Uyku Düzeni', 'Her gece 7-8 saat uyuyun!', 'sleep', 7, 50, 'bed', 'medium'),
('Meditasyon', 'Günde 10 dakika meditasyon yapın!', 'meditation', 7, 45, 'leaf', 'easy');

-- Insert some demo diet plans
INSERT INTO diet_plans (name, description, type, duration, daily_calories, daily_protein, daily_carbs, daily_fat, benefits, restrictions, difficulty, disclaimer) VALUES
('Ketojenik Diyet', 'Yüksek yağ, düşük karbonhidrat diyeti', 'keto', 30, 1800, 135, 45, 140, '["Hızlı kilo kaybı", "Mental netlik", "Kan şekeri kontrolü"]', '["Tahıllar", "Şekerli yiyecekler", "Meyveler"]', 'hard', 'Doktor kontrolünde uygulanmalıdır.'),
('Akdeniz Diyeti', 'Sağlıklı yağlar ve taze sebzeler', 'mediterranean', 60, 2000, 100, 250, 78, '["Kalp sağlığı", "Uzun yaşam", "Anti-inflamatuar"]', '["İşlenmiş gıdalar", "Aşırı kırmızı et"]', 'easy', 'Genel sağlık için önerilir.'),
('Vegan Diyet', 'Tamamen bitkisel beslenme', 'vegan', 90, 1900, 95, 285, 63, '["Çevre dostu", "Etik beslenme", "Fiber zengini"]', '["Tüm hayvansal ürünler"]', 'medium', 'B12 vitamini takviyesi önerilir.');

-- Show tables
SHOW TABLES; 