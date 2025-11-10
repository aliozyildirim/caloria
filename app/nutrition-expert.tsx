import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Dimensions, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../lib/ThemeProvider';
import ApiService from '../lib/api';
import NutritionChatScreen from './nutrition-chat';
import { Animated } from 'react-native';
import { Alert } from 'react-native';

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
  const [activeTab, setActiveTab] = useState<'advice' | 'analysis' | 'plan' | 'chat'>('advice');

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

  const renderAdviceTab = () => {
    if (!dailyAdvice) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Günlük beslenme önerisi bulunamadı.</Text>
        </View>
      );
    }

    return (
      <View style={styles.adviceContainer}>
        <View style={styles.overview}>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewTitle}>Kalori Durumu</Text>
            <Text style={styles.overviewValue}>{dailyAdvice.overview.calorieStatus}%</Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewTitle}>Protein Durumu</Text>
            <Text style={styles.overviewValue}>{dailyAdvice.overview.proteinStatus}%</Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewTitle}>Karbonhidrat Durumu</Text>
            <Text style={styles.overviewValue}>{dailyAdvice.overview.carbsStatus}%</Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewTitle}>Yağ Durumu</Text>
            <Text style={styles.overviewValue}>{dailyAdvice.overview.fatStatus}%</Text>
          </View>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewTitle}>Bugünkü Yemek Sayısı</Text>
            <Text style={styles.overviewValue}>{dailyAdvice.overview.mealsToday}</Text>
          </View>
        </View>

        <View style={styles.recommendations}>
          <Text style={styles.sectionTitle}>Öneriler</Text>
          {dailyAdvice.recommendations.map((item, index) => (
            <View key={index} style={styles.recommendationItem}>
              <View style={styles.recommendationIcon}>
                <Ionicons name={item.icon as any} size={24} color={theme.accentColor} />
              </View>
              <View style={styles.recommendationContent}>
                <Text style={styles.recommendationTitle}>{item.title}</Text>
                <Text style={styles.recommendationMessage}>{item.message}</Text>
                <Text style={styles.recommendationPriority}>{item.priority}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.warnings}>
          <Text style={styles.sectionTitle}>Uyarılar</Text>
          {dailyAdvice.warnings.map((item, index) => (
            <View key={index} style={styles.warningItem}>
              <View style={styles.warningIcon}>
                <Ionicons name={item.icon as any} size={24} color={theme.warningColor} />
              </View>
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>{item.title}</Text>
                <Text style={styles.warningMessage}>{item.message}</Text>
                <Text style={styles.warningPriority}>{item.priority}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.tips}>
          <Text style={styles.sectionTitle}>İpuçları</Text>
          {dailyAdvice.tips.map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Ionicons name="bulb-outline" size={24} color={theme.accentColor} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderAnalysisTab = () => {
    if (!analysis) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Beslenme analizi bulunamadı.</Text>
        </View>
      );
    }

    return (
      <View style={styles.analysisContainer}>
        <View style={styles.summary}>
          <Text style={styles.sectionTitle}>Özet</Text>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Ortalama Günlük Kalori</Text>
            <Text style={styles.summaryValue}>{analysis.summary.avgDailyCalories.toFixed(0)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Ortalama Günlük Protein</Text>
            <Text style={styles.summaryValue}>{analysis.summary.avgDailyProtein.toFixed(0)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Ortalama Günlük Karbonhidrat</Text>
            <Text style={styles.summaryValue}>{analysis.summary.avgDailyCarbs.toFixed(0)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Ortalama Günlük Yağ</Text>
            <Text style={styles.summaryValue}>{analysis.summary.avgDailyFat.toFixed(0)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Toplam Yemek Sayısı</Text>
            <Text style={styles.summaryValue}>{analysis.summary.totalMeals}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Analiz Süresi</Text>
            <Text style={styles.summaryValue}>{analysis.summary.daysAnalyzed} Gün</Text>
          </View>
        </View>

        <View style={styles.trends}>
          <Text style={styles.sectionTitle}>Trendler</Text>
          <View style={styles.trendItem}>
            <Text style={styles.trendLabel}>Kalori Uyum Oranı</Text>
            <Text style={styles.trendValue}>{analysis.trends.calorieAdherence}%</Text>
          </View>
          <View style={styles.trendItem}>
            <Text style={styles.trendLabel}>Protein Uyum Oranı</Text>
            <Text style={styles.trendValue}>{analysis.trends.proteinAdherence}%</Text>
          </View>
          <View style={styles.trendItem}>
            <Text style={styles.trendLabel}>Tutarlılık Puanı</Text>
            <Text style={styles.trendValue}>{analysis.trends.consistencyScore.toFixed(0)}</Text>
          </View>
        </View>

        <View style={styles.vitamins}>
          <Text style={styles.sectionTitle}>Vitaminler</Text>
          <View style={styles.vitaminItem}>
            <Text style={styles.vitaminLabel}>Vitamin C</Text>
            <Text style={styles.vitaminValue}>{analysis.vitamins.vitaminC.toFixed(0)}</Text>
          </View>
          <View style={styles.vitaminItem}>
            <Text style={styles.vitaminLabel}>Vitamin D</Text>
            <Text style={styles.vitaminValue}>{analysis.vitamins.vitaminD.toFixed(0)}</Text>
          </View>
          <View style={styles.vitaminItem}>
            <Text style={styles.vitaminLabel}>Vitamin B12</Text>
            <Text style={styles.vitaminValue}>{analysis.vitamins.vitaminB12.toFixed(0)}</Text>
          </View>
          <View style={styles.vitaminItem}>
            <Text style={styles.vitaminLabel}>Folat</Text>
            <Text style={styles.vitaminValue}>{analysis.vitamins.folate.toFixed(0)}</Text>
          </View>
        </View>

        <View style={styles.minerals}>
          <Text style={styles.sectionTitle}>Mineraller</Text>
          <View style={styles.mineralItem}>
            <Text style={styles.mineralLabel}>Demir</Text>
            <Text style={styles.mineralValue}>{analysis.minerals.iron.toFixed(0)}</Text>
          </View>
          <View style={styles.mineralItem}>
            <Text style={styles.mineralLabel}>Kalsiyum</Text>
            <Text style={styles.mineralValue}>{analysis.minerals.calcium.toFixed(0)}</Text>
          </View>
          <View style={styles.mineralItem}>
            <Text style={styles.mineralLabel}>Magnezyum</Text>
            <Text style={styles.mineralValue}>{analysis.minerals.magnesium.toFixed(0)}</Text>
          </View>
          <View style={styles.mineralItem}>
            <Text style={styles.mineralLabel}>Zink</Text>
            <Text style={styles.mineralValue}>{analysis.minerals.zinc.toFixed(0)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderPlanTab = () => {
    return (
      <View style={styles.planContainer}>
        <Text style={styles.sectionTitle}>Beslenme Planı</Text>
        <View style={styles.planItem}>
          <Ionicons name="restaurant" size={24} color={theme.accentColor} />
          <View style={styles.planContent}>
            <Text style={styles.planTitle}>Yemek Seçimi</Text>
            <Text style={styles.planDescription}>
              Günlük beslenme planınızı oluşturmak için önerilen yemekleri seçin.
            </Text>
          </View>
        </View>
        <View style={styles.planItem}>
          <Ionicons name="fitness" size={24} color={theme.accentColor} />
          <View style={styles.planContent}>
            <Text style={styles.planTitle}>Aktivite Seviyesi</Text>
            <Text style={styles.planDescription}>
              Günlük aktivite seviyenize göre beslenme planınızı ayarlayın.
            </Text>
          </View>
        </View>
        <View style={styles.planItem}>
          <Ionicons name="calendar" size={24} color={theme.accentColor} />
          <View style={styles.planContent}>
            <Text style={styles.planTitle}>Takvim</Text>
            <Text style={styles.planDescription}>
              Beslenme planınızı takvimde görüntüleyin ve takip edin.
            </Text>
          </View>
        </View>
      </View>
    );
  };

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
            <TouchableOpacity
              style={[styles.tab, activeTab === 'chat' && styles.activeTab]}
              onPress={() => setActiveTab('chat')}
            >
              <Text style={[styles.tabText, activeTab === 'chat' && styles.activeTabText]}>
                💬 Chat
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
            {activeTab === 'chat' ? (
              <NutritionChatScreen />
            ) : (
              <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
              >
                {activeTab === 'advice' && renderAdviceTab()}
                {activeTab === 'analysis' && renderAnalysisTab()}
                {activeTab === 'plan' && renderPlanTab()}
              </ScrollView>
            )}
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
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    marginHorizontal: 20,
    marginTop: 10,
    paddingVertical: 5,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 15,
  },
  activeTab: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    color: 'black',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  adviceContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  overview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  overviewItem: {
    alignItems: 'center',
  },
  overviewTitle: {
    fontSize: 14,
    color: 'gray',
    marginBottom: 5,
  },
  overviewValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
  },
  recommendations: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: 'black',
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
  },
  recommendationIcon: {
    marginRight: 10,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'black',
  },
  recommendationMessage: {
    fontSize: 14,
    color: 'gray',
    marginTop: 2,
  },
  recommendationPriority: {
    fontSize: 12,
    color: 'white',
    backgroundColor: '#4CAF50',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  warnings: {
    marginBottom: 20,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#fff3cd',
    borderRadius: 10,
  },
  warningIcon: {
    marginRight: 10,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'black',
  },
  warningMessage: {
    fontSize: 14,
    color: 'gray',
    marginTop: 2,
  },
  warningPriority: {
    fontSize: 12,
    color: 'white',
    backgroundColor: '#dc3545',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 5,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  tips: {
    marginBottom: 20,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#e0f7fa',
    borderRadius: 10,
  },
  tipText: {
    marginLeft: 10,
    fontSize: 15,
    color: 'black',
  },
  analysisContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  summary: {
    marginBottom: 20,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 16,
    color: 'gray',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
  },
  trends: {
    marginBottom: 20,
  },
  trendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  trendLabel: {
    fontSize: 16,
    color: 'gray',
  },
  trendValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
  },
  vitamins: {
    marginBottom: 20,
  },
  vitaminItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  vitaminLabel: {
    fontSize: 16,
    color: 'gray',
  },
  vitaminValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
  },
  minerals: {
    marginBottom: 20,
  },
  mineralItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  mineralLabel: {
    fontSize: 16,
    color: 'gray',
  },
  mineralValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'black',
  },
  planContainer: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  planItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
  },
  planContent: {
    marginLeft: 10,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'black',
  },
  planDescription: {
    fontSize: 14,
    color: 'gray',
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
  },
}); 