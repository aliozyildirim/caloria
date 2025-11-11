-- Multi-Language Support for Diet Plans
-- This migration converts name and description columns to JSON format
-- to support multiple languages (Turkish and English)

-- Step 1: Create a backup table (optional but recommended)
CREATE TABLE IF NOT EXISTS diet_plans_backup AS SELECT * FROM diet_plans;

-- Step 2: Add temporary columns for JSON data
ALTER TABLE diet_plans 
  ADD COLUMN name_json JSON AFTER name,
  ADD COLUMN description_json JSON AFTER description;

-- Step 3: Migrate existing Turkish data to JSON format
UPDATE diet_plans SET 
  name_json = JSON_OBJECT('tr', name, 'en', name),
  description_json = JSON_OBJECT('tr', description, 'en', description);

-- Step 4: Example translations for common diet plans
-- Ketogenic Diet
UPDATE diet_plans SET 
  name_json = JSON_OBJECT('tr', 'Ketojenik Diyet', 'en', 'Ketogenic Diet'),
  description_json = JSON_OBJECT(
    'tr', 'Düşük karbonhidrat, yüksek yağ içeren diyet planı',
    'en', 'Low carb, high fat diet plan'
  )
WHERE name = 'Ketojenik Diyet';

-- Mediterranean Diet
UPDATE diet_plans SET 
  name_json = JSON_OBJECT('tr', 'Akdeniz Diyeti', 'en', 'Mediterranean Diet'),
  description_json = JSON_OBJECT(
    'tr', 'Zeytinyağı, balık ve sebze ağırlıklı sağlıklı beslenme',
    'en', 'Healthy eating with olive oil, fish and vegetables'
  )
WHERE name = 'Akdeniz Diyeti';

-- Vegan Diet
UPDATE diet_plans SET 
  name_json = JSON_OBJECT('tr', 'Vegan Diyet', 'en', 'Vegan Diet'),
  description_json = JSON_OBJECT(
    'tr', 'Tamamen bitkisel beslenme programı',
    'en', 'Completely plant-based nutrition program'
  )
WHERE name = 'Vegan Diyet';

-- Vegetarian Diet
UPDATE diet_plans SET 
  name_json = JSON_OBJECT('tr', 'Vejetaryen Diyet', 'en', 'Vegetarian Diet'),
  description_json = JSON_OBJECT(
    'tr', 'Et içermeyen dengeli beslenme',
    'en', 'Balanced nutrition without meat'
  )
WHERE name = 'Vejetaryen Diyet';

-- Paleo Diet
UPDATE diet_plans SET 
  name_json = JSON_OBJECT('tr', 'Paleo Diyet', 'en', 'Paleo Diet'),
  description_json = JSON_OBJECT(
    'tr', 'İşlenmemiş, doğal gıdalarla beslenme',
    'en', 'Eating with unprocessed, natural foods'
  )
WHERE name = 'Paleo Diyet';

-- Intermittent Fasting
UPDATE diet_plans SET 
  name_json = JSON_OBJECT('tr', 'Aralıklı Oruç', 'en', 'Intermittent Fasting'),
  description_json = JSON_OBJECT(
    'tr', 'Belirli saatlerde yemek yeme programı',
    'en', 'Eating program at specific hours'
  )
WHERE name = 'Aralıklı Oruç';

-- Low Carb Diet
UPDATE diet_plans SET 
  name_json = JSON_OBJECT('tr', 'Düşük Karbonhidrat Diyeti', 'en', 'Low Carb Diet'),
  description_json = JSON_OBJECT(
    'tr', 'Karbonhidrat alımını azaltan diyet',
    'en', 'Diet that reduces carbohydrate intake'
  )
WHERE name = 'Düşük Karbonhidrat Diyeti';

-- High Protein Diet
UPDATE diet_plans SET 
  name_json = JSON_OBJECT('tr', 'Yüksek Protein Diyeti', 'en', 'High Protein Diet'),
  description_json = JSON_OBJECT(
    'tr', 'Protein ağırlıklı beslenme programı',
    'en', 'Protein-focused nutrition program'
  )
WHERE name = 'Yüksek Protein Diyeti';

-- Balanced Diet
UPDATE diet_plans SET 
  name_json = JSON_OBJECT('tr', 'Dengeli Beslenme', 'en', 'Balanced Diet'),
  description_json = JSON_OBJECT(
    'tr', 'Tüm besin gruplarını içeren dengeli plan',
    'en', 'Balanced plan including all food groups'
  )
WHERE name = 'Dengeli Beslenme';

-- Weight Loss Diet
UPDATE diet_plans SET 
  name_json = JSON_OBJECT('tr', 'Kilo Verme Diyeti', 'en', 'Weight Loss Diet'),
  description_json = JSON_OBJECT(
    'tr', 'Sağlıklı kilo kaybı için özel plan',
    'en', 'Special plan for healthy weight loss'
  )
WHERE name = 'Kilo Verme Diyeti';

-- Step 5: Drop old columns and rename JSON columns
ALTER TABLE diet_plans 
  DROP COLUMN name,
  DROP COLUMN description;

ALTER TABLE diet_plans 
  CHANGE COLUMN name_json name JSON,
  CHANGE COLUMN description_json description JSON;

-- Step 6: Verify the migration
SELECT id, name, description, duration, daily_calories FROM diet_plans LIMIT 5;

-- Note: If you need to rollback, use the backup table:
-- DROP TABLE diet_plans;
-- CREATE TABLE diet_plans AS SELECT * FROM diet_plans_backup;
-- DROP TABLE diet_plans_backup;
