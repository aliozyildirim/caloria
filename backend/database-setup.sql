-- ===============================
-- ACHIEVEMENTS & REWARDS SYSTEM TABLES
-- ===============================

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100) DEFAULT NULL,
    badge_color VARCHAR(7) DEFAULT '#FFD700',
    category ENUM('meal', 'challenge', 'level', 'streak', 'water', 'social') DEFAULT 'meal',
    requirement_type VARCHAR(50) NOT NULL,
    requirement_value INT NOT NULL,
    xp_reward INT DEFAULT 25,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    achievement_id INT NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_achievement (user_id, achievement_id)
);

-- Rewards/Shop table
CREATE TABLE IF NOT EXISTS rewards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(100) DEFAULT NULL,
    category ENUM('avatar', 'theme', 'badge', 'feature', 'discount') DEFAULT 'badge',
    xp_cost INT NOT NULL,
    reward_data JSON,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User rewards (purchased items)
CREATE TABLE IF NOT EXISTS user_rewards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    reward_id INT NOT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP NULL DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_reward (user_id, reward_id)
);

-- Add activated_at column if it doesn't exist
ALTER TABLE user_rewards ADD COLUMN IF NOT EXISTS activated_at TIMESTAMP NULL DEFAULT NULL;

-- Insert sample rewards
INSERT IGNORE INTO rewards (id, name, description, icon, category, xp_cost, reward_data) VALUES
-- Themes
(1, 'Gece Teması', 'Koyu renkli gece teması', 'moon', 'theme', 500, JSON_OBJECT(
  'primaryColor', '#1a1a2e',
  'secondaryColor', '#16213e',
  'accentColor', '#0f3460',
  'backgroundColor', '#0f0f23',
  'textColor', '#ffffff',
  'cardColor', '#1a1a2e'
)),
(2, 'Doğa Teması', 'Yeşil doğa teması', 'apple', 'theme', 750, JSON_OBJECT(
  'primaryColor', '#2d5016',
  'secondaryColor', '#3e6b1f',
  'accentColor', '#4f7942',
  'backgroundColor', '#f0f8e8',
  'textColor', '#1a3009',
  'cardColor', '#ffffff'
)),
(3, 'Sunset Teması', 'Günbatımı renkleri teması', 'fire', 'theme', 1000, JSON_OBJECT(
  'primaryColor', '#ff6b35',
  'secondaryColor', '#f7931e',
  'accentColor', '#ffb627',
  'backgroundColor', '#fff5e6',
  'textColor', '#8b2500',
  'cardColor', '#ffffff'
)),

-- Features
(4, 'Gelişmiş İstatistikler', 'Detaylı analiz grafikleri', 'trophy', 'feature', 300, JSON_OBJECT(
  'type', 'analytics',
  'config', JSON_OBJECT('advancedCharts', true, 'exportData', true)
)),
(5, 'Özel Su Hatırlatıcısı', 'Kişiselleştirilmiş su hatırlatmaları', 'water', 'feature', 200, JSON_OBJECT(
  'type', 'water_reminder',
  'config', JSON_OBJECT('customSounds', true, 'smartReminders', true)
)),
(6, 'Premium Yemek Planı', 'AI destekli yemek önerileri', 'star', 'feature', 800, JSON_OBJECT(
  'type', 'meal_planning',
  'config', JSON_OBJECT('aiRecommendations', true, 'customPlans', true)
)),

-- Avatars
(7, 'Altın Çerçeve', 'Altın renkli profil çerçevesi', 'crown', 'avatar', 400, JSON_OBJECT(
  'frameColor', '#FFD700',
  'frameStyle', 'gold'
)),
(8, 'Gümüş Çerçeve', 'Gümüş renkli profil çerçevesi', 'medal', 'avatar', 250, JSON_OBJECT(
  'frameColor', '#C0C0C0',
  'frameStyle', 'silver'
)),

-- Badges
(9, 'Su Ustası', 'Su içme hedeflerini tamamlama rozeti', 'water', 'badge', 150, JSON_OBJECT(
  'badgeType', 'water_master',
  'description', '30 gün üst üste su hedefini tamamla'
)),
(10, 'Kalori Şampiyonu', 'Kalori hedeflerini tamamlama rozeti', 'fire', 'badge', 200, JSON_OBJECT(
  'badgeType', 'calorie_champion',
  'description', '7 gün üst üste kalori hedefini tamamla'
)),

-- Discounts
(11, '%20 Premium İndirim', 'Premium özellikler için %20 indirim', 'diamond', 'discount', 600, JSON_OBJECT(
  'discountPercent', 20,
  'applicableItems', JSON_ARRAY('premium_subscription', 'advanced_features')
)),
(12, '%10 Genel İndirim', 'Tüm ödüller için %10 indirim', 'star', 'discount', 400, JSON_OBJECT(
  'discountPercent', 10,
  'applicableItems', JSON_ARRAY('all_rewards')
)); 