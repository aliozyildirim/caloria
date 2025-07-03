import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import ApiService from '../lib/api';
import { useTheme } from '../lib/ThemeProvider';

const { width } = Dimensions.get('window');

interface NutritionAdvice {
  overview: {
    calorieStatus: number;
    proteinStatus: number;
    carbsStatus: number;
    fatStatus: number;
    mealsToday: number;
  };
  recommendations: Array<{
    type: string;
    icon: string;
    title: string;
    message: string;
    priority: string;
  }>;
  warnings: Array<{
    type: string;
    icon: string;
    title: string;
    message: string;
    priority: string;
  }>;
  tips: string[];
  score: number;
}

interface NutritionAnalysis {
  summary: {
    avgDailyCalories: number;
    avgDailyProtein: number;
    avgDailyCarbs: number;
    avgDailyFat: number;
    totalMeals: number;
    daysAnalyzed: number;
  };
  trends: {
    calorieAdherence: number;
    proteinAdherence: number;
    consistencyScore: number;
  };
  recommendations: Array<{
    type: string;
    message: string;
    action: string;
  }>;
  vitamins: {
    vitaminC: number;
    vitaminD: number;
    vitaminB12: number;
    folate: number;
  };
  minerals: {
    iron: number;
    calcium: number;
    magnesium: number;
    zinc: number;
  };
}

