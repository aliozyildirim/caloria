import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Animated,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import AuthService from '../../lib/auth';
import ApiService from '../../lib/api';
import { CircularProgress } from '../../components/CircularProgress';
import { useTheme } from '../../lib/ThemeProvider';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [todayCalories, setTodayCalories] = useState(0);
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [waterIntake, setWaterIntake] = useState(0);
  const [waterGoal, setWaterGoal] = useState(8);
  const [todayChallenge, setTodayChallenge] = useState<any>(null);
  const [userRewards, setUserRewards] = useState<any[]>([]);
  const [userXP, setUserXP] = useState({ totalXP: 0, level: 1 });
  const [hasNutritionExpert, setHasNutritionExpert] = useState(false);
  const [todayStats, setTodayStats] = useState({
    totalCalories: 0,
    totalProtein: 0,
    totalCarbs: 0,
    totalFat: 0
  });

  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    loadData();
    startAnimations();
    
    const interval = setInterval(() => {
      loadData();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const startAnimations = () => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const [mealsData, profileData, challengeData, userRewardsData, xpData, waterData, nutritionistAccess] = await Promise.all([
        ApiService.getMeals(today).catch(() => []),
        ApiService.getUserProfile().catch(() => null),
        ApiService.getActiveChallenge().catch(() => null),
        ApiService.getUserRewards().catch(() => []),
        ApiService.getUserXP().catch(() => ({ totalXP: 0, level: 1 })),
        ApiService.getTodayWaterIntake().catch(() => ({ glasses_count: 0, goal_glasses: 8 })),
        ApiService.checkNutritionistAccess().catch(() => ({ hasAccess: false }))
      ]);

      // Calculate today's stats
      const statsCalculation = Array.isArray(mealsData) ? mealsData.reduce((acc: any, meal: any) => ({
        totalCalories: acc.totalCalories + (parseFloat(meal?.calories) || 0),
        totalProtein: acc.totalProtein + (parseFloat(meal?.protein) || 0),
        totalCarbs: acc.totalCarbs + (parseFloat(meal?.carbs) || 0),
        totalFat: acc.totalFat + (parseFloat(meal?.fat) || 0)
      }), { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 }) : { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };

      setTodayStats(statsCalculation);
      setTodayCalories(Math.round(statsCalculation.totalCalories));
      
      if (profileData?.daily_calorie_goal) {
        setCalorieGoal(profileData.daily_calorie_goal);
      }
      setUserProfile(profileData);
      setTodayChallenge(challengeData);
      setUserRewards(Array.isArray(userRewardsData) ? userRewardsData : []);
      setUserXP(xpData);
      setWaterIntake(waterData.glasses_count || 0);
      setWaterGoal(waterData.goal_glasses || 8);
      setHasNutritionExpert(nutritionistAccess.hasAccess);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const user = AuthService.getCurrentUser();
    const name = userProfile?.name || user?.fullName?.split(' ')[0] || 'Kullanıcı';
    
    if (hour < 12) return `🌅 Günaydın, ${name}!`;
    if (hour < 18) return `☀️ İyi öğlenler, ${name}!`;
    return `🌙 İyi akşamlar, ${name}!`;
  };

  const handleWaterIntake = async () => {
    if (waterIntake < waterGoal) {
      const newIntake = waterIntake + 1;
      setWaterIntake(newIntake);
      try {
        await ApiService.updateWaterIntake(newIntake);
        if (newIntake >= waterGoal) {
          Alert.alert('Tebrikler! 🎉', 'Günlük su hedefinizi tamamladınız!');
        }
      } catch (error) {
        console.error('Error updating water intake:', error);
      }
    }
  };

  const handleNutritionistAccess = () => {
    if (hasNutritionExpert) {
      router.push('/nutrition-expert');
    } else {
      Alert.alert(
        '🔒 Özellik Kilitli',
        'Beslenme uzmanı özelliğini XP Mağazasından açabilirsiniz.',
        [
          { text: 'Tamam', style: 'cancel' },
          { 
            text: 'Mağazaya Git', 
            onPress: () => router.push({ 
              pathname: '/(tabs)/games', 
              params: { openModal: 'shop' } 
            })
          }
        ]
      );
    }
  };

  const calorieProgress = Math.min(todayCalories / calorieGoal, 1);
  const waterProgress = waterIntake / waterGoal;
  const remainingCalories = Math.max(0, calorieGoal - todayCalories);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={[theme.primaryColor, theme.secondaryColor]} style={styles.backgroundGradient}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingEmoji}>✨</Text>
              <Text style={[styles.loadingText, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>
                Yükleniyor...
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[theme.primaryColor, theme.secondaryColor]} style={styles.backgroundGradient}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="white" />}
          >
            {/* Header */}
            <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
              <View style={styles.greetingContainer}>
                <Text style={[styles.greeting, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>
                  {getGreeting()}
                </Text>
                <Text style={[styles.subtitle, { color: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.8)' : `${theme.textColor}CC` }]}>
                  Bugün nasıl hissediyorsun?
                </Text>
              </View>
              
              {/* User Level Badge */}
              {userXP.level > 1 && (
                <View style={[styles.levelBadge, { backgroundColor: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : theme.accentColor + '40' }]}>
                  <Text style={[styles.levelText, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>
                    Lv.{userXP.level}
                  </Text>
                </View>
              )}
            </Animated.View>

            {/* Main Stats - Calorie & Water */}
            <Animated.View style={[styles.mainStatsContainer, { opacity: fadeAnim }]}>
              {/* Calorie Card */}
              <View style={[styles.statCard, { backgroundColor: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.1)' : theme.cardColor + '20' }]}>
                <View style={styles.statHeader}>
                  <Text style={[styles.statTitle, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>🔥 Kalori</Text>
                  <Text style={[styles.statSubtitle, { color: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.8)' : theme.textColor + 'CC' }]}>Günlük Hedef</Text>
                </View>
                
                <View style={styles.circularContainer}>
                  <CircularProgress
                    size={120}
                    strokeWidth={10}
                    progress={calorieProgress * 100}
                    color="#FF6B6B"
                    backgroundColor={theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : theme.accentColor + '30'}
                  />
                  <View style={styles.circularContent}>
                    <Text style={[styles.circularValue, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>
                      {todayCalories}
                    </Text>
                    <Text style={[styles.circularGoal, { color: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.8)' : theme.textColor + 'CC' }]}>
                      /{calorieGoal}
                    </Text>
                  </View>
                </View>
                
                <Text style={[styles.remainingText, { color: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.8)' : theme.textColor + 'CC' }]}>
                  {remainingCalories > 0 ? `${remainingCalories} kalori kaldı` : '🎉 Hedef tamamlandı!'}
                </Text>
              </View>

              {/* Water Card */}
              <View style={[styles.statCard, { backgroundColor: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.1)' : theme.cardColor + '20' }]}>
                <View style={styles.statHeader}>
                  <Text style={[styles.statTitle, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>💧 Su</Text>
                  <Text style={[styles.statSubtitle, { color: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.8)' : theme.textColor + 'CC' }]}>Günlük Hedef</Text>
                </View>
                
                <TouchableOpacity onPress={handleWaterIntake} style={styles.waterContainer}>
                  <View style={styles.waterGlasses}>
                    {[...Array(Math.min(8, waterGoal))].map((_, index) => (
                      <View
                        key={index}
                        style={[
                          styles.waterGlass,
                          { 
                            opacity: index < waterIntake ? 1 : 0.3,
                            backgroundColor: index < waterIntake 
                              ? '#42A5F5' 
                              : (theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : theme.accentColor + '30')
                          }
                        ]}
                      >
                        <Text style={[styles.waterDropIcon, { color: index < waterIntake ? 'white' : (theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.6)' : theme.textColor + '80') }]}>💧</Text>
                      </View>
                    ))}
                  </View>
                  
                  <Text style={[styles.waterProgress, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>
                    {waterIntake}/{waterGoal} bardak
                  </Text>
                  
                  <Text style={[styles.waterSubtext, { color: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.7)' : theme.textColor + 'CC' }]}>
                    {waterIntake >= waterGoal ? '🎉 Hedef tamamlandı!' : `${waterGoal - waterIntake} bardak kaldı`}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Quick Actions */}
            <Animated.View style={[styles.quickActions, { opacity: fadeAnim }]}>
              <Text style={[styles.sectionTitle, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>⚡ Hızlı İşlemler</Text>
              
              <View style={styles.actionsGrid}>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : theme.cardColor + '40' }]}
                  onPress={() => router.push('/(tabs)/camera')}
                >
                  <Text style={[styles.actionIcon, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>📷</Text>
                  <Text style={[styles.actionText, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>Yemek Ekle</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : theme.cardColor + '40' }]}
                  onPress={handleNutritionistAccess}
                >
                  <Text style={[styles.actionIcon, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>👩‍⚕️</Text>
                  <Text style={[styles.actionText, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>Beslenme Uzmanı</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : theme.cardColor + '40' }]}
                  onPress={() => router.push('/games')}
                >
                  <Text style={[styles.actionIcon, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>🏆</Text>
                  <Text style={[styles.actionText, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>Ödüllerim</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : theme.cardColor + '40' }]}
                  onPress={() => router.push('/games')}
                >
                  <Text style={[styles.actionIcon, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>🥇</Text>
                  <Text style={[styles.actionText, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>Liderlik</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : theme.cardColor + '40' }]}
                  onPress={() => router.push({ pathname: '/(tabs)/games', params: { openModal: 'shop' } })}
                >
                  <Text style={[styles.actionIcon, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>🛒</Text>
                  <Text style={[styles.actionText, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>Mağaza</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : theme.cardColor + '40' }]}
                  onPress={async () => {
                    try {
                      const result = await ApiService.claimDailyBonus();
                      Alert.alert('🎁 Günlük Bonus!', `${result.xpAwarded} XP kazandın!`);
                      loadData();
                    } catch (error: any) {
                      Alert.alert('Bilgi', 'Günlük bonus zaten alındı!');
                    }
                  }}
                >
                  <Text style={[styles.actionIcon, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>🎁</Text>
                  <Text style={[styles.actionText, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>Günlük Bonus</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : theme.cardColor + '40' }]}
                  onPress={() => router.push('/(tabs)/history')}
                >
                  <Text style={[styles.actionIcon, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>📊</Text>
                  <Text style={[styles.actionText, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>Geçmiş</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : theme.cardColor + '40' }]}
                  onPress={() => router.push('/(tabs)/diets')}
                >
                  <Text style={[styles.actionIcon, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>🥗</Text>
                  <Text style={[styles.actionText, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>Diyetler</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Today's Challenge */}
            {todayChallenge && (
              <Animated.View style={[styles.challengeContainer, { opacity: fadeAnim }]}>
                <Text style={[styles.sectionTitle, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>🎯 Günlük Challenge</Text>
                
                <TouchableOpacity 
                  style={[styles.challengeCard, { backgroundColor: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.1)' : theme.cardColor + '40' }]}
                  onPress={() => router.push('/challenges')}
                >
                  <View style={styles.challengeContent}>
                    <Text style={[styles.challengeIcon, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>🎯</Text>
                    <View style={styles.challengeInfo}>
                      <Text style={[styles.challengeTitle, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>
                        {todayChallenge.title}
                      </Text>
                      <Text style={[styles.challengeDesc, { color: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.8)' : theme.textColor + 'CC' }]}>
                        {todayChallenge.description}
                      </Text>
                    </View>
                  </View>
                  
                  {todayChallenge.current_progress !== undefined && (
                    <View style={styles.challengeProgressContainer}>
                      <View style={[styles.progressBar, { backgroundColor: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : theme.accentColor + '30' }]}>
                        <View 
                          style={[
                            styles.progressFill,
                            { 
                              width: `${Math.min((todayChallenge.current_progress / todayChallenge.target_progress) * 100, 100)}%`,
                              backgroundColor: theme.accentColor
                            }
                          ]}
                        />
                      </View>
                      <Text style={[styles.progressText, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>
                        {todayChallenge.current_progress}/{todayChallenge.target_progress}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Active Plans */}
            <Animated.View style={[styles.plansContainer, { opacity: fadeAnim }]}>
              <Text style={[styles.sectionTitle, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>📋 Aktif Planlar</Text>
              
              <TouchableOpacity 
                style={[styles.planCard, { backgroundColor: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.1)' : theme.cardColor + '40' }]}
                onPress={() => router.push('/(tabs)/diets')}
              >
                <View style={styles.planContent}>
                  <Text style={[styles.planIcon, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>🥗</Text>
                  <View style={styles.planInfo}>
                    <Text style={[styles.planTitle, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>
                      Diyet Planı
                    </Text>
                    <Text style={[styles.planDesc, { color: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.8)' : theme.textColor + 'CC' }]}>
                      Günlük beslenme planınızı görüntüleyin
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={theme.textColor === '#ffffff' ? 'white' : theme.textColor} />
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.planCard, { backgroundColor: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.1)' : theme.cardColor + '40' }]}
                onPress={() => router.push('/(tabs)/water')}
              >
                <View style={styles.planContent}>
                  <Text style={[styles.planIcon, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>💧</Text>
                  <View style={styles.planInfo}>
                    <Text style={[styles.planTitle, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>
                      Su Planı
                    </Text>
                    <Text style={[styles.planDesc, { color: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.8)' : theme.textColor + 'CC' }]}>
                      Günlük su tüketim hedefinizi takip edin
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color={theme.textColor === '#ffffff' ? 'white' : theme.textColor} />
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* Rewards Section */}
            <Animated.View style={[styles.rewardsContainer, { opacity: fadeAnim }]}>
              <Text style={[styles.sectionTitle, { color: theme.textColor }]}>
                🏆 Ödüllerim
              </Text>
              
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.rewardsScroll}
              >
                {/* Gece Teması Ödülü */}
                <View style={[styles.rewardCard, { backgroundColor: theme.cardColor + '40' }]}>
                  <Ionicons name="moon" size={32} color={theme.textColor} />
                  <Text style={[styles.rewardTitle, { color: theme.textColor }]}>
                    Gece Teması
                  </Text>
                  <Text style={[styles.rewardSubtitle, { color: theme.textColor + '99' }]}>
                    Tema
                  </Text>
                </View>

                {/* Diğer Ödüller */}
                {userRewards.slice(0, 3).map((reward, index) => (
                  <View 
                    key={index}
                    style={[styles.rewardCard, { backgroundColor: theme.cardColor + '40' }]}
                  >
                    <Text style={styles.rewardIcon}>{reward.icon || '🎁'}</Text>
                    <Text style={[styles.rewardTitle, { color: theme.textColor }]}>
                      {reward.name}
                    </Text>
                    <Text style={[styles.rewardSubtitle, { color: theme.textColor + '99' }]}>
                      {reward.category}
                    </Text>
                  </View>
                ))}
                
                <TouchableOpacity 
                  style={[styles.rewardCard, { backgroundColor: theme.cardColor + '40' }]}
                  onPress={() => router.push('/games')}
                >
                  <Ionicons name="arrow-forward" size={32} color={theme.textColor} />
                  <Text style={[styles.rewardTitle, { color: theme.textColor }]}>
                    Tümünü Gör
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>

            {/* Today's Summary */}
            <Animated.View style={[styles.summaryContainer, { opacity: fadeAnim }]}>
              <Text style={[styles.sectionTitle, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>📊 Günlük Özet</Text>
              
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryIcon, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>💪</Text>
                  <Text style={[styles.summaryValue, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>
                    {Math.round(todayStats.totalProtein)}g
                  </Text>
                  <Text style={[styles.summaryLabel, { color: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.8)' : theme.textColor + 'CC' }]}>
                    Protein
                  </Text>
                </View>
                
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryIcon, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>🍞</Text>
                  <Text style={[styles.summaryValue, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>
                    {Math.round(todayStats.totalCarbs)}g
                  </Text>
                  <Text style={[styles.summaryLabel, { color: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.8)' : theme.textColor + 'CC' }]}>
                    Karbonhidrat
                  </Text>
                </View>
                
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryIcon, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>🥑</Text>
                  <Text style={[styles.summaryValue, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>
                    {Math.round(todayStats.totalFat)}g
                  </Text>
                  <Text style={[styles.summaryLabel, { color: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.8)' : theme.textColor + 'CC' }]}>
                    Yağ
                  </Text>
                </View>
              </View>
            </Animated.View>

            <View style={{ height: 50 }} />
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
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  greetingContainer: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
  },
  levelBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 15,
    alignItems: 'center',
  },
  levelText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  mainStatsContainer: {
    marginHorizontal: 20,
    marginBottom: 20,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minHeight: 220,
  },
  statHeader: {
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  statTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 2,
  },
  circularContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    position: 'relative',
    width: 120,
    height: 120,
  },
  circularContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  circularGoal: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: -2,
  },
  remainingText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 4,
  },
  waterContainer: {
    alignItems: 'center',
    width: '100%',
  },
  waterGlasses: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'center',
    marginBottom: 12,
    maxWidth: 120,
  },
  waterGlass: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  waterDropIcon: {
    fontSize: 14,
    color: 'white',
  },
  waterProgress: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 4,
  },
  waterSubtext: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  quickActions: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionButton: {
    width: (width - 64) / 3,
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 12,
    paddingVertical: 15,
    paddingHorizontal: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 6,
    color: 'white',
  },
  actionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  premiumBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFD700',
    backgroundColor: '#FF5722',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
  },
  challengeContainer: {
    marginHorizontal: 20,
    marginBottom: 15,
  },
  challengeCard: {
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 15,
  },
  challengeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  challengeIcon: {
    fontSize: 24,
    marginRight: 12,
    color: 'white',
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  challengeDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  challengeProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  progressBar: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
  },
  progressText: {
    fontSize: 12,
    color: 'white',
  },
  summaryContainer: {
    marginHorizontal: 20,
    marginBottom: 15,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryIcon: {
    fontSize: 24,
    marginBottom: 4,
    color: 'white',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
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
  safeArea: {
    flex: 1,
  },
  plansContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  planCard: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
  },
  planContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  planInfo: {
    flex: 1,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  planDesc: {
    fontSize: 13,
  },
  rewardsContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  rewardsScroll: {
    marginTop: 10,
  },
  rewardCard: {
    width: 120,
    height: 120,
    borderRadius: 20,
    padding: 16,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
  },
  rewardSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  nutritionistContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  nutritionistCard: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 10,
  },
  nutritionistContent: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  nutritionistImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 16,
  },
  nutritionistInfo: {
    alignItems: 'center',
  },
  nutritionistTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  nutritionistDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  nutritionistFeatures: {
    width: '100%',
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  featureText: {
    fontSize: 14,
  },
  nutritionistButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
  },
  nutritionistButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  nutritionSection: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  nutritionCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
  },
  nutritionContent: {
    flexDirection: 'row',
  },
  nutritionInfo: {
    flex: 1,
  },
  nutritionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  nutritionDesc: {
    fontSize: 14,
    marginBottom: 12,
  },
  nutritionFeatures: {
    marginBottom: 16,
  },
  priceTag: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  priceText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 