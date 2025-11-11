-- Multi-Language Support for Challenges
-- This migration converts title and description columns to JSON format

-- Step 1: Backup
CREATE TABLE IF NOT EXISTS challenges_backup AS SELECT * FROM challenges;

-- Step 2: Add JSON columns
ALTER TABLE challenges 
  ADD COLUMN title_json JSON AFTER title,
  ADD COLUMN description_json JSON AFTER description;

-- Step 3: Migrate data
UPDATE challenges SET 
  title_json = JSON_OBJECT('tr', title, 'en', title),
  description_json = JSON_OBJECT('tr', description, 'en', description);

-- Step 4: Example translations
UPDATE challenges SET 
  title_json = JSON_OBJECT('tr', '5 Porsiyon Sebze', 'en', '5 Servings of Vegetables'),
  description_json = JSON_OBJECT('tr', 'Bugün 5 porsiyon sebze tüketin', 'en', 'Consume 5 servings of vegetables today')
WHERE title = '5 Porsiyon Sebze';

UPDATE challenges SET 
  title_json = JSON_OBJECT('tr', '8 Bardak Su', 'en', '8 Glasses of Water'),
  description_json = JSON_OBJECT('tr', 'Günde 8 bardak su için', 'en', 'Drink 8 glasses of water per day')
WHERE title = '8 Bardak Su';

UPDATE challenges SET 
  title_json = JSON_OBJECT('tr', '30 Dakika Egzersiz', 'en', '30 Minutes Exercise'),
  description_json = JSON_OBJECT('tr', '30 dakika fiziksel aktivite yapın', 'en', 'Do 30 minutes of physical activity')
WHERE title = '30 Dakika Egzersiz';

-- Step 5: Replace columns
ALTER TABLE challenges 
  DROP COLUMN title,
  DROP COLUMN description;

ALTER TABLE challenges 
  CHANGE COLUMN title_json title JSON,
  CHANGE COLUMN description_json description JSON;

-- Verify
SELECT id, title, description, xp_reward FROM challenges LIMIT 5;
