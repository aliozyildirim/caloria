import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import ApiService from '../lib/api';
import { useTheme } from '../lib/ThemeProvider';

export default function ChallengesScreen() {
  const { theme } = useTheme();
  const [challenges, setChallenges] = useState<any[]>([]);
  const [activeChallenge, setActiveChallenge] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [challengesData, activeChallengeData] = await Promise.all([
        ApiService.getChallenges(),
        ApiService.getActiveChallenge()
      ]);

      setChallenges(challengesData);
      setActiveChallenge(activeChallengeData);
    } catch (error) {
      console.error('Error loading challenges:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir sorun oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAcceptChallenge = async (challenge: any) => {
    try {
      if (activeChallenge && !activeChallenge.is_completed) {
        Alert.alert(
          'Aktif Challenge Var',
          'Zaten aktif bir challenge\'ınız var. Önce onu tamamlayın.',
          [{ text: 'Tamam' }]
        );
        return;
      }

      Alert.alert(
        'Challenge Kabul Et',
        `"${challenge.title}" challenge'ını kabul etmek istediğinizden emin misiniz?\n\n${challenge.description}\n\nÖdül: ${challenge.xp_reward} XP`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Kabul Et',
            onPress: async () => {
              try {
                await ApiService.acceptChallenge(challenge.id);
                Alert.alert('Başarılı! 🎯', 'Challenge kabul edildi! Başarılar!');
                loadData();
              } catch (error: any) {
                if (error.message?.includes('Bugün zaten bir challenge kabul ettiniz')) {
                  Alert.alert('Uyarı', 'Bugün zaten bir challenge kabul ettiniz. Her gün sadece 1 challenge kabul edebilirsiniz.');
                } else {
                  Alert.alert('Hata', 'Challenge kabul edilirken bir sorun oluştu.');
                }
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error accepting challenge:', error);
      Alert.alert('Hata', 'Beklenmeyen bir hata oluştu.');
    }
  };

  const handleUpdateProgress = async () => {
    if (!activeChallenge) return;

    try {
      const result = await ApiService.updateChallengeProgress(activeChallenge.id);
      
      if (result.completed) {
        Alert.alert(
          'Tebrikler! 🎉',
          `Challenge tamamlandı! ${result.completionXP} XP kazandınız!`
        );
      } else {
        Alert.alert('Başarılı! ⭐', result.message || 'Günlük ilerleme kaydedildi!');
      }
      
      loadData();
    } catch (error: any) {
      if (error.message?.includes('Bu challenge için bugün zaten ilerleme kaydettiniz')) {
        Alert.alert('Bilgi', 'Bu challenge için bugün zaten ilerleme kaydettiniz. Yarın tekrar deneyin!');
      } else {
        Alert.alert('Hata', 'İlerleme kaydedilirken bir sorun oluştu.');
      }
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return ['#4CAF50', '#45a049'];
      case 'medium': return ['#FF9800', '#F57C00'];
      case 'hard': return ['#F44336', '#D32F2F'];
      default: return ['#2196F3', '#1976D2'];
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return '🌱 Kolay';
      case 'medium': return '🌟 Orta';
      case 'hard': return '🔥 Zor';
      default: return '🌟 Normal';
    }
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
              🎯 Challenges
            </Text>
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* Active Challenge */}
            {activeChallenge && (
              <View style={styles.activeSection}>
                <Text style={[styles.sectionTitle, { color: theme.textColor }]}>
                  {activeChallenge.is_completed ? '✅ Tamamlanan Challenge' : '🎯 Aktif Challenge'}
                </Text>
                
                <View style={styles.activeCard}>
                  <LinearGradient
                    colors={activeChallenge.is_completed ? ['#4CAF50', '#45a049'] : ['#FF6B6B', '#FF8E53']}
                    style={styles.activeGradient}
                  >
                    <Text style={styles.activeTitle}>{activeChallenge.title}</Text>
                    <Text style={styles.activeDescription}>{activeChallenge.description}</Text>
                    
                    <View style={styles.progressSection}>
                      <View style={styles.progressInfo}>
                        <Text style={styles.progressText}>
                          {activeChallenge.current_progress}/{activeChallenge.target_progress} gün
                        </Text>
                        <Text style={styles.progressPercentage}>
                          %{Math.round((activeChallenge.current_progress / activeChallenge.target_progress) * 100)}
                        </Text>
                      </View>
                      <View style={styles.progressBar}>
                        <View 
                          style={[
                            styles.progressFill,
                            { width: `${(activeChallenge.current_progress / activeChallenge.target_progress) * 100}%` }
                          ]}
                        />
                      </View>
                    </View>

                    {!activeChallenge.is_completed && (
                      <TouchableOpacity
                        style={styles.updateButton}
                        onPress={handleUpdateProgress}
                      >
                        <Text style={styles.updateButtonText}>Bugün Tamamladım! ✅</Text>
                      </TouchableOpacity>
                    )}

                    <View style={styles.challengeInfo}>
                      <Text style={styles.infoText}>
                        🎁 Ödül: +{activeChallenge.xp_reward} XP
                      </Text>
                      {!activeChallenge.is_completed && (
                        <Text style={styles.infoText}>
                          ⏱️ Kalan: {Math.max(0, Math.ceil((new Date(activeChallenge.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} gün
                        </Text>
                      )}
                    </View>
                  </LinearGradient>
                </View>
              </View>
            )}

            {/* Available Challenges */}
            <View style={styles.availableSection}>
              <Text style={[styles.sectionTitle, { color: theme.textColor }]}>
                Mevcut Challenges
              </Text>

              {challenges.map((challenge) => (
                <View key={challenge.id} style={styles.challengeCard}>
                  <LinearGradient
                    colors={getDifficultyColor(challenge.difficulty)}
                    style={styles.challengeGradient}
                  >
                    <Text style={styles.challengeTitle}>{challenge.title}</Text>
                    <Text style={styles.challengeDescription}>{challenge.description}</Text>
                    
                    <View style={styles.challengeBadges}>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {getDifficultyText(challenge.difficulty)}
                        </Text>
                      </View>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>
                          {challenge.target_days} gün
                        </Text>
                      </View>
                    </View>

                    <View style={styles.challengeFooter}>
                      <View style={styles.rewardInfo}>
                        <Ionicons name="star" size={16} color="#FFD700" />
                        <Text style={styles.rewardText}>+{challenge.xp_reward} XP</Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.acceptButton,
                          (activeChallenge && !activeChallenge.is_completed) && styles.acceptButtonDisabled
                        ]}
                        onPress={() => handleAcceptChallenge(challenge)}
                        disabled={activeChallenge && !activeChallenge.is_completed}
                      >
                        <Text style={styles.acceptButtonText}>
                          {(activeChallenge && !activeChallenge.is_completed) 
                            ? 'Aktif Challenge Var'
                            : 'Kabul Et'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              ))}

              {challenges.length === 0 && !isLoading && (
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyText, { color: theme.textColor }]}>
                    Henüz challenge yok. Yakında yeni challenges eklenecek! 🚀
                  </Text>
                </View>
              )}
            </View>

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
  scrollView: {
    flex: 1,
  },
  activeSection: {
    padding: 16,
  },
  availableSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  activeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  activeGradient: {
    padding: 20,
  },
  activeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  activeDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: 'white',
  },
  progressPercentage: {
    fontSize: 14,
    color: 'white',
    fontWeight: 'bold',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  updateButton: {
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  updateButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  challengeInfo: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
  },
  infoText: {
    fontSize: 14,
    color: 'white',
    marginBottom: 4,
  },
  challengeCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  challengeGradient: {
    padding: 20,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  challengeDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
  },
  challengeBadges: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
  },
  challengeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rewardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  acceptButton: {
    backgroundColor: 'white',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  acceptButtonDisabled: {
    opacity: 0.5,
  },
  acceptButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
}); 