export default function NutritionExpertScreen() {
  const [dailyAdvice, setDailyAdvice] = useState<NutritionAdvice | null>(null);
  const [analysis, setAnalysis] = useState<NutritionAnalysis | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'advice' | 'analysis' | 'plan'>('advice');

  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    loadNutritionData();
    
    // Animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadNutritionData = async () => {
    try {
      setLoading(true);
      const [adviceData, analysisData] = await Promise.all([
        ApiService.getDailyNutritionAdvice().catch(() => null),
        ApiService.getNutritionAnalysis(7).catch(() => null)
      ]);

      setDailyAdvice(adviceData);
      setAnalysis(analysisData);
    } catch (error) {
      console.error('Error loading nutrition data:', error);
      Alert.alert('Hata', 'Beslenme verileri yüklenirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNutritionData();
    setRefreshing(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#4CAF50';
    if (score >= 60) return '#FFA726';
    return '#FF6B6B';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#FF6B6B';
      case 'medium': return '#FFA726';
      case 'low': return '#4CAF50';
      default: return '#666';
    }
  };

  const handleWeeklyPlan = async () => {
    try {
      const weeklyPlan = await ApiService.getWeeklyNutritionPlan();
      Alert.alert(
        '🗓️ Haftalık Plan',
        `Haftalık beslenme planınız hazır!\n\n📊 Hedefler:\n• ${weeklyPlan.weeklyGoals?.totalCalories || 0} kalori\n• ${weeklyPlan.weeklyGoals?.totalProtein || 0}g protein\n• ${weeklyPlan.weeklyGoals?.workouts || 0} antrenman`,
        [
          { text: 'Tamam', style: 'default' }
        ]
      );
    } catch (error) {
      Alert.alert('Hata', 'Haftalık plan yüklenirken bir hata oluştu');
    }
  };

  const renderAdviceTab = () => (
    <View style={styles.tabContent}>
      {/* Daily Score */}
      <View style={[styles.scoreCard, { backgroundColor: theme.cardColor }]}>
        <LinearGradient
          colors={[getScoreColor(dailyAdvice?.score || 0), `${getScoreColor(dailyAdvice?.score || 0)}AA`]}
          style={styles.scoreGradient}
        >
          <Text style={styles.scoreValue}>{dailyAdvice?.score || 0}</Text>
          <Text style={styles.scoreLabel}>Günlük Beslenme Skoru</Text>
        </LinearGradient>
      </View>

      {/* Overview */}
      <View style={[styles.overviewCard, { backgroundColor: theme.cardColor }]}>
        <Text style={[styles.cardTitle, { color: theme.textColor }]}>📊 Günlük Durum</Text>
        <View style={styles.overviewGrid}>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewEmoji}>🔥</Text>
            <Text style={[styles.overviewValue, { color: theme.textColor }]}>
              {Math.round(dailyAdvice?.overview?.calorieStatus || 0)}%
            </Text>
            <Text style={[styles.overviewLabel, { color: theme.textColor }]}>Kalori</Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewEmoji}>💪</Text>
            <Text style={[styles.overviewValue, { color: theme.textColor }]}>
              {Math.round(dailyAdvice?.overview?.proteinStatus || 0)}%
            </Text>
            <Text style={[styles.overviewLabel, { color: theme.textColor }]}>Protein</Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewEmoji}>🌾</Text>
            <Text style={[styles.overviewValue, { color: theme.textColor }]}>
              {Math.round(dailyAdvice?.overview?.carbsStatus || 0)}%
            </Text>
            <Text style={[styles.overviewLabel, { color: theme.textColor }]}>Karbonhidrat</Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewEmoji}>🥑</Text>
            <Text style={[styles.overviewValue, { color: theme.textColor }]}>
              {Math.round(dailyAdvice?.overview?.fatStatus || 0)}%
            </Text>
            <Text style={[styles.overviewLabel, { color: theme.textColor }]}>Yağ</Text>
          </View>
        </View>
      </View>

      {/* Recommendations */}
      {dailyAdvice?.recommendations && dailyAdvice.recommendations.length > 0 && (
        <View style={[styles.recommendationsCard, { backgroundColor: theme.cardColor }]}>
          <Text style={[styles.cardTitle, { color: theme.textColor }]}>💡 Öneriler</Text>
          {dailyAdvice.recommendations.map((rec, index) => (
            <View key={index} style={styles.recommendationItem}>
              <View style={styles.recommendationHeader}>
                <Text style={styles.recommendationIcon}>{rec.icon}</Text>
                <Text style={[styles.recommendationTitle, { color: theme.textColor }]}>
                  {rec.title}
                </Text>
                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(rec.priority) }]}>
                  <Text style={styles.priorityText}>{rec.priority.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={[styles.recommendationMessage, { color: theme.textColor }]}>
                {rec.message}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Warnings */}
      {dailyAdvice?.warnings && dailyAdvice.warnings.length > 0 && (
        <View style={[styles.warningsCard, { backgroundColor: theme.cardColor }]}>
          <Text style={[styles.cardTitle, { color: theme.textColor }]}>⚠️ Uyarılar</Text>
          {dailyAdvice.warnings.map((warning, index) => (
            <View key={index} style={styles.warningItem}>
              <Text style={styles.warningIcon}>{warning.icon}</Text>
              <View style={styles.warningContent}>
                <Text style={[styles.warningTitle, { color: theme.textColor }]}>
                  {warning.title}
                </Text>
                <Text style={[styles.warningMessage, { color: theme.textColor }]}>
                  {warning.message}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Tips */}
      {dailyAdvice?.tips && dailyAdvice.tips.length > 0 && (
        <View style={[styles.tipsCard, { backgroundColor: theme.cardColor }]}>
          <Text style={[styles.cardTitle, { color: theme.textColor }]}>🎯 Günlük İpuçları</Text>
          {dailyAdvice.tips.map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Text style={[styles.tipText, { color: theme.textColor }]}>{tip}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );

  const renderAnalysisTab = () => (
    <View style={styles.tabContent}>
      {/* Summary */}
      <View style={[styles.summaryCard, { backgroundColor: theme.cardColor }]}>
        <Text style={[styles.cardTitle, { color: theme.textColor }]}>📈 Son 7 Gün Özeti</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: theme.textColor }]}>
              {analysis?.summary?.avgDailyCalories || 0}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.textColor }]}>Ortalama Kalori</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: theme.textColor }]}>
              {analysis?.summary?.avgDailyProtein || 0}g
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.textColor }]}>Ortalama Protein</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: theme.textColor }]}>
              {analysis?.summary?.totalMeals || 0}
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.textColor }]}>Toplam Öğün</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: theme.textColor }]}>
              {analysis?.trends?.consistencyScore || 0}%
            </Text>
            <Text style={[styles.summaryLabel, { color: theme.textColor }]}>Tutarlılık</Text>
          </View>
        </View>
      </View>

      {/* Vitamins & Minerals */}
      <View style={[styles.vitaminsCard, { backgroundColor: theme.cardColor }]}>
        <Text style={[styles.cardTitle, { color: theme.textColor }]}>🧪 Vitamin & Mineral Analizi</Text>
        
        <Text style={[styles.sectionSubtitle, { color: theme.textColor }]}>Vitaminler</Text>
        <View style={styles.nutrientGrid}>
          <View style={styles.nutrientItem}>
            <Text style={[styles.nutrientName, { color: theme.textColor }]}>Vitamin C</Text>
            <View style={styles.nutrientBar}>
              <View style={[styles.nutrientFill, { width: `${analysis?.vitamins?.vitaminC || 0}%`, backgroundColor: '#FF6B6B' }]} />
            </View>
            <Text style={[styles.nutrientValue, { color: theme.textColor }]}>{analysis?.vitamins?.vitaminC || 0}%</Text>
          </View>
          <View style={styles.nutrientItem}>
            <Text style={[styles.nutrientName, { color: theme.textColor }]}>Vitamin D</Text>
            <View style={styles.nutrientBar}>
              <View style={[styles.nutrientFill, { width: `${analysis?.vitamins?.vitaminD || 0}%`, backgroundColor: '#FFA726' }]} />
            </View>
            <Text style={[styles.nutrientValue, { color: theme.textColor }]}>{analysis?.vitamins?.vitaminD || 0}%</Text>
          </View>
        </View>

        <Text style={[styles.sectionSubtitle, { color: theme.textColor }]}>Mineraller</Text>
        <View style={styles.nutrientGrid}>
          <View style={styles.nutrientItem}>
            <Text style={[styles.nutrientName, { color: theme.textColor }]}>Demir</Text>
            <View style={styles.nutrientBar}>
              <View style={[styles.nutrientFill, { width: `${analysis?.minerals?.iron || 0}%`, backgroundColor: '#4CAF50' }]} />
            </View>
            <Text style={[styles.nutrientValue, { color: theme.textColor }]}>{analysis?.minerals?.iron || 0}%</Text>
          </View>
          <View style={styles.nutrientItem}>
            <Text style={[styles.nutrientName, { color: theme.textColor }]}>Kalsiyum</Text>
            <View style={styles.nutrientBar}>
              <View style={[styles.nutrientFill, { width: `${analysis?.minerals?.calcium || 0}%`, backgroundColor: '#42A5F5' }]} />
            </View>
            <Text style={[styles.nutrientValue, { color: theme.textColor }]}>{analysis?.minerals?.calcium || 0}%</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderPlanTab = () => (
    <View style={styles.tabContent}>
      <View style={[styles.planCard, { backgroundColor: theme.cardColor }]}>
        <Text style={[styles.cardTitle, { color: theme.textColor }]}>🎯 Beslenme Planları</Text>
        
        <TouchableOpacity style={styles.planButton} onPress={handleWeeklyPlan}>
          <LinearGradient
            colors={['#4CAF50', '#45a049']}
            style={styles.planGradient}
          >
            <Ionicons name="calendar" size={24} color="#fff" />
            <View style={styles.planContent}>
              <Text style={styles.planTitle}>Haftalık Plan</Text>
              <Text style={styles.planSubtitle}>AI ile kişiselleştirilmiş 7 günlük plan</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.planButton} onPress={() => Alert.alert('🔜 Çok Yakında', 'Bu özellik geliştiriliyor!')}>
          <LinearGradient
            colors={['#42A5F5', '#1976D2']}
            style={styles.planGradient}
          >
            <Ionicons name="restaurant" size={24} color="#fff" />
            <View style={styles.planContent}>
              <Text style={styles.planTitle}>Özel Diyet Planı</Text>
              <Text style={styles.planSubtitle}>Hedefinize özel beslenme programı</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.planButton} onPress={() => Alert.alert('🔜 Çok Yakında', 'Bu özellik geliştiriliyor!')}>
          <LinearGradient
            colors={['#FFA726', '#FF7043']}
            style={styles.planGradient}
          >
            <Ionicons name="fitness" size={24} color="#fff" />
            <View style={styles.planContent}>
              <Text style={styles.planTitle}>Antrenman + Beslenme</Text>
              <Text style={styles.planSubtitle}>Egzersiz programı ile entegre plan</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.backgroundGradient}
        >
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.title}>🧠 Beslenme Uzmanı</Text>
              <View style={styles.placeholder} />
            </View>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>AI analiz yapıyor...</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.backgroundGradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.title}>🧠 Beslenme Uzmanı</Text>
            <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
              <Ionicons name="refresh" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'advice' && styles.activeTab]}
              onPress={() => setActiveTab('advice')}
            >
              <Text style={[styles.tabText, activeTab === 'advice' && styles.activeTabText]}>
                💡 Günlük
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'analysis' && styles.activeTab]}
              onPress={() => setActiveTab('analysis')}
            >
              <Text style={[styles.tabText, activeTab === 'analysis' && styles.activeTabText]}>
                📊 Analiz
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'plan' && styles.activeTab]}
              onPress={() => setActiveTab('plan')}
            >
              <Text style={[styles.tabText, activeTab === 'plan' && styles.activeTabText]}>
                🎯 Planlar
              </Text>
            </TouchableOpacity>
          </View>

          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <ScrollView
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
              showsVerticalScrollIndicator={false}
            >
              {activeTab === 'advice' && renderAdviceTab()}
              {activeTab === 'analysis' && renderAnalysisTab()}
              {activeTab === 'plan' && renderPlanTab()}
            </ScrollView>
          </Animated.View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: 'white',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: 'white',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  scoreCard: {
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
  },
  scoreGradient: {
    padding: 30,
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  overviewCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  overviewGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overviewItem: {
    alignItems: 'center',
    flex: 1,
  },
  overviewEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  overviewValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  recommendationsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  recommendationItem: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  recommendationMessage: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  warningsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
    marginBottom: 12,
  },
  warningIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  warningMessage: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
  },
  tipsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  tipItem: {
    padding: 12,
    backgroundColor: 'rgba(66, 165, 245, 0.1)',
    borderRadius: 12,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryItem: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
    padding: 16,
    backgroundColor: 'rgba(103, 126, 234, 0.1)',
    borderRadius: 12,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  vitaminsCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 12,
  },
  nutrientGrid: {
    marginBottom: 16,
  },
  nutrientItem: {
    marginBottom: 16,
  },
  nutrientName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
  },
  nutrientBar: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  nutrientFill: {
    height: '100%',
    borderRadius: 4,
  },
  nutrientValue: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right',
  },
  planCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  planButton: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  planGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  planContent: {
    marginLeft: 16,
    flex: 1,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  planSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
}); 