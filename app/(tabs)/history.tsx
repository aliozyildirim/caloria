import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RecentMealCard } from '../../components/RecentMealCard';
import ApiService, { Meal } from '../../lib/api';

const { width } = Dimensions.get('window');

// Mock data for weekly chart
const WEEKLY_DATA = [
  { day: 'Mon', calories: 1850, goal: 2000 },
  { day: 'Tue', calories: 2100, goal: 2000 },
  { day: 'Wed', calories: 1920, goal: 2000 },
  { day: 'Thu', calories: 2050, goal: 2000 },
  { day: 'Fri', calories: 1780, goal: 2000 },
  { day: 'Sat', calories: 2200, goal: 2000 },
  { day: 'Sun', calories: 1950, goal: 2000 },
];

const TIME_PERIODS = ['Week', 'Month', 'Year'];

export default function HistoryScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedPeriod, setSelectedPeriod] = useState('Week');
  const [mealsForDate, setMealsForDate] = useState<Meal[]>([]);
  const [recentMeals, setRecentMeals] = useState<Meal[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [todayNutrition, setTodayNutrition] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [weeklyStats, setWeeklyStats] = useState({
    avgCalories: 1980,
    totalMeals: 28,
    streakDays: 7,
    goalHitRate: 85,
  });

  useEffect(() => {
    loadHistoryData();
  }, [selectedDate]);

  const loadHistoryData = async () => {
    try {
      setIsLoading(true);
      
      const [mealsForSelectedDate, allRecentMeals] = await Promise.all([
        ApiService.getMeals(selectedDate).catch(() => []),
        ApiService.getMeals().catch(() => [])
      ]);
      
      setMealsForDate(Array.isArray(mealsForSelectedDate) ? mealsForSelectedDate : []);
      setRecentMeals(Array.isArray(allRecentMeals) ? allRecentMeals.slice(0, 10) : []);
      
      // Calculate nutrition for selected date
      const totalCalories = Array.isArray(mealsForSelectedDate) ? 
        mealsForSelectedDate.reduce((sum: number, meal: Meal) => sum + (meal.calories || 0), 0) : 0;
      const totalProtein = Array.isArray(mealsForSelectedDate) ? 
        mealsForSelectedDate.reduce((sum: number, meal: Meal) => sum + (meal.protein || 0), 0) : 0;
      const totalCarbs = Array.isArray(mealsForSelectedDate) ? 
        mealsForSelectedDate.reduce((sum: number, meal: Meal) => sum + (meal.carbs || 0), 0) : 0;
      const totalFat = Array.isArray(mealsForSelectedDate) ? 
        mealsForSelectedDate.reduce((sum: number, meal: Meal) => sum + (meal.fat || 0), 0) : 0;
      
      setTodayNutrition({
        calories: Math.round(totalCalories),
        protein: Math.round(totalProtein),
        carbs: Math.round(totalCarbs),
        fat: Math.round(totalFat)
      });
      
    } catch (error) {
      console.error('Error loading history data:', error);
      setMealsForDate([]);
      setRecentMeals([]);
      setTodayNutrition({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistoryData();
    setRefreshing(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateString === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateString === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getDaysInCurrentWeek = () => {
    const today = new Date();
    const currentDay = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay + 1); // Monday

    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  const weekDays = getDaysInCurrentWeek();

  const renderWeeklyChart = () => (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>Weekly Overview</Text>
      <View style={styles.chart}>
        {WEEKLY_DATA.map((data, index) => {
          const percentage = (data.calories / data.goal) * 100;
          const height = Math.max((percentage / 100) * 120, 10);
          const isToday = weekDays[index] === new Date().toISOString().split('T')[0];
          
          return (
            <TouchableOpacity
              key={data.day}
              style={styles.chartBar}
              onPress={() => setSelectedDate(weekDays[index])}
            >
              <View style={styles.barContainer}>
                <LinearGradient
                  colors={percentage >= 100 ? ['#4CAF50', '#45a049'] : ['#FF9800', '#FF8F00']}
                  style={[styles.bar, { height }]}
                />
                <View style={[styles.goalLine, { bottom: 120 }]} />
              </View>
              <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>
                {data.day}
              </Text>
              <Text style={styles.barValue}>{data.calories}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.chartLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>Goal Met</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#FF9800' }]} />
          <Text style={styles.legendText}>Under Goal</Text>
        </View>
      </View>
    </View>
  );

  const renderStatCard = (title: string, value: string | number, icon: string, color: string) => (
    <View style={styles.statCard}>
      <LinearGradient
        colors={[color, `${color}CC`]}
        style={styles.statGradient}
      >
        <Ionicons name={icon as any} size={24} color="#fff" />
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle}>{title}</Text>
      </LinearGradient>
    </View>
  );

  const renderDateSelector = () => (
    <View style={styles.dateSelector}>
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => {
          const prevDate = new Date(selectedDate);
          prevDate.setDate(prevDate.getDate() - 1);
          setSelectedDate(prevDate.toISOString().split('T')[0]);
        }}
      >
        <Ionicons name="chevron-back" size={20} color="#666" />
      </TouchableOpacity>
      
      <Text style={styles.selectedDate}>{formatDate(selectedDate)}</Text>
      
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => {
          const nextDate = new Date(selectedDate);
          nextDate.setDate(nextDate.getDate() + 1);
          if (nextDate <= new Date()) {
            setSelectedDate(nextDate.toISOString().split('T')[0]);
          }
        }}
      >
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
    </View>
  );

  const totalCaloriesForDate = mealsForDate.reduce((sum, meal) => sum + meal.calories, 0);
  const totalProteinForDate = mealsForDate.reduce((sum, meal) => sum + meal.protein, 0);
  const totalCarbsForDate = mealsForDate.reduce((sum, meal) => sum + meal.carbs, 0);
  const totalFatForDate = mealsForDate.reduce((sum, meal) => sum + meal.fat, 0);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
          <Text style={styles.subtitle}>Track your nutrition journey</Text>
        </View>

        {/* Time Period Selector */}
        <View style={styles.periodSelector}>
          {TIME_PERIODS.map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[
                styles.periodText,
                selectedPeriod === period && styles.periodTextActive
              ]}>
                {period}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Weekly Chart */}
        {selectedPeriod === 'Week' && renderWeeklyChart()}

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          {renderStatCard('Avg Calories', weeklyStats.avgCalories, 'flame', '#FF6B6B')}
          {renderStatCard('Total Meals', weeklyStats.totalMeals, 'restaurant', '#4CAF50')}
          {renderStatCard('Streak Days', weeklyStats.streakDays, 'trending-up', '#42A5F5')}
          {renderStatCard('Goal Rate', `${weeklyStats.goalHitRate}%`, 'trophy', '#FFA726')}
        </View>

        {/* Date-specific View */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Details</Text>
          
          {renderDateSelector()}
          
          {/* Daily Summary */}
          <View style={styles.dailySummary}>
            <LinearGradient
              colors={['#4CAF50', '#45a049']}
              style={styles.summaryGradient}
            >
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{Math.round(totalCaloriesForDate)}</Text>
                  <Text style={styles.summaryLabel}>Calories</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{Math.round(totalProteinForDate)}g</Text>
                  <Text style={styles.summaryLabel}>Protein</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{Math.round(totalCarbsForDate)}g</Text>
                  <Text style={styles.summaryLabel}>Carbs</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryValue}>{Math.round(totalFatForDate)}g</Text>
                  <Text style={styles.summaryLabel}>Fat</Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          {/* Meals for Selected Date */}
          {mealsForDate.length > 0 ? (
            <View style={styles.mealsContainer}>
              <Text style={styles.mealsTitle}>
                Meals for {formatDate(selectedDate)} ({mealsForDate.length})
              </Text>
              {mealsForDate.map((meal, index) => (
                <RecentMealCard key={index} meal={meal} />
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No meals for {formatDate(selectedDate)}</Text>
              <Text style={styles.emptySubtext}>
                {selectedDate === new Date().toISOString().split('T')[0] 
                  ? 'Start tracking your meals today!'
                  : 'No meals were logged on this date'
                }
              </Text>
            </View>
          )}
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
    padding: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  periodSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#4CAF50',
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  periodTextActive: {
    color: '#fff',
  },
  chartContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 160,
    marginBottom: 16,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
  },
  barContainer: {
    position: 'relative',
    width: 24,
    height: 120,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 10,
  },
  goalLine: {
    position: 'absolute',
    width: '120%',
    height: 1,
    backgroundColor: '#ccc',
    left: '-10%',
  },
  barLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontWeight: '500',
  },
  barLabelToday: {
    color: '#4CAF50',
    fontWeight: '700',
  },
  barValue: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  statGradient: {
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 8,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dateButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  dailySummary: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
  },
  summaryGradient: {
    padding: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  mealsContainer: {
    paddingHorizontal: 20,
  },
  mealsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
}); 