const axios = require('axios');

// Test için XP ekleme script'i
async function addXpToUser() {
  try {
    // 1. Önce login ol (token al)
    const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'test@test.com',  // Buraya var olan email koy
      password: 'test123'       // Buraya şifreyi koy
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login başarılı, token alındı');
    
    // 2. XP ekle
    const addXpResponse = await axios.post('http://localhost:3000/api/admin/add-xp', {
      targetUserId: 1,  // Hedef kullanıcı ID
      amount: 2000,     // Eklenecek XP miktarı
      source: 'test_bonus',
      description: 'Test için XP eklendi'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ XP Eklendi:', addXpResponse.data);
    
    // 3. Kullanıcı profilini kontrol et
    const profileResponse = await axios.get('http://localhost:3000/api/user/profile', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📊 Güncel Profil:', {
      total_xp: profileResponse.data.total_xp,
      level: profileResponse.data.level
    });
    
  } catch (error) {
    console.error('❌ Hata:', error.response?.data || error.message);
  }
}

// Script'i çalıştır
addXpToUser(); 