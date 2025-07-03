-- Add Challenges Tables to Existing Database
USE caloria_db;

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

-- Create Indexes
CREATE INDEX idx_challenges_is_active ON challenges(is_active);
CREATE INDEX idx_user_challenges_user_id ON user_challenges(user_id);
CREATE INDEX idx_user_challenges_is_completed ON user_challenges(is_completed);
CREATE INDEX idx_xp_transactions_user_id ON xp_transactions(user_id);

-- Insert default challenges
INSERT IGNORE INTO challenges (title, description, type, target_days, xp_reward, icon, difficulty) VALUES
('Sebze Tüketimi', 'Bu hafta her gün 5 porsiyon sebze tüketin!', 'vegetables', 7, 50, 'salad', 'medium'),
('Su İçme', 'Günde en az 8 bardak su için!', 'water', 7, 40, 'water-drop', 'easy'),
('Egzersiz', 'Haftada 3 kez 30 dakika yürüyüş yapın!', 'exercise', 3, 60, 'fitness', 'medium'),
('Sağlıklı Yağlar', 'Sağlıklı yağları diyetinize ekleyin!', 'healthy_fats', 7, 45, 'nutrition', 'medium'),
('Şeker Kısıtlama', 'Şeker yerine meyve tercih edin!', 'no_sugar', 7, 55, 'apple', 'hard'),
('Uyku Düzeni', 'Her gece 7-8 saat uyuyun!', 'sleep', 7, 50, 'bed', 'medium'),
('Meditasyon', 'Günde 10 dakika meditasyon yapın!', 'meditation', 7, 45, 'leaf', 'easy');

SELECT 'Challenges tables created successfully!' as status; 