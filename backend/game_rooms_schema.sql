-- Game Rooms Schema for Caloria Multiplayer Gaming System
-- Add these tables to support real-time multiplayer games

USE caloria_db;

-- Game Rooms Table
CREATE TABLE IF NOT EXISTS game_rooms (
    id VARCHAR(36) PRIMARY KEY, -- UUID for unique room identification
    room_code VARCHAR(6) UNIQUE NOT NULL, -- 6-character room code (e.g., "ABC123")
    game_type ENUM('quiz', 'guess', 'math', 'word') NOT NULL,
    game_mode ENUM('quick', 'friend', 'tournament') NOT NULL,
    host_user_id INT NOT NULL,
    host_name VARCHAR(100) NOT NULL,
    max_players INT DEFAULT 4,
    current_players INT DEFAULT 1,
    status ENUM('waiting', 'playing', 'finished') DEFAULT 'waiting',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,
    finished_at TIMESTAMP NULL,
    FOREIGN KEY (host_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Game Players Table (tracks who's in which room)
CREATE TABLE IF NOT EXISTS game_players (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id VARCHAR(36) NOT NULL,
    user_id INT NOT NULL,
    player_name VARCHAR(100) NOT NULL,
    is_host BOOLEAN DEFAULT FALSE,
    score INT DEFAULT 0,
    is_ready BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP NULL,
    FOREIGN KEY (room_id) REFERENCES game_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_room (room_id, user_id)
);

-- Game Sessions Table (tracks individual game instances)
CREATE TABLE IF NOT EXISTS game_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id VARCHAR(36) NOT NULL,
    game_data JSON, -- Stores game-specific data (questions, problems, etc.)
    round_number INT DEFAULT 1,
    current_question INT DEFAULT 0,
    time_limit INT DEFAULT 30, -- seconds per question/round
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP NULL,
    winner_user_id INT NULL,
    FOREIGN KEY (room_id) REFERENCES game_rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (winner_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Game Scores Table (tracks individual player scores per game)
CREATE TABLE IF NOT EXISTS game_scores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    user_id INT NOT NULL,
    player_name VARCHAR(100) NOT NULL,
    final_score INT NOT NULL,
    xp_earned INT DEFAULT 0,
    rank_position INT NOT NULL, -- 1st, 2nd, 3rd, etc.
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Game Statistics Table (overall player stats)
CREATE TABLE IF NOT EXISTS game_statistics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    game_type ENUM('quiz', 'guess', 'math', 'word') NOT NULL,
    games_played INT DEFAULT 0,
    games_won INT DEFAULT 0,
    total_score INT DEFAULT 0,
    best_score INT DEFAULT 0,
    total_xp_earned INT DEFAULT 0,
    average_rank DECIMAL(3,2) DEFAULT 0,
    last_played TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_game_type (user_id, game_type)
);

-- Rewards Shop Table (XP rewards that players can purchase)
CREATE TABLE IF NOT EXISTS rewards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(100) NOT NULL,
    category ENUM('avatar', 'theme', 'badge', 'feature', 'discount') NOT NULL,
    xp_cost INT NOT NULL,
    reward_data JSON, -- Stores reward-specific data
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User Rewards Table (tracks which rewards users have purchased)
CREATE TABLE IF NOT EXISTS user_rewards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    reward_id INT NOT NULL,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT FALSE, -- For themes, avatars that can be activated/deactivated
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reward_id) REFERENCES rewards(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_reward (user_id, reward_id)
);

-- Daily Bonuses Table (tracks daily XP bonus claims)
CREATE TABLE IF NOT EXISTS daily_bonuses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    xp_awarded INT NOT NULL,
    streak_days INT DEFAULT 1,
    claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, date)
);

-- Indexes for better performance
CREATE INDEX idx_game_rooms_room_code ON game_rooms(room_code);
CREATE INDEX idx_game_rooms_status ON game_rooms(status);
CREATE INDEX idx_game_rooms_game_type ON game_rooms(game_type);
CREATE INDEX idx_game_rooms_created_at ON game_rooms(created_at);

CREATE INDEX idx_game_players_room_id ON game_players(room_id);
CREATE INDEX idx_game_players_user_id ON game_players(user_id);
CREATE INDEX idx_game_players_joined_at ON game_players(joined_at);

CREATE INDEX idx_game_sessions_room_id ON game_sessions(room_id);
CREATE INDEX idx_game_sessions_started_at ON game_sessions(started_at);

CREATE INDEX idx_game_scores_session_id ON game_scores(session_id);
CREATE INDEX idx_game_scores_user_id ON game_scores(user_id);
CREATE INDEX idx_game_scores_final_score ON game_scores(final_score);

CREATE INDEX idx_game_statistics_user_id ON game_statistics(user_id);
CREATE INDEX idx_game_statistics_game_type ON game_statistics(game_type);
CREATE INDEX idx_game_statistics_games_won ON game_statistics(games_won);

CREATE INDEX idx_rewards_category ON rewards(category);
CREATE INDEX idx_rewards_is_active ON rewards(is_active);

CREATE INDEX idx_user_rewards_user_id ON user_rewards(user_id);
CREATE INDEX idx_user_rewards_reward_id ON user_rewards(reward_id);

CREATE INDEX idx_daily_bonuses_user_id ON daily_bonuses(user_id);
CREATE INDEX idx_daily_bonuses_date ON daily_bonuses(date);

-- Insert some sample rewards
INSERT INTO rewards (name, description, icon, category, xp_cost, reward_data) VALUES
('Bronz Rozet', 'İlk oyununu tamamladığın için bronz rozet', 'bronze', 'badge', 50, '{"color": "#CD7F32", "level": 1}'),
('Gümüş Rozet', '10 oyun tamamladığın için gümüş rozet', 'silver', 'badge', 150, '{"color": "#C0C0C0", "level": 2}'),
('Altın Rozet', '50 oyun tamamladığın için altın rozet', 'gold', 'badge', 500, '{"color": "#FFD700", "level": 3}'),
('Karanlık Tema', 'Gözlerini koruyacak karanlık tema', 'moon', 'theme', 100, '{"theme_name": "dark", "colors": {"primary": "#1a1a1a", "secondary": "#2d2d2d"}}'),
('Su Avatarı', 'Mavi su damlası avatar', 'water', 'avatar', 75, '{"avatar_url": "/avatars/water.png", "color": "#4A90E2"}'),
('Elma Avatarı', 'Sağlıklı yeşil elma avatar', 'apple', 'avatar', 75, '{"avatar_url": "/avatars/apple.png", "color": "#8CC152"}'),
('Ateş Avatarı', 'Enerjik ateş avatar', 'fire', 'avatar', 100, '{"avatar_url": "/avatars/fire.png", "color": "#FF6B6B"}'),
('Premium Özellik', 'Gelişmiş istatistikler ve analizler', 'star', 'feature', 300, '{"features": ["advanced_stats", "detailed_analytics", "custom_reports"]}'),
('%20 XP Bonusu', 'Bir hafta boyunca %20 fazla XP kazan', 'diamond', 'feature', 200, '{"bonus_percentage": 20, "duration_days": 7}'),
('Mağaza İndirimi', 'Sonraki alışverişinde %15 indirim', 'crown', 'discount', 150, '{"discount_percentage": 15, "valid_days": 30}'); 