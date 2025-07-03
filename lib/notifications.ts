import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import ApiService from './api';

// Notification handler configuration
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  // Request permissions and get token
  static async requestPermissions(): Promise<string | null> {
    try {
      if (!Device.isDevice) {
        console.log('Must use physical device for Push Notifications');
        return null;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return null;
      }

      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;

      console.log('📱 Push token received:', token?.substring(0, 20) + '...');

      // Register token with backend
      try {
        const deviceType = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
        await ApiService.registerPushToken(token, deviceType);
        console.log('✅ Push token registered with backend');
      } catch (error) {
        console.error('❌ Failed to register push token with backend:', error);
        // Continue anyway, local notifications will still work
      }

      if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
        });
      }

      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  // Schedule water reminder notifications
  static async scheduleWaterReminders(reminderHours: number[], enabled: boolean = true) {
    try {
      // Cancel all existing water reminder notifications
      await this.cancelWaterReminders();

      if (!enabled || reminderHours.length === 0) {
        console.log('Water reminders disabled or no hours selected');
        return;
      }

      const waterMessages = [
        "💧 Su içme zamanı! Vücudunuz teşekkür edecek",
        "🌊 Hidrasyon çok önemli! Bir bardak su için",
        "💦 Su seviyenizi kontrol edin - sağlık için su!",
        "🏃‍♂️ Aktif kalmak için bol su içmeyi unutmayın",
        "✨ Cildiniz için en doğal bakım: Su!",
        "🧠 Beyin fonksiyonları için su şart!",
        "💪 Kas performansı için hidrasyonu ihmal etmeyin"
      ];

      const scheduledNotifications = [];

      for (const hour of reminderHours) {
        // Schedule daily repeating notification for each hour
        const trigger: Notifications.DailyTriggerInput = {
          hour: hour,
          minute: 0,
          repeats: true,
        };

        const notificationId = await Notifications.scheduleNotificationAsync({
          content: {
            title: "💧 Caloria - Su Hatırlatıcısı",
            body: waterMessages[Math.floor(Math.random() * waterMessages.length)],
            sound: 'default',
            badge: 1,
            data: { 
              type: 'water_reminder',
              hour: hour,
              timestamp: Date.now()
            },
          },
          trigger,
          identifier: `water_reminder_${hour}`,
        });

        scheduledNotifications.push({
          id: notificationId,
          hour: hour,
        });

        console.log(`💧 Scheduled water reminder for ${hour}:00 with ID: ${notificationId}`);
      }

      console.log(`✅ Scheduled ${scheduledNotifications.length} water reminder notifications`);
      return scheduledNotifications;
    } catch (error) {
      console.error('Error scheduling water reminders:', error);
      return [];
    }
  }

  // Cancel all water reminder notifications
  static async cancelWaterReminders() {
    try {
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      const waterReminderIds = scheduledNotifications
        .filter(notification => 
          notification.identifier.startsWith('water_reminder_') ||
          notification.content.data?.type === 'water_reminder'
        )
        .map(notification => notification.identifier);

      if (waterReminderIds.length > 0) {
        // Cancel each notification individually
        for (const id of waterReminderIds) {
          await Notifications.cancelScheduledNotificationAsync(id);
        }
        console.log(`🗑️ Cancelled ${waterReminderIds.length} water reminder notifications`);
      }
    } catch (error) {
      console.error('Error cancelling water reminders:', error);
    }
  }

  // Send immediate water reminder (for testing)
  static async sendImmediateWaterReminder() {
    try {
      console.log('🧪 Sending immediate test notification...');
      
      // Increment badge count
      const badgeCount = await this.incrementBadge();
      
      // Send local notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: "🔔 Caloria - Test Bildirimi",
          body: "💧 Test hatırlatması! Su içme zamanı geldi! 🌊",
          sound: 'default',
          badge: badgeCount,
          data: { 
            type: 'water_reminder_test',
            timestamp: Date.now()
          },
        },
        trigger: { seconds: 2 }, // 2 saniye sonra
      });

      console.log(`🔔 Local test notification scheduled with ID: ${notificationId}, badge: ${badgeCount}`);

      // Also log to backend
      try {
        await ApiService.sendTestNotification(
          "Caloria - Test Bildirimi 🔔",
          "💧 Test hatırlatması! Su içme zamanı geldi! 🌊"
        );
        console.log('✅ Test notification logged to backend');
      } catch (backendError) {
        console.error('❌ Failed to log test notification to backend:', backendError);
        // Continue anyway, local notification will still work
      }

      return notificationId;
    } catch (error) {
      console.error('Error sending immediate water reminder:', error);
      return null;
    }
  }

  // Get all scheduled notifications (for debugging)
  static async getScheduledNotifications() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('📋 Scheduled notifications:', notifications);
      return notifications;
    } catch (error) {
      console.error('Error getting scheduled notifications:', error);
      return [];
    }
  }

  // Handle notification received while app is running
  static addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  // Handle notification tapped
  static addNotificationResponseReceivedListener(callback: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  // Badge management
  static async setBadgeCount(count: number) {
    try {
      await Notifications.setBadgeCountAsync(count);
      console.log(`🔔 Badge count set to: ${count}`);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  static async getBadgeCount(): Promise<number> {
    try {
      const count = await Notifications.getBadgeCountAsync();
      console.log(`🔔 Current badge count: ${count}`);
      return count;
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  static async clearBadge() {
    try {
      await Notifications.setBadgeCountAsync(0);
      console.log('🔔 Badge cleared');
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  }

  static async incrementBadge() {
    try {
      const currentCount = await this.getBadgeCount();
      const newCount = currentCount + 1;
      await this.setBadgeCount(newCount);
      return newCount;
    } catch (error) {
      console.error('Error incrementing badge:', error);
      return 0;
    }
  }
}

export default NotificationService; 