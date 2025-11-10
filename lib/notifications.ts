import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import ApiService from './api';

// Bildirim davranışını ayarla
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  private static instance: NotificationService;
  private expoPushToken: string | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize() {
    try {
      // İzin iste
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('❌ Bildirim izni verilmedi');
        return null;
      }

      // Push token al
      if (Device.isDevice) {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: 'b1cb57ea-8028-48fe-8715-2714bcebc70c',
        });
        this.expoPushToken = token.data;
        console.log('✅ Push Token:', this.expoPushToken);

        // Token'ı backend'e kaydet
        try {
          await ApiService.registerPushToken(this.expoPushToken);
          console.log('✅ Push token backend\'e kaydedildi');
        } catch (error) {
          console.error('❌ Push token kaydedilemedi:', error);
        }

        return this.expoPushToken;
      } else {
        console.log('⚠️ Fiziksel cihaz gerekli');
        return null;
      }
    } catch (error) {
      console.error('❌ Notification initialization error:', error);
      return null;
    }
  }

  // Android için notification channel oluştur
  async setupAndroidChannel() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Varsayılan',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      // Su hatırlatıcısı için özel kanal
      await Notifications.setNotificationChannelAsync('water-reminder', {
        name: 'Su Hatırlatıcısı',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#00BCD4',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      // Yemek hatırlatıcısı için özel kanal
      await Notifications.setNotificationChannelAsync('meal-reminder', {
        name: 'Yemek Hatırlatıcısı',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4CAF50',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });

      console.log('✅ Android notification channels oluşturuldu');
    }
  }

  // Yerel bildirim gönder (test için)
  async sendLocalNotification(title: string, body: string, data?: any) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: true,
          badge: 1,
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Hemen gönder
      });
      console.log('✅ Yerel bildirim gönderildi');
    } catch (error) {
      console.error('❌ Yerel bildirim gönderilemedi:', error);
    }
  }

  // Su hatırlatıcısı planla
  async scheduleWaterReminder(hour: number, minute: number) {
    try {
      const trigger: Notifications.DailyTriggerInput = {
        hour,
        minute,
        repeats: true,
      };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💧 Su İçme Zamanı!',
          body: 'Günlük su hedefinize ulaşmak için bir bardak su içmeyi unutmayın.',
          data: { type: 'water-reminder' },
          sound: true,
          badge: 1,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: 'water-reminder',
        },
        trigger,
      });

      console.log(`✅ Su hatırlatıcısı planlandı: ${hour}:${minute}`);
    } catch (error) {
      console.error('❌ Su hatırlatıcısı planlanamadı:', error);
    }
  }

  // Birden fazla su hatırlatıcısı planla
  async scheduleWaterReminders(hours: number[], clearExisting: boolean = true) {
    try {
      if (clearExisting) {
        await this.cancelWaterReminders();
      }

      for (const hour of hours) {
        await this.scheduleWaterReminder(hour, 0);
      }

      console.log(`✅ ${hours.length} su hatırlatıcısı planlandı`);
    } catch (error) {
      console.error('❌ Su hatırlatıcıları planlanamadı:', error);
    }
  }

  // Tüm su hatırlatıcılarını iptal et
  async cancelWaterReminders() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      for (const notification of notifications) {
        if (notification.content.data?.type === 'water-reminder') {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
      console.log('✅ Tüm su hatırlatıcıları iptal edildi');
    } catch (error) {
      console.error('❌ Su hatırlatıcıları iptal edilemedi:', error);
    }
  }

  // Eski isim için alias (geriye uyumluluk)
  async cancelAllWaterReminders() {
    return this.cancelWaterReminders();
  }

  // Yemek hatırlatıcısı planla
  async scheduleMealReminder(mealType: string, hour: number, minute: number) {
    try {
      const mealNames: { [key: string]: string } = {
        breakfast: 'Kahvaltı',
        lunch: 'Öğle Yemeği',
        dinner: 'Akşam Yemeği',
        snack: 'Atıştırmalık',
      };

      const trigger: Notifications.DailyTriggerInput = {
        hour,
        minute,
        repeats: true,
      };

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🍽️ ${mealNames[mealType] || 'Yemek'} Zamanı!`,
          body: 'Günlük yemek planınızı kontrol edin ve öğününüzü kaydetmeyi unutmayın.',
          data: { type: 'meal-reminder', mealType },
          sound: true,
          badge: 1,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: 'meal-reminder',
        },
        trigger,
      });

      console.log(`✅ ${mealNames[mealType]} hatırlatıcısı planlandı: ${hour}:${minute}`);
    } catch (error) {
      console.error('❌ Yemek hatırlatıcısı planlanamadı:', error);
    }
  }

  // Badge sayısını ayarla
  async setBadgeCount(count: number) {
    try {
      await Notifications.setBadgeCountAsync(count);
      console.log(`✅ Badge count: ${count}`);
    } catch (error) {
      console.error('❌ Badge count ayarlanamadı:', error);
    }
  }

  // Badge sayısını temizle
  async clearBadge() {
    try {
      await Notifications.setBadgeCountAsync(0);
      console.log('✅ Badge temizlendi');
    } catch (error) {
      console.error('❌ Badge temizlenemedi:', error);
    }
  }

  // Tüm bildirimleri temizle
  async clearAllNotifications() {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await this.clearBadge();
      console.log('✅ Tüm bildirimler temizlendi');
    } catch (error) {
      console.error('❌ Bildirimler temizlenemedi:', error);
    }
  }

  // Planlı bildirimleri listele (debug için)
  async listScheduledNotifications() {
    try {
      const notifications = await Notifications.getAllScheduledNotificationsAsync();
      console.log('📋 Planlı bildirimler:', notifications.length);
      notifications.forEach((notification, index) => {
        console.log(`${index + 1}. ${notification.content.title} - ${notification.content.body}`);
      });
      return notifications;
    } catch (error) {
      console.error('❌ Planlı bildirimler listelenemedi:', error);
      return [];
    }
  }

  // Push token'ı al
  getExpoPushToken(): string | null {
    return this.expoPushToken;
  }
}

export default NotificationService.getInstance();
