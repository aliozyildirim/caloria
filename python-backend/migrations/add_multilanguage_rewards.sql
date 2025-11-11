-- Multi-Language Support for Rewards
-- This migration converts name and description columns to JSON format
-- to support multiple languages (Turkish and English)

-- Step 1: Create a backup table (optional but recommended)
CREATE TABLE IF NOT EXISTS rewards_backup AS SELECT * FROM rewards;

-- Step 2: Add temporary columns for JSON data
ALTER TABLE rewards 
  ADD COLUMN name_json JSON AFTER name,
  ADD COLUMN description_json JSON AFTER description;

-- Step 3: Migrate existing Turkish data to JSON format
-- Update with your actual reward data
UPDATE rewards SET 
  name_json = JSON_OBJECT('tr', name, 'en', name),
  description_json = JSON_OBJECT('tr', description, 'en', description);

-- Step 4: Example translations for common rewards
-- Avatar Rewards
UPDATE rewards SET 
  name_json = JSON_OBJECT('tr', 'Bronz Avatar Çerçevesi', 'en', 'Bronze Avatar Frame'),
  description_json = JSON_OBJECT('tr', 'Profilinize bronz çerçeve ekleyin', 'en', 'Add bronze frame to your profile')
WHERE name = 'Bronz Avatar Çerçevesi';

UPDATE rewards SET 
  name_json = JSON_OBJECT('tr', 'Gümüş Avatar Çerçevesi', 'en', 'Silver Avatar Frame'),
  description_json = JSON_OBJECT('tr', 'Profilinize gümüş çerçeve ekleyin', 'en', 'Add silver frame to your profile')
WHERE name = 'Gümüş Avatar Çerçevesi';

UPDATE rewards SET 
  name_json = JSON_OBJECT('tr', 'Altın Avatar Çerçevesi', 'en', 'Gold Avatar Frame'),
  description_json = JSON_OBJECT('tr', 'Profilinize altın çerçeve ekleyin', 'en', 'Add gold frame to your profile')
WHERE name = 'Altın Avatar Çerçevesi';

UPDATE rewards SET 
  name_json = JSON_OBJECT('tr', 'Su Avatarı', 'en', 'Water Avatar'),
  description_json = JSON_OBJECT('tr', 'Mavi su damlası avatar', 'en', 'Blue water drop avatar')
WHERE name = 'Su Avatarı';

-- Theme Rewards
UPDATE rewards SET 
  name_json = JSON_OBJECT('tr', 'Gece Teması', 'en', 'Dark Theme'),
  description_json = JSON_OBJECT('tr', 'Karanlık mod temasını aktif edin', 'en', 'Activate dark mode theme')
WHERE name = 'Gece Teması';

UPDATE rewards SET 
  name_json = JSON_OBJECT('tr', 'Okyanus Teması', 'en', 'Ocean Theme'),
  description_json = JSON_OBJECT('tr', 'Mavi okyanus temasını aktif edin', 'en', 'Activate blue ocean theme')
WHERE name = 'Okyanus Teması';

-- Badge Rewards
UPDATE rewards SET 
  name_json = JSON_OBJECT('tr', 'Sağlıklı Yaşam Rozeti', 'en', 'Healthy Life Badge'),
  description_json = JSON_OBJECT('tr', 'Sağlıklı yaşam tarzı rozeti', 'en', 'Healthy lifestyle badge')
WHERE name = 'Sağlıklı Yaşam Rozeti';

UPDATE rewards SET 
  name_json = JSON_OBJECT('tr', 'Fitness Gurusu', 'en', 'Fitness Guru'),
  description_json = JSON_OBJECT('tr', 'Fitness uzmanı rozeti', 'en', 'Fitness expert badge')
WHERE name = 'Fitness Gurusu';

-- Step 5: Drop old columns and rename JSON columns
ALTER TABLE rewards 
  DROP COLUMN name,
  DROP COLUMN description;

ALTER TABLE rewards 
  CHANGE COLUMN name_json name JSON,
  CHANGE COLUMN description_json description JSON;

-- Step 6: Verify the migration
SELECT id, name, description, category, xp_cost FROM rewards LIMIT 5;

-- Note: If you need to rollback, use the backup table:
-- DROP TABLE rewards;
-- CREATE TABLE rewards AS SELECT * FROM rewards_backup;
-- DROP TABLE rewards_backup;
