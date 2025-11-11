"""
API Update Guide for Multi-Language Rewards

After running the SQL migration, update your API endpoints to handle JSON fields.
"""

# Example: Update rewards endpoint in app.py

# BEFORE:
"""
@app.route('/api/rewards/shop', methods=['GET'])
def get_rewards_shop():
    cursor.execute('''
        SELECT id, name, description, category, icon, xp_cost
        FROM rewards
        WHERE is_active = TRUE
    ''')
    rewards = cursor.fetchall()
    return jsonify({'rewards': rewards})
"""

# AFTER:
"""
@app.route('/api/rewards/shop', methods=['GET'])
def get_rewards_shop():
    cursor.execute('''
        SELECT id, name, description, category, icon, xp_cost
        FROM rewards
        WHERE is_active = TRUE
    ''')
    rewards = cursor.fetchall()
    
    # Parse JSON fields
    for reward in rewards:
        if isinstance(reward['name'], str):
            try:
                reward['name'] = json.loads(reward['name'])
            except:
                # Fallback for non-JSON data
                reward['name'] = {'tr': reward['name'], 'en': reward['name']}
        
        if isinstance(reward['description'], str):
            try:
                reward['description'] = json.loads(reward['description'])
            except:
                reward['description'] = {'tr': reward['description'], 'en': reward['description']}
    
    return jsonify({'rewards': rewards})
"""

# Frontend Usage:
"""
// In React Native component
const { language } = useLanguage(); // 'tr' or 'en'

// Display reward name
<Text>{reward.name[language] || reward.name.tr}</Text>

// Display reward description
<Text>{reward.description[language] || reward.description.tr}</Text>
"""

print("API update guide created successfully!")
print("\nSteps to implement:")
print("1. Run the SQL migration: python-backend/migrations/add_multilanguage_rewards.sql")
print("2. Update app.py to parse JSON fields (see examples above)")
print("3. Test the API endpoints")
print("4. Frontend will automatically use the correct language")
