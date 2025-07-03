import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import ApiService from '../../lib/api';
import AuthService from '../../lib/auth';
import NotificationService from '../../lib/notifications';
import { useTheme } from '../../lib/ThemeProvider';

const { width } = Dimensions.get('window');

export default function WaterScreen() {
  const { theme } = useTheme();
  
  const [waterIntake, setWaterIntake] = useState(0);
  const [waterGoal, setWaterGoal] = useState(8);
  const [waterHistory, setWaterHistory] = useState<any[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [reminderHours, setReminderHours] = useState([9, 12, 15, 18, 21]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWaterData();
  }, []);

  const loadWaterData = async () => {
    try {
      setIsLoading(true);
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) return;

      // Load today's water intake
      const waterData = await ApiService.getTodayWaterIntake();
      setWaterIntake(waterData.glasses_count || 0);
      setWaterGoal(waterData.goal_glasses || 8);

      // Load water settings
      const waterSettings = await ApiService.getWaterSettings();
      setNotificationsEnabled(waterSettings.notifications_enabled ?? true);
      setReminderHours(waterSettings.reminder_hours ?? [9, 12, 15, 18, 21]);

      // Load water history
      const history = await ApiService.getWaterHistory(7);
      setWaterHistory(history);

    } catch (error) {
      console.error('Error loading water data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWaterIntake = async () => {
    if (waterIntake < waterGoal) {
      const newIntake = waterIntake + 1;
      setWaterIntake(newIntake);
      
      try {
        await ApiService.updateWaterIntake(newIntake);
        
        if (newIntake >= waterGoal) {
          Alert.alert('Tebrikler! 🎉', 'Günlük su hedefinizi tamamladınız! 💧');
        }
      } catch (error) {
        console.error('Error updating water intake:', error);
        setWaterIntake(waterIntake); // Revert on error
      }
    } else {
      Alert.alert('Harika! 💧', 'Günlük su hedefinizi zaten tamamladınız!');
    }
  };

  const decreaseWaterIntake = async () => {
    if (waterIntake > 0) {
      const newIntake = waterIntake - 1;
      setWaterIntake(newIntake);
      
      try {
        await ApiService.updateWaterIntake(newIntake);
      } catch (error) {
        console.error('Error updating water intake:', error);
        setWaterIntake(waterIntake); // Revert on error
      }
    }
  };

  const saveWaterSettings = async () => {
    try {
      // Save water settings
      await ApiService.updateWaterSettings({
        notifications_enabled: notificationsEnabled,
        reminder_hours: reminderHours,
        daily_goal: waterGoal
      });

      // Schedule/cancel notifications
      if (notificationsEnabled && reminderHours.length > 0) {
        await NotificationService.scheduleWaterReminders(reminderHours, true);
      } else {
        await NotificationService.cancelWaterReminders();
      }

      setShowSettings(false);
      Alert.alert('Ayarlar Kaydedildi! 💧', 'Su takibi ayarlarınız güncellendi.');
    } catch (error) {
      console.error('Error saving water settings:', error);
      Alert.alert('Hata!', 'Ayarlar kaydedilemedi.');
    }
  };

  const waterProgress = waterIntake / waterGoal;
  const progressPercentage = Math.round(waterProgress * 100);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.primaryColor, theme.secondaryColor]}
          style={styles.backgroundGradient}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingEmoji}>💧</Text>
              <Text style={[styles.loadingText, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>Su Verileri Yükleniyor...</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.primaryColor, theme.secondaryColor]}
        style={styles.backgroundGradient}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.headerTitle, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>💧 Su Takibi</Text>
              <Text style={[styles.headerSubtitle, { color: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.8)' : theme.textColor + 'CC' }]}>Günlük hidrasyon hedefiniz</Text>
            </View>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => setShowSettings(true)}
            >
              <Ionicons name="settings" size={24} color={theme.textColor === '#ffffff' ? 'white' : theme.textColor} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Main Progress Card */}
            <View style={styles.progressCard}>
              <Text style={styles.progressTitle}>Bugünkü İlerleme</Text>
              
              <View style={styles.progressContainer}>
                <View style={styles.circularProgress}>
                  <Text style={styles.progressText}>{progressPercentage}%</Text>
                  <Text style={styles.progressSubtext}>{waterIntake}/{waterGoal} bardak</Text>
                </View>
              </View>

              <Text style={styles.motivationText}>
                {waterIntake >= waterGoal 
                  ? '🎉 Harika! Günlük hedefini tamamladın!' 
                  : `${waterGoal - waterIntake} bardak daha! 💪 Devam et!`}
              </Text>
            </View>

            {/* Water Glasses Grid */}
            <View style={styles.glassesCard}>
              <Text style={styles.cardTitle}>Su Bardakları</Text>
              <View style={styles.glassesGrid}>
                {Array.from({ length: waterGoal }, (_, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.waterGlass,
                      i < waterIntake && styles.waterGlassFilled
                    ]}
                    onPress={handleWaterIntake}
                  >
                    <Text style={styles.waterGlassIcon}>
                      {i < waterIntake ? '💧' : '🥛'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.decreaseButton]}
                onPress={decreaseWaterIntake}
                disabled={waterIntake === 0}
              >
                <Ionicons name="remove" size={24} color="white" />
                <Text style={styles.actionButtonText}>Azalt</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, styles.increaseButton]}
                onPress={handleWaterIntake}
                disabled={waterIntake >= waterGoal}
              >
                <Ionicons name="add" size={24} color="white" />
                <Text style={styles.actionButtonText}>Su İç</Text>
              </TouchableOpacity>
            </View>

            {/* Weekly History */}
            <View style={styles.historyCard}>
              <Text style={styles.cardTitle}>Son 7 Gün</Text>
              <View style={styles.historyGrid}>
                {waterHistory.map((day, index) => {
                  const dayProgress = day.glasses_count / day.goal_glasses;
                  const dayName = new Date(day.date).toLocaleDateString('tr-TR', { weekday: 'short' });
                  
                  return (
                    <View key={index} style={styles.historyItem}>
                      <Text style={styles.historyDay}>{dayName}</Text>
                      <View style={[
                        styles.historyBar,
                        { height: Math.max(20, dayProgress * 60) }
                      ]} />
                      <Text style={styles.historyCount}>{day.glasses_count}</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Tips Card */}
            <View style={styles.tipsCard}>
              <Text style={styles.cardTitle}>💡 Su İçme İpuçları</Text>
              <View style={styles.tipsList}>
                <Text style={styles.tipItem}>• Günün başında bir bardak su için</Text>
                <Text style={styles.tipItem}>• Yemeklerden önce su içmeyi unutmayın</Text>
                <Text style={styles.tipItem}>• Egzersiz sırasında daha fazla su için</Text>
                <Text style={styles.tipItem}>• Su şişenizi her zaman yanınızda taşıyın</Text>
              </View>
            </View>

            <View style={styles.bottomPadding} />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showSettings}
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.settingsModal}>
            <LinearGradient
              colors={['#00BCD4', '#0097A7', '#006064']}
              style={styles.settingsGradient}
            >
              <View style={styles.settingsHeader}>
                <Text style={styles.settingsTitle}>⚙️ Su Takibi Ayarları</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowSettings(false)}
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.settingsBody}>
                {/* Goal Setting */}
                <View style={styles.settingSection}>
                  <Text style={styles.settingSectionTitle}>Günlük Hedef</Text>
                  <View style={styles.goalSetting}>
                    <TouchableOpacity 
                      style={styles.goalButton}
                      onPress={() => setWaterGoal(Math.max(4, waterGoal - 1))}
                    >
                      <Ionicons name="remove" size={20} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.goalText}>{waterGoal} bardak</Text>
                    <TouchableOpacity 
                      style={styles.goalButton}
                      onPress={() => setWaterGoal(Math.min(16, waterGoal + 1))}
                    >
                      <Ionicons name="add" size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Notifications */}
                <View style={styles.settingSection}>
                  <View style={styles.settingRow}>
                    <Text style={styles.settingLabel}>Bildirimleri Etkinleştir</Text>
                    <Switch
                      value={notificationsEnabled}
                      onValueChange={setNotificationsEnabled}
                      trackColor={{ false: '#767577', true: '#4CAF50' }}
                      thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'}
                    />
                  </View>
                </View>

                {/* Reminder Hours */}
                <View style={styles.settingSection}>
                  <Text style={styles.settingSectionTitle}>Hatırlatma Saatleri</Text>
                  <View style={styles.timeSlots}>
                    {[8, 10, 12, 14, 16, 18, 20, 22].map((hour) => {
                      const isSelected = reminderHours.includes(hour);
                      return (
                        <TouchableOpacity
                          key={hour}
                          style={[
                            styles.timeSlot,
                            isSelected && styles.timeSlotSelected,
                            !notificationsEnabled && styles.timeSlotDisabled
                          ]}
                          disabled={!notificationsEnabled}
                          onPress={() => {
                            if (isSelected) {
                              setReminderHours(prev => prev.filter(h => h !== hour));
                            } else {
                              setReminderHours(prev => [...prev, hour].sort());
                            }
                          }}
                        >
                          <Text style={[
                            styles.timeSlotText,
                            isSelected && styles.timeSlotTextSelected,
                            !notificationsEnabled && styles.timeSlotTextDisabled
                          ]}>
                            {hour}:00
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={saveWaterSettings}
                >
                  <Text style={styles.saveButtonText}>Ayarları Kaydet</Text>
                </TouchableOpacity>
              </ScrollView>
            </LinearGradient>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  settingsButton: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  progressCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  circularProgress: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 8,
    borderColor: '#4CAF50',
  },
  progressText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  progressSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  motivationText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
  },
  glassesCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  glassesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  waterGlass: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 5,
  },
  waterGlassFilled: {
    backgroundColor: '#4CAF50',
  },
  waterGlassIcon: {
    fontSize: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 15,
    gap: 8,
  },
  decreaseButton: {
    backgroundColor: '#FF5722',
  },
  increaseButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  historyGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 100,
  },
  historyItem: {
    alignItems: 'center',
    gap: 5,
  },
  historyDay: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  historyBar: {
    width: 20,
    backgroundColor: '#4CAF50',
    borderRadius: 10,
  },
  historyCount: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
  },
  tipsCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingEmoji: {
    fontSize: 48,
    marginBottom: 10,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  settingsModal: {
    backgroundColor: 'white',
    borderRadius: 20,
    width: '90%',
    height: '80%',
    overflow: 'hidden',
  },
  settingsGradient: {
    flex: 1,
    padding: 20,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  settingsBody: {
    flex: 1,
  },
  settingSection: {
    marginBottom: 25,
  },
  settingSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  goalSetting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  goalButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    minWidth: 100,
    textAlign: 'center',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 15,
    borderRadius: 10,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  timeSlots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  timeSlot: {
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  timeSlotSelected: {
    backgroundColor: '#4CAF50',
  },
  timeSlotDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  timeSlotText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  timeSlotTextSelected: {
    color: 'white',
    fontWeight: 'bold',
  },
  timeSlotTextDisabled: {
    color: 'rgba(255,255,255,0.5)',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
}); 