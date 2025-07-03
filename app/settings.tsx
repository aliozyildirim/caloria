import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Share,
  Linking,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import ApiService, { UserProfile } from '../lib/api';
import AuthService from '../lib/auth';

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showArrow?: boolean;
  rightComponent?: React.ReactNode;
  color?: string;
}

const SettingItem = ({ icon, title, subtitle, onPress, showArrow = true, rightComponent, color = '#666' }: SettingItemProps) => (
  <TouchableOpacity style={styles.settingItem} onPress={onPress} disabled={!onPress}>
    <View style={styles.settingLeft}>
      <View style={[styles.settingIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.settingText}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
      </View>
    </View>
    {rightComponent || (showArrow && <Ionicons name="chevron-forward" size={20} color="#ccc" />)}
  </TouchableOpacity>
);

export default function SettingsScreen() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [autoBackup, setAutoBackup] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const profile = await ApiService.getUserProfile();
      setUser(profile);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const handleEditProfile = () => {
    router.push('/edit-profile');
  };

  const handleNotifications = () => {
    router.push('/notification-settings');
  };

  const handlePrivacy = () => {
    router.push('/privacy-settings');
  };

  const handleDataExport = () => {
    Alert.alert(
      'Veri Dışa Aktarımı',
      'Tüm verilerinizi JSON formatında dışa aktarmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Dışa Aktar', onPress: exportData }
      ]
    );
  };

  const exportData = () => {
    // Mock data export functionality
    Alert.alert('Başarılı', 'Verileriniz başarıyla dışa aktarıldı ve Downloads klasörüne kaydedildi.');
  };

  const handleDataClear = () => {
    Alert.alert(
      '⚠️ Tehlikeli İşlem',
      'Tüm verileriniz kalıcı olarak silinecektir. Bu işlem geri alınamaz!',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: clearAllData }
      ]
    );
  };

  const clearAllData = () => {
    // Mock data clearing functionality
    Alert.alert('Başarılı', 'Tüm verileriniz başarıyla silindi.');
  };

  const handleRateApp = () => {
    // Mock app rating functionality
    Alert.alert('Teşekkürler!', 'App Store\'a yönlendiriliyorsunuz...');
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        message: 'Caloria uygulamasını keşfet! Sağlıklı beslenme ve kalori takibi için mükemmel bir uygulama. 🥗',
        url: 'https://caloria-app.com'
      });
    } catch (error) {
      console.error('Error sharing app:', error);
    }
  };

  const handleFeedback = () => {
    const email = 'support@caloria-app.com';
    const subject = 'Caloria App Feedback';
    const body = 'Merhaba Caloria ekibi,\n\nUygulama hakkında geri bildirimim:\n\n';
    
    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  const handleSupport = () => {
    router.push('/support');
  };

  const handleAbout = () => {
    router.push('/about');
  };

  const handleTerms = () => {
    Linking.openURL('https://caloria-app.com/terms');
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL('https://caloria-app.com/privacy');
  };

  const handleAdminPanel = () => {
    router.push('/admin');
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Çıkış Yap', style: 'destructive', onPress: confirmLogout }
      ]
    );
  };

  const confirmLogout = async () => {
    try {
      await AuthService.logout();
      // AuthService otomatik olarak auth ekranına yönlendirecek
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Hata', 'Çıkış yapılırken hata oluştu');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Ayarlar</Text>
          <View style={styles.placeholder} />
        </View>

        {/* User Profile Section */}
        {user && (
          <View style={styles.profileSection}>
            <LinearGradient
              colors={['#4CAF50', '#45a049']}
              style={styles.profileGradient}
            >
              <View style={styles.profileInfo}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileInitial}>
                    {user.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.profileDetails}>
                  <Text style={styles.profileName}>{user.name}</Text>
                  <Text style={styles.profileEmail}>{user.age} yaşında • {user.gender === 'male' ? 'Erkek' : 'Kadın'}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
                <Ionicons name="pencil" size={16} color="#4CAF50" />
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {/* App Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uygulama Tercihleri</Text>
          <View style={styles.settingsGroup}>
            <SettingItem
              icon="notifications"
              title="Bildirimler"
              subtitle="Push bildirimleri ve hatırlatmalar"
              onPress={handleNotifications}
              color="#FF6B6B"
            />
            <SettingItem
              icon="moon"
              title="Karanlık Mod"
              subtitle="Göz dostu karanlık tema"
              showArrow={false}
              rightComponent={
                <Switch
                  value={darkMode}
                  onValueChange={setDarkMode}
                  trackColor={{ false: '#ccc', true: '#4CAF50' }}
                  thumbColor={darkMode ? '#fff' : '#f4f3f4'}
                />
              }
              color="#9C27B0"
            />
            <SettingItem
              icon="language"
              title="Dil"
              subtitle="Türkçe"
              onPress={() => Alert.alert('Dil Seçimi', 'Yakında daha fazla dil seçeneği!')}
              color="#2196F3"
            />
            <SettingItem
              icon="speedometer"
              title="Birimler"
              subtitle="Metrik sistem (kg, cm)"
              onPress={() => Alert.alert('Birim Ayarları', 'Birim ayarları yakında!')}
              color="#FF9800"
            />
          </View>
        </View>

        {/* Security & Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Güvenlik & Gizlilik</Text>
          <View style={styles.settingsGroup}>
            <SettingItem
              icon="finger-print"
              title="Biyometrik Kilit"
              subtitle="Parmak izi veya yüz tanıma"
              showArrow={false}
              rightComponent={
                <Switch
                  value={biometric}
                  onValueChange={setBiometric}
                  trackColor={{ false: '#ccc', true: '#4CAF50' }}
                  thumbColor={biometric ? '#fff' : '#f4f3f4'}
                />
              }
              color="#E91E63"
            />
            <SettingItem
              icon="shield-checkmark"
              title="Gizlilik Ayarları"
              subtitle="Veri paylaşımı ve gizlilik"
              onPress={handlePrivacy}
              color="#4CAF50"
            />
            <SettingItem
              icon="analytics"
              title="Analitik Verileri"
              subtitle="Uygulama geliştirme için veri paylaşımı"
              showArrow={false}
              rightComponent={
                <Switch
                  value={analytics}
                  onValueChange={setAnalytics}
                  trackColor={{ false: '#ccc', true: '#4CAF50' }}
                  thumbColor={analytics ? '#fff' : '#f4f3f4'}
                />
              }
              color="#FF5722"
            />
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Veri Yönetimi</Text>
          <View style={styles.settingsGroup}>
            <SettingItem
              icon="cloud-upload"
              title="Otomatik Yedekleme"
              subtitle="Verilerinizi bulutta yedekleyin"
              showArrow={false}
              rightComponent={
                <Switch
                  value={autoBackup}
                  onValueChange={setAutoBackup}
                  trackColor={{ false: '#ccc', true: '#4CAF50' }}
                  thumbColor={autoBackup ? '#fff' : '#f4f3f4'}
                />
              }
              color="#00BCD4"
            />
            <SettingItem
              icon="download"
              title="Veri Dışa Aktarımı"
              subtitle="Verilerinizi JSON formatında indirin"
              onPress={handleDataExport}
              color="#4CAF50"
            />
            <SettingItem
              icon="trash"
              title="Tüm Verileri Sil"
              subtitle="Kalıcı olarak tüm verilerinizi silin"
              onPress={handleDataClear}
              color="#F44336"
            />
            <SettingItem
              icon="construct"
              title="Veritabanı Yöneticisi"
              subtitle="Tüm veritabanı verilerini görüntüle"
              onPress={handleAdminPanel}
              color="#9C27B0"
            />
          </View>
        </View>

        {/* Support & Feedback */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Destek & Geri Bildirim</Text>
          <View style={styles.settingsGroup}>
            <SettingItem
              icon="star"
              title="Uygulamayı Değerlendir"
              subtitle="App Store'da puan verin"
              onPress={handleRateApp}
              color="#FFD700"
            />
            <SettingItem
              icon="share"
              title="Uygulamayı Paylaş"
              subtitle="Arkadaşlarınızla paylaşın"
              onPress={handleShareApp}
              color="#3F51B5"
            />
            <SettingItem
              icon="chatbubble"
              title="Geri Bildirim Gönder"
              subtitle="Önerilerinizi bizimle paylaşın"
              onPress={handleFeedback}
              color="#FF6B6B"
            />
            <SettingItem
              icon="help-circle"
              title="Yardım & Destek"
              subtitle="SSS ve destek merkezi"
              onPress={handleSupport}
              color="#9C27B0"
            />
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hakkında</Text>
          <View style={styles.settingsGroup}>
            <SettingItem
              icon="information-circle"
              title="Uygulama Hakkında"
              subtitle="Sürüm 1.0.0"
              onPress={handleAbout}
              color="#607D8B"
            />
            <SettingItem
              icon="document-text"
              title="Kullanım Koşulları"
              subtitle="Hizmet şartları ve koşulları"
              onPress={handleTerms}
              color="#795548"
            />
            <SettingItem
              icon="lock-closed"
              title="Gizlilik Politikası"
              subtitle="Veri kullanımı ve gizlilik"
              onPress={handlePrivacyPolicy}
              color="#455A64"
            />
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <View style={styles.settingsGroup}>
            <SettingItem
              icon="log-out"
              title="Çıkış Yap"
              subtitle="Hesabınızdan güvenli çıkış yapın"
              onPress={handleLogout}
              color="#F44336"
              showArrow={false}
            />
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>Caloria v1.0.0</Text>
          <Text style={styles.appInfoSubtext}>Sağlıklı yaşam için tasarlandı</Text>
          <Text style={styles.appInfoCopyright}>© 2024 Caloria. Tüm hakları saklıdır.</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  profileSection: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  profileGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  editProfileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  settingsGroup: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#666',
  },
  appInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  appInfoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  appInfoSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  appInfoCopyright: {
    fontSize: 12,
    color: '#999',
  },
}); 