import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  type: 'meal' | 'achievement' | 'reminder' | 'social';
  isRead: boolean;
}

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    title: 'Yemek Zamanı! 🍽️',
    message: 'Öğle yemeği vakti geldi. Sağlıklı bir seçim yapmayı unutma!',
    time: '2 saat önce',
    type: 'meal',
    isRead: false,
  },
  {
    id: 2,
    title: 'Tebrikler! 🎉',
    message: '7 günlük takip serisi tamamlandı! Harika gidiyorsun.',
    time: '1 gün önce',
    type: 'achievement',
    isRead: false,
  },
  {
    id: 3,
    title: 'Su İçmeyi Unutma 💧',
    message: 'Bugün sadece 2 bardak su içtin. Hedefin 8 bardak!',
    time: '3 saat önce',
    type: 'reminder',
    isRead: true,
  },
  {
    id: 4,
    title: 'Ayşe seni takip etmeye başladı',
    message: 'Ayşe profilini beğendi ve seni takip etmeye başladı.',
    time: '5 saat önce',
    type: 'social',
    isRead: true,
  },
];

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [mealReminders, setMealReminders] = useState(true);
  const [socialNotifications, setSocialNotifications] = useState(true);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'meal': return 'restaurant';
      case 'achievement': return 'trophy';
      case 'reminder': return 'alarm';
      case 'social': return 'people';
      default: return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'meal': return '#4CAF50';
      case 'achievement': return '#FFD700';
      case 'reminder': return '#42A5F5';
      case 'social': return '#FF6B6B';
      default: return '#666';
    }
  };

  const markAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, isRead: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, isRead: true }))
    );
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Bildirimler</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={styles.markAllButton}
          onPress={markAllAsRead}
        >
          <Text style={styles.markAllText}>Tümünü Oku</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Bildirim Ayarları</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="notifications" size={20} color="#4CAF50" />
                <Text style={styles.settingLabel}>Push Bildirimleri</Text>
              </View>
              <Switch
                value={pushEnabled}
                onValueChange={setPushEnabled}
                trackColor={{ false: '#ccc', true: '#4CAF50' }}
                thumbColor={pushEnabled ? '#fff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="restaurant" size={20} color="#FF6B6B" />
                <Text style={styles.settingLabel}>Yemek Hatırlatmaları</Text>
              </View>
              <Switch
                value={mealReminders}
                onValueChange={setMealReminders}
                trackColor={{ false: '#ccc', true: '#4CAF50' }}
                thumbColor={mealReminders ? '#fff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="people" size={20} color="#42A5F5" />
                <Text style={styles.settingLabel}>Sosyal Bildirimler</Text>
              </View>
              <Switch
                value={socialNotifications}
                onValueChange={setSocialNotifications}
                trackColor={{ false: '#ccc', true: '#4CAF50' }}
                thumbColor={socialNotifications ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>
        </View>

        {/* Notifications List */}
        <View style={styles.notificationsSection}>
          <Text style={styles.sectionTitle}>Son Bildirimler</Text>
          {notifications.map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[styles.notificationCard, !notification.isRead && styles.unreadCard]}
              onPress={() => markAsRead(notification.id)}
            >
              <View style={styles.notificationLeft}>
                <View style={[styles.notificationIcon, { backgroundColor: `${getNotificationColor(notification.type)}20` }]}>
                  <Ionicons 
                    name={getNotificationIcon(notification.type) as any} 
                    size={20} 
                    color={getNotificationColor(notification.type)} 
                  />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={[styles.notificationTitle, !notification.isRead && styles.unreadTitle]}>
                    {notification.title}
                  </Text>
                  <Text style={styles.notificationMessage}>
                    {notification.message}
                  </Text>
                  <Text style={styles.notificationTime}>
                    {notification.time}
                  </Text>
                </View>
              </View>
              {!notification.isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))}
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
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  unreadBadge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  unreadText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  markAllText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  settingsSection: {
    padding: 20,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  settingsCard: {
    backgroundColor: '#fff',
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
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  notificationsSection: {
    padding: 20,
    paddingTop: 10,
  },
  notificationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  unreadCard: {
    backgroundColor: '#F8FFF8',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  notificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  unreadTitle: {
    color: '#4CAF50',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
}); 