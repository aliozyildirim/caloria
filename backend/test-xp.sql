-- XP Yükleme Test Sorguları
-- Kullanıcı ID'sini kontrol et
SELECT id, username, full_name FROM users LIMIT 5;

-- Mevcut XP'yi kontrol et
SELECT user_id, total_xp, level FROM user_profiles WHERE user_id = 3;

-- 1000 XP ekle (user_id = 1 için)
UPDATE user_profiles 
SET total_xp = total_xp + 1000,
    level = CASE WHEN (total_xp + 1000) >= level * 100 THEN level + 1 ELSE level END
WHERE user_id = 3;

-- XP işlemini kaydet   
INSERT INTO xp_transactions (user_id, amount, source, description) 
VALUES (3, 1000, 'manual_bonus', 'Test için manuel XP eklendi');

-- Sonucu kontrol et
SELECT user_id, total_xp, level FROM user_profiles WHERE user_id = 3;
SELECT * FROM xp_transactions WHERE user_id = 3 ORDER BY created_at DESC LIMIT 3; 