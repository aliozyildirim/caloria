import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../lib/ThemeProvider';
import ApiService from '../lib/api';
import AuthService from '../lib/auth';

export default function SettingsScreen() {
  const { theme, toggleTheme } = useTheme();
  const [notificationSettings, setNotificationSettings] = useState({
    water_reminders: true,
    meal_reminders: true,
    challenge_notifications: true,
    achievement_notifications: true,
    general_notifications: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await ApiService.getNotificationSettings();
      setNotificationSettings(settings);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleNotificationToggle = async (key: string) => {
    try {
      const newSettings = {
        ...notificationSettings,
        [key]: !notificationSettings[key as keyof typeof notificationSettings]
      };
      
      setNotificationSettings(newSettings);
      await ApiService.updateNotificationSettings(newSettings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
      Alert.alert('Hata', 'Ayarlar güncellenirken bir sorun oluştu.');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: () => {
            AuthService.logout();
            router.replace('/login');
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.primaryColor, theme.secondaryColor]}
        style={styles.backgroundGradient}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.textColor} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.textColor }]}>
              ⚙️ Ayarlar
            </Text>
          </View>

          <ScrollView style={styles.content}>
            {/* Profil Bilgileri */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textColor }]}>
                Profil
              </Text>
              <View style={[styles.card, { backgroundColor: theme.cardColor }]}>
                <View style={styles.profileHeader}>
                  <View style={styles.profileAvatar}>
                    <Text style={styles.avatarText}>
                      {AuthService.getCurrentUser()?.fullName?.[0] || 'U'}
                    </Text>
                  </View>
                  <View style={styles.profileInfo}>
                    <Text style={[styles.profileName, { color: theme.textColor }]}>
                      {AuthService.getCurrentUser()?.fullName || 'Kullanıcı'}
                    </Text>
                    <Text style={[styles.profileEmail, { color: `${theme.textColor}99` }]}>
                      {AuthService.getCurrentUser()?.email || 'user@example.com'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Uygulama Ayarları */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textColor }]}>
                Uygulama
              </Text>
              <View style={[styles.card, { backgroundColor: theme.cardColor }]}>
                <TouchableOpacity 
                  style={styles.settingItem}
                  onPress={toggleTheme}
                >
                  <View style={styles.settingLeft}>
                    <Ionicons 
                      name="moon" 
                      size={24} 
                      color={theme.textColor} 
                    />
                    <Text style={[styles.settingText, { color: theme.textColor }]}>
                      Karanlık Mod
                    </Text>
                  </View>
                  <Switch 
                    value={theme.name === 'dark'} 
                    onValueChange={toggleTheme}
                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                    thumbColor={theme.name === 'dark' ? '#f5dd4b' : '#f4f3f4'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Bildirim Ayarları */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textColor }]}>
                Bildirimler
              </Text>
              <View style={[styles.card, { backgroundColor: theme.cardColor }]}>
                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <Ionicons 
                      name="water" 
                      size={24} 
                      color={theme.textColor} 
                    />
                    <Text style={[styles.settingText, { color: theme.textColor }]}>
                      Su Hatırlatıcı
                    </Text>
                  </View>
                  <Switch 
                    value={notificationSettings.water_reminders}
                    onValueChange={() => handleNotificationToggle('water_reminders')}
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <Ionicons 
                      name="restaurant" 
                      size={24} 
                      color={theme.textColor} 
                    />
                    <Text style={[styles.settingText, { color: theme.textColor }]}>
                      Öğün Hatırlatıcı
                    </Text>
                  </View>
                  <Switch 
                    value={notificationSettings.meal_reminders}
                    onValueChange={() => handleNotificationToggle('meal_reminders')}
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <Ionicons 
                      name="trophy" 
                      size={24} 
                      color={theme.textColor} 
                    />
                    <Text style={[styles.settingText, { color: theme.textColor }]}>
                      Challenge Bildirimleri
                    </Text>
                  </View>
                  <Switch 
                    value={notificationSettings.challenge_notifications}
                    onValueChange={() => handleNotificationToggle('challenge_notifications')}
                  />
                </View>
              </View>
            </View>

            {/* Çıkış Yap */}
            <TouchableOpacity 
              style={[styles.logoutButton, { backgroundColor: '#FF6B6B' }]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out" size={24} color="white" />
              <Text style={styles.logoutText}>Çıkış Yap</Text>
            </TouchableOpacity>

            <View style={{ height: 40 }} />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  card: {
    borderRadius: 16,
    padding: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 