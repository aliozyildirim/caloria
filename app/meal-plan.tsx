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
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import ApiService from '../lib/api';

const { width } = Dimensions.get('window');

interface MealPlan {
  id: number;
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  planned_food_name: string;
  planned_calories: number;
  planned_protein: number;
  planned_carbs: number;
  planned_fat: number;
  instructions?: string;
  is_completed: boolean;
  actual_calories?: number;
  actual_protein?: number;
  actual_carbs?: number;
  actual_fat?: number;
  notes?: string;
  diet_plan_name?: string;
  diet_type?: string;
}

const MEAL_TYPE_EMOJIS = {
  breakfast: '🌅',
  lunch: '🍽️',
  dinner: '🌙',
  snack: '🍿'
};

const MEAL_TYPE_NAMES = {
  breakfast: 'Kahvaltı',
  lunch: 'Öğle Yemeği',
  dinner: 'Akşam Yemeği',
  snack: 'Atıştırmalık'
};

const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export default function MealPlanScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [weekDates, setWeekDates] = useState<string[]>([]);

  useEffect(() => {
    loadMealPlans();
    // Set today as selected day initially
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const mondayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to Monday = 0
    setSelectedDayIndex(mondayIndex);
  }, [selectedWeek]);

  const loadMealPlans = async () => {
    try {
      setIsLoading(true);
      
      // Calculate week dates - same logic as backend
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days to Monday
      
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() + daysToMonday + (selectedWeek * 7));
      
      const dates: string[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        dates.push(date.toISOString().split('T')[0]);
      }
      setWeekDates(dates);
      
      console.log('=== FRONTEND MEAL PLANS DEBUG ===');
      console.log('Selected week offset:', selectedWeek);
      console.log('Today:', today.toISOString().split('T')[0]);
      console.log('Day of week:', dayOfWeek, '(0=Sun, 1=Mon, etc.)');
      console.log('Days to Monday:', daysToMonday);
      console.log('Calculated week dates:', dates);
      console.log('Start of week:', dates[0]);
      console.log('End of week:', dates[6]);
      
      // Load meal plans for the week with weekOffset
      console.log('Calling API with weekOffset:', selectedWeek);
      const plans = await ApiService.getMealPlans('week', selectedWeek);
      console.log('API returned meal plans:', plans?.length || 0);
      
      if (plans && plans.length > 0) {
        console.log('First plan date:', plans[0].date);
        console.log('Last plan date:', plans[plans.length - 1].date);
        
        // Group by date for debugging
        const byDate = plans.reduce((acc: any, plan: any) => {
          // Handle both string and Date object formats
          const date = plan.date instanceof Date 
            ? plan.date.toISOString().split('T')[0] 
            : (typeof plan.date === 'string' ? plan.date.split('T')[0] : plan.date);
          acc[date] = (acc[date] || 0) + 1;
          return acc;
        }, {});
        console.log('Received plans by date:', byDate);
        console.log('Expected dates:', dates);
        
        // Check if received dates match expected dates
        const receivedDates = Object.keys(byDate).sort();
        const expectedDates = dates.sort();
        console.log('Date match check:');
        console.log('- Expected:', expectedDates);
        console.log('- Received:', receivedDates);
        console.log('- Match:', JSON.stringify(expectedDates) === JSON.stringify(receivedDates));
      }
      
      setMealPlans(plans || []);
      
    } catch (error) {
      console.error('Error loading meal plans:', error);
      Alert.alert('Hata', 'Yemek planları yüklenemedi. Henüz aktif diyet planınız yok olabilir.');
      setMealPlans([]);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMealPlans();
    setRefreshing(false);
  };

  const handleGeneratePlans = async () => {
    Alert.alert(
      'Yemek Planları Oluştur',
      'Aktif diyet planınız için yemek planları oluşturulsun mu? Bu işlem mevcut planları değiştirebilir.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Oluştur',
          onPress: async () => {
            try {
              setIsLoading(true);
              const result = await ApiService.generateMealPlans();
              Alert.alert('Başarılı!', `${result.totalPlans} yemek planı oluşturuldu!`);
              loadMealPlans();
            } catch (error) {
              console.error('Error generating meal plans:', error);
              Alert.alert('Hata', 'Yemek planları oluşturulamadı. Aktif diyet planınız olduğundan emin olun.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleCompleteMeal = async (mealPlan: MealPlan) => {
    // Check if meal date is in the future
    const mealDate = new Date(mealPlan.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    mealDate.setHours(0, 0, 0, 0);
    
    if (mealDate > today) {
      Alert.alert(
        'Gelecek Tarih',
        'Gelecek günlerin öğünlerini şimdiden tamamlayamazsınız. Lütfen öğün gününü bekleyin.',
        [{ text: 'Tamam', style: 'default' }]
      );
      return;
    }
    
    Alert.alert(
      'Öğünü Tamamla',
      `"${mealPlan.planned_food_name}" öğününüz tamamlandı mı?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Tamamlandı',
          onPress: async () => {
            try {
              const result = await ApiService.completeMealPlan(mealPlan.id, {
                actualCalories: mealPlan.planned_calories,
                actualProtein: mealPlan.planned_protein,
                actualCarbs: mealPlan.planned_carbs,
                actualFat: mealPlan.planned_fat,
                notes: 'Plan uygulandı'
              });
              
              // Show success message with calorie info
              const calorieMessage = result.calories ? ` (${result.calories} kalori eklendi)` : '';
              Alert.alert('Başarılı! 🎉', `Öğün tamamlandı ve kalori takibinize eklendi!${calorieMessage}`);
              
              // Refresh meal plans
              loadMealPlans();
              
              // Trigger homepage refresh by navigating and coming back
              // This ensures the homepage will refresh when user goes back
              router.replace('/meal-plan');
              
            } catch (error: any) {
              console.error('Error completing meal:', error);
              
              // Better error handling
              let errorMessage = 'Öğün tamamlanamadı.';
              
              if (error.message && error.message.includes('404')) {
                errorMessage = 'Öğün bulunamadı. Sayfa yenilenecek.';
                // Refresh the page if meal not found
                loadMealPlans();
              } else if (error.response?.data?.error) {
                errorMessage = error.response.data.error;
              } else if (typeof error === 'string') {
                errorMessage = error;
              }
              
              Alert.alert('Hata', errorMessage);
            }
          }
        }
      ]
    );
  };

  const getMealsForDate = (date: string) => {
    return mealPlans.filter(plan => {
      // Handle both string and Date object formats
      const planDate = (plan.date as any) instanceof Date 
        ? (plan.date as any).toISOString().split('T')[0] 
        : (typeof plan.date === 'string' ? plan.date.split('T')[0] : plan.date);
      return planDate === date;
    });
  };

  const safeMealData = (meal: any) => {
    return {
      id: meal?.id || Math.random(),
      meal_type: (meal?.meal_type || 'breakfast') as 'breakfast' | 'lunch' | 'dinner' | 'snack',
      planned_food_name: String(meal?.planned_food_name || 'Yemek adı yok'),
      planned_calories: String(Number(meal?.planned_calories) || 0),
      planned_protein: String(Number(meal?.planned_protein) || 0),
      planned_carbs: String(Number(meal?.planned_carbs) || 0),
      planned_fat: String(Number(meal?.planned_fat) || 0),
      is_completed: Boolean(meal?.is_completed),
      instructions: meal?.instructions ? String(meal.instructions) : null
    };
  };

  const getWeekTitle = () => {
    if (selectedWeek === 0) return 'Bu Hafta';
    if (selectedWeek === -1) return 'Geçen Hafta';
    if (selectedWeek === 1) return 'Gelecek Hafta';
    return selectedWeek > 0 ? `${selectedWeek} Hafta Sonra` : `${Math.abs(selectedWeek)} Hafta Önce`;
  };

  const formatDate = (dateString: string, dayIndex: number) => {
    if (!dateString) {
      return {
        dayName: DAY_NAMES[dayIndex] || 'Gün',
        dayNumber: '?',
        isToday: false
      };
    }
    
    try {
      const date = new Date(dateString);
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      
      const dayNumber = date.getDate();
      
      return {
        dayName: DAY_NAMES[dayIndex] || 'Gün',
        dayNumber,
        isToday
      };
    } catch (error) {
      console.error('Date formatting error:', error);
      return {
        dayName: DAY_NAMES[dayIndex] || 'Gün',
        dayNumber: '?',
        isToday: false
      };
    }
  };

  const selectedDate = weekDates[selectedDayIndex];
  const selectedDayMeals = selectedDate ? getMealsForDate(selectedDate) : [];

  if (isLoading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#667eea', '#764ba2', '#6B73FF']}
          style={styles.backgroundGradient}
        >
          <SafeAreaView style={styles.safeAreaContainer}>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingEmoji}>📅</Text>
              <Text style={styles.loadingText}>Yemek Planları Yükleniyor...</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2', '#6B73FF']}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.safeAreaContainer}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>📅 Yemek Planım</Text>
            <TouchableOpacity 
              style={styles.generateButton} 
              onPress={handleGeneratePlans}
            >
              <Ionicons name="refresh" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Week Navigation */}
          <View style={styles.weekNavigation}>
            <TouchableOpacity 
              style={styles.weekNavButton}
              onPress={() => setSelectedWeek(selectedWeek - 1)}
            >
              <Ionicons name="chevron-back" size={20} color="white" />
            </TouchableOpacity>
            
            <Text style={styles.weekTitle}>{getWeekTitle()}</Text>
            
            <TouchableOpacity 
              style={styles.weekNavButton}
              onPress={() => setSelectedWeek(selectedWeek + 1)}
            >
              <Ionicons name="chevron-forward" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Day Tabs */}
          <View style={styles.dayTabsContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dayTabsScrollContainer}
            >
              {weekDates.map((date, index) => {
                const dateInfo = formatDate(date, index);
                const isSelected = index === selectedDayIndex;
                
                return (
                  <TouchableOpacity
                    key={date || index}
                    style={[
                      styles.dayTab,
                      isSelected && styles.dayTabSelected,
                      dateInfo.isToday && styles.dayTabToday
                    ]}
                    onPress={() => setSelectedDayIndex(index)}
                  >
                    <Text style={[
                      styles.dayTabName,
                      isSelected && styles.dayTabNameSelected,
                      dateInfo.isToday && styles.dayTabNameToday
                    ]}>
                      {dateInfo.dayName}
                    </Text>
                    <Text style={[
                      styles.dayTabNumber,
                      isSelected && styles.dayTabNumberSelected,
                      dateInfo.isToday && styles.dayTabNumberToday
                    ]}>
                      {dateInfo.dayNumber}
                    </Text>
                    {dateInfo.isToday && (
                      <View style={styles.todayDot} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Meals Content */}
          <ScrollView 
            style={styles.mealsScrollView}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="white" />
            }
          >
            {/* No Plans Message */}
            {selectedDayMeals.length === 0 && (
              <View style={styles.noPlansContainer}>
                <Text style={styles.noPlansEmoji}>🍽️</Text>
                <Text style={styles.noPlansTitle}>Bu Gün İçin Plan Yok</Text>
                <Text style={styles.noPlansText}>
                  {selectedDate ? 
                    'Bu güne ait yemek planı bulunmuyor.' : 
                    'Aktif diyet planınız için yemek planları oluşturmak ister misiniz?'
                  }
                </Text>
                {!selectedDate && (
                  <TouchableOpacity 
                    style={styles.generatePlansButton}
                    onPress={handleGeneratePlans}
                  >
                    <Text style={styles.generatePlansButtonText}>Plan Oluştur</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Selected Day Meals */}
            {selectedDayMeals.length > 0 && (
              <View style={styles.selectedDayContainer}>
                {selectedDayMeals
                  .filter(meal => meal && meal.id)
                  // Remove duplicates based on meal_type
                  .filter((meal, index, self) => 
                    index === self.findIndex((m) => m.meal_type === meal.meal_type)
                  )
                  .map((mealRaw) => {
                  try {
                    const meal = safeMealData(mealRaw);
                    
                    // Check if meal is in the future
                    const mealDate = new Date(selectedDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    mealDate.setHours(0, 0, 0, 0);
                    const isFuture = mealDate > today;
                    
                    return (
                      <TouchableOpacity
                        key={`meal-${meal.id}-${selectedDate}`}
                        style={[
                          styles.mealCard, 
                          meal.is_completed && styles.completedMealCard,
                          isFuture && styles.futureMealCard
                        ]}
                        onPress={() => handleCompleteMeal(mealRaw)}
                        disabled={isFuture}
                        activeOpacity={isFuture ? 1 : 0.7}
                      >
                        <LinearGradient
                          colors={meal.is_completed 
                            ? ['#4CAF50', '#45a049'] 
                            : ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
                          style={styles.mealCardGradient}
                        >
                          <View style={styles.mealHeader}>
                            <View style={styles.mealTypeContainer}>
                              <Text style={styles.mealEmoji}>
                                {MEAL_TYPE_EMOJIS[meal.meal_type as keyof typeof MEAL_TYPE_EMOJIS] || '🍽️'}
                              </Text>
                              <Text style={styles.mealType}>
                                {MEAL_TYPE_NAMES[meal.meal_type as keyof typeof MEAL_TYPE_NAMES] || 'Öğün'}
                              </Text>
                            </View>
                            {meal.is_completed && (
                              <View style={styles.completedBadge}>
                                <Ionicons name="checkmark-circle" size={20} color="white" />
                              </View>
                            )}
                          </View>

                          <Text style={styles.mealName}>
                            {meal.planned_food_name}
                          </Text>
                          
                          <View style={styles.nutritionRow}>
                            <View style={styles.nutritionItem}>
                              <Text style={styles.nutritionValue}>
                                {meal.planned_calories}
                              </Text>
                              <Text style={styles.nutritionLabel}>kcal</Text>
                            </View>
                            <View style={styles.nutritionItem}>
                              <Text style={styles.nutritionValue}>
                                {meal.planned_protein}g
                              </Text>
                              <Text style={styles.nutritionLabel}>protein</Text>
                            </View>
                            <View style={styles.nutritionItem}>
                              <Text style={styles.nutritionValue}>
                                {meal.planned_carbs}g
                              </Text>
                              <Text style={styles.nutritionLabel}>karbonhidrat</Text>
                            </View>
                            <View style={styles.nutritionItem}>
                              <Text style={styles.nutritionValue}>
                                {meal.planned_fat}g
                              </Text>
                              <Text style={styles.nutritionLabel}>yağ</Text>
                            </View>
                          </View>

                          {meal.instructions && (
                            <Text style={styles.instructions} numberOfLines={2}>
                              💡 {meal.instructions}
                            </Text>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    );
                  } catch (mealError) {
                    console.error('Meal render error:', mealError);
                    return (
                      <View key={`error-meal-${mealRaw?.id || Math.random()}`} style={styles.mealCard}>
                        <Text style={styles.mealName}>Yemek yüklenemedi</Text>
                      </View>
                    );
                  }
                })}
              </View>
            )}

            <View style={styles.bottomPadding} />
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
  safeAreaContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  generateButton: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  weekNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  weekNavButton: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 15,
  },
  weekTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  dayTabsContainer: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  dayTabsScrollContainer: {
    paddingHorizontal: 10,
    gap: 10,
  },
  dayTab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    alignItems: 'center',
    minWidth: 70,
    position: 'relative',
  },
  dayTabSelected: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  dayTabToday: {
    backgroundColor: '#4CAF50',
  },
  dayTabName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  dayTabNameSelected: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  dayTabNameToday: {
    color: 'white',
    fontWeight: 'bold',
  },
  dayTabNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 2,
  },
  dayTabNumberSelected: {
    color: '#4CAF50',
  },
  dayTabNumberToday: {
    color: 'white',
  },
  todayDot: {
    position: 'absolute',
    bottom: -5,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
  },
  mealsScrollView: {
    flex: 1,
  },
  selectedDayContainer: {
    padding: 20,
    gap: 15,
  },
  mealCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  completedMealCard: {
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  futureMealCard: {
    opacity: 0.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  mealCardGradient: {
    padding: 20,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  mealTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  mealType: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  mealName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },
  nutritionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  nutritionItem: {
    alignItems: 'center',
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  nutritionLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  completedBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 15,
    padding: 5,
  },
  instructions: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  noPlansContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noPlansEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  noPlansTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 10,
  },
  noPlansText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  generatePlansButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  generatePlansButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingEmoji: {
    fontSize: 48,
    marginBottom: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  bottomPadding: {
    height: 50,
  },
}); 