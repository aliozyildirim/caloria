import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import AuthService from '../../lib/auth';
import ApiService from '../../lib/api';
import { useTheme } from '../../lib/ThemeProvider';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [todayCalories, setTodayCalories] = useState(0);
  const [calorieGoal, setCalorieGoal] = useState(2000);
  const [waterIntake, setWaterIntake] = useState(0);
  const [waterGoal, setWaterGoal] = useState(8);
  const [userXP, setUserXP] = useState({ totalXP: 0, level: 1 });
  const [todayStats, setTodayStats] = useState({ protein: 0, carbs: 0, fat: 0 });
  const [activeDietPlan, setActiveDietPlan] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [todayChallenge, setTodayChallenge] = useState<any>(null);

  const { theme } = useTheme();

  // Gradient colors based on theme
  const gradientColors = theme.name === 'Gece Teması'
    ? ['#1a1a2e', '#16213e', '#0f3460'] // Dark mode - deep blue/black
    : ['#6366f1', '#8b5cf6', '#d946ef']; // Light mode - vibrant purple

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) return;

      const today = new Date().toISOString().split('T')[0];
      const [meals, profile, xp, water, diet, challenge] = await Promise.all([
        ApiService.getMeals(today).catch(() => []),
        ApiService.getUserProfile().catch(() => null),
        ApiService.getUserXP().catch(() => ({ totalXP: 0, level: 1 })),
        ApiService.getTodayWaterIntake().catch(() => ({ glasses_count: 0, goal_glasses: 8 })),
        ApiService.getActiveDietPlan().catch(() => null),
        ApiService.getActiveChallenge().catch(() => null),
      ]);

      const stats = Array.isArray(meals) ? meals.reduce((acc: any, meal: any) => ({
        calories: acc.calories + (parseFloat(meal?.calories) || 0),
        protein: acc.protein + (parseFloat(meal?.protein) || 0),
        carbs: acc.carbs + (parseFloat(meal?.carbs) || 0),
        fat: acc.fat + (parseFloat(meal?.fat) || 0),
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 }) : { calories: 0, protein: 0, carbs: 0, fat: 0 };

      setTodayCalories(Math.round(stats.calories));
      setTodayStats({ protein: stats.protein, carbs: stats.carbs, fat: stats.fat });
      setCalorieGoal(profile?.daily_calorie_goal || 2000);
      setUserProfile(profile);
      setUserXP(xp);
      setWaterIntake(water.glasses_count || 0);
      setWaterGoal(water.goal_glasses || 8);
      setActiveDietPlan(diet);
      setTodayChallenge(challenge);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
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
    const name = userProfile?.name || user?.fullName?.split(' ')[0] || '';
    
    if (hour < 12) return name ? `🌅 Günaydın, ${name}` : '🌅 Günaydın';
    if (hour < 18) return name ? `☀️ İyi Günler, ${name}` : '☀️ İyi Günler';
    return name ? `🌙 İyi Akşamlar, ${name}` : '🌙 İyi Akşamlar';
  };

  const handleWaterIntake = async () => {
    if (waterIntake < waterGoal) {
      const newIntake = waterIntake + 1;
      setWaterIntake(newIntake);
      try {
        await ApiService.updateWaterIntake(newIntake);
        if (newIntake >= waterGoal) {
          Alert.alert('🎉 Harika!', 'Günlük su hedefinizi tamamladınız!');
        }
      } catch (error) {
        setWaterIntake(waterIntake);
      }
    }
  };

  const calorieProgress = Math.min((todayCalories / calorieGoal) * 100, 100);
  const waterProgress = Math.min((waterIntake / waterGoal) * 100, 100);

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={gradientColors} style={styles.gradient}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingEmoji}>✨</Text>
              <Text style={styles.loadingText}>Yükleniyor...</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={gradientColors} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="white" />}
          >
            {/* Compact Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.greeting}>{getGreeting()}</Text>
              </View>
              <View style={styles.headerRight}>
                <TouchableOpacity 
                  style={styles.switchBtn}
                  onPress={() => router.replace('/index-old')}
                >
                  <Ionicons name="swap-horizontal" size={20} color="white" />
                </TouchableOpacity>
                <View style={styles.xpBadge}>
                  <Ionicons name="star" size={14} color="#FFD700" />
                  <Text style={styles.xpText}>{userXP.totalXP}</Text>
                </View>
                <View style={styles.levelBadge}>
                  <Text style={styles.levelText}>Lv.{userXP.level}</Text>
                </View>
              </View>
            </View>

            {/* Main Calorie Card */}
            <View style={styles.mainCalorieCard}>
              <View style={styles.calorieContent}>
                <View style={styles.calorieLeft}>
                  <Text style={styles.calorieLabel}>Günlük Kalori</Text>
                  <View style={styles.calorieValues}>
                    <Text style={styles.calorieValue}>{todayCalories}</Text>
                    <Text style={styles.calorieGoalText}>/ {calorieGoal}</Text>
                  </View>
                  <View style={styles.calorieBar}>
                    <View style={[styles.calorieBarFill, { width: `${calorieProgress}%` }]} />
                  </View>
                </View>
                <View style={styles.calorieRight}>
                  <View style={styles.percentCircle}>
                    <Text style={styles.percentValue}>{Math.round(calorieProgress)}%</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Macro Stats */}
            <View style={styles.macroRow}>
              <View style={styles.macroCard}>
                <View style={styles.macroIcon}>
                  <Text style={styles.macroEmoji}>🍗</Text>
                </View>
                <Text style={styles.macroValue}>{todayStats.protein.toFixed(0)}g</Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>

              <View style={styles.macroCard}>
                <View style={styles.macroIcon}>
                  <Text style={styles.macroEmoji}>🍞</Text>
                </View>
                <Text style={styles.macroValue}>{todayStats.carbs.toFixed(0)}g</Text>
                <Text style={styles.macroLabel}>Karb</Text>
              </View>

              <View style={styles.macroCard}>
                <View style={styles.macroIcon}>
                  <Text style={styles.macroEmoji}>🥑</Text>
                </View>
                <Text style={styles.macroValue}>{todayStats.fat.toFixed(0)}g</Text>
                <Text style={styles.macroLabel}>Yağ</Text>
              </View>
            </View>

            {/* Water & Challenge Row */}
            <View style={styles.progressRow}>
              {/* Water Card */}
              <TouchableOpacity style={styles.progressCard} onPress={handleWaterIntake} activeOpacity={0.8}>
                <Text style={styles.progressIcon}>💧</Text>
                <Text style={styles.progressTitle}>Su</Text>
                <Text style={styles.progressValue}>{waterIntake}/{waterGoal}</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressBarFill, styles.waterFill, { width: `${waterProgress}%` }]} />
                </View>
              </TouchableOpacity>

              {/* Challenge Card */}
              {todayChallenge ? (
                <TouchableOpacity style={styles.progressCard} onPress={() => router.push('/games')} activeOpacity={0.8}>
                  <Text style={styles.progressIcon}>🎯</Text>
                  <Text style={styles.progressTitle}>Meydan Okuma</Text>
                  <Text style={styles.progressValue}>
                    {todayChallenge.current_progress || 0}/{todayChallenge.target_progress || 0}
                  </Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressBarFill, styles.challengeFill, { 
                      width: `${Math.min((todayChallenge.current_progress / todayChallenge.target_progress) * 100, 100)}%` 
                    }]} />
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.progressCard} onPress={() => router.push('/games')} activeOpacity={0.8}>
                  <Text style={styles.progressIcon}>⭐</Text>
                  <Text style={styles.progressTitle}>XP</Text>
                  <Text style={styles.progressValue}>{userXP.totalXP}</Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressBarFill, styles.xpFill, { width: '100%' }]} />
                  </View>
                </TouchableOpacity>
              )}
            </View>

            {/* Quick Actions */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity 
                style={[styles.actionBtn, styles.actionPrimary]}
                onPress={() => router.push('/(tabs)/camera')}
              >
                <Ionicons name="camera" size={24} color="white" />
                <Text style={styles.actionBtnText}>Yemek Ekle</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionBtn, styles.actionSecondary]}
                onPress={() => router.push('/nutrition-expert')}
              >
                <Ionicons name="fitness" size={24} color="white" />
                <Text style={styles.actionBtnText}>Beslenme Uzmanı</Text>
              </TouchableOpacity>
            </View>

            {/* Secondary Actions */}
            <View style={styles.secondaryActions}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/(tabs)/diets')}>
                <Ionicons name="restaurant" size={20} color="white" />
                <Text style={styles.secondaryBtnText}>Diyet Planı</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/games')}>
                <Ionicons name="trophy" size={20} color="white" />
                <Text style={styles.secondaryBtnText}>Ödüller</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.push('/(tabs)/history')}>
                <Ionicons name="bar-chart" size={20} color="white" />
                <Text style={styles.secondaryBtnText}>İstatistikler</Text>
              </TouchableOpacity>
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
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
  },
  backToNewBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  backToNewText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  switchBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  xpText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  levelBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  levelText: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
  },
  mainCalorieCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 24,
    padding: 24,
  },
  calorieContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calorieLeft: {
    flex: 1,
  },
  calorieLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  calorieValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,
  },
  calorieValue: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
  },
  calorieGoalText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 8,
  },
  calorieBar: {
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  calorieBarFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 6,
  },
  calorieRight: {
    marginLeft: 20,
  },
  percentCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  percentValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  macroRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 12,
  },
  macroCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  macroIcon: {
    marginBottom: 8,
  },
  macroEmoji: {
    fontSize: 32,
  },
  macroValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  macroLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
  },
  progressRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 12,
  },
  progressCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  progressIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  progressTitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressValue: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  waterFill: {
    backgroundColor: '#3b82f6',
  },
  challengeFill: {
    backgroundColor: '#10b981',
  },
  xpFill: {
    backgroundColor: '#f59e0b',
  },
  actionsContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 12,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 12,
  },
  actionPrimary: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  actionSecondary: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  actionBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryActions: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 6,
  },
  secondaryBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
});
