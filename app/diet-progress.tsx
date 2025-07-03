import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import ApiService, { WeightProgress } from '../lib/api';

const { width } = Dimensions.get('window');

export default function DietProgressScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'all'>('month');
  const [progressData, setProgressData] = useState<WeightProgress | null>(null);

  useEffect(() => {
    loadProgressData();
  }, [selectedPeriod]);

  const loadProgressData = async () => {
    try {
      setIsLoading(true);
      const data = await ApiService.getWeightProgress(selectedPeriod);
      setProgressData(data);
    } catch (error) {
      console.error('Error loading progress data:', error);
      Alert.alert('Hata', 'İlerleme verileri yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateBMI = (weight: number, height: number = 175) => {
    const heightInMeters = height / 100;
    return weight / (heightInMeters * heightInMeters);
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { category: 'Zayıf', color: '#2196F3' };
    if (bmi < 25) return { category: 'Normal', color: '#4CAF50' };
    if (bmi < 30) return { category: 'Fazla Kilolu', color: '#FF9800' };
    return { category: 'Obez', color: '#F44336' };
  };

  const renderWeightChart = () => {
    if (!progressData || progressData.weightEntries.length === 0) return null;

    const maxWeight = Math.max(...progressData.weightEntries.map(e => e.weight));
    const minWeight = Math.min(...progressData.weightEntries.map(e => e.weight));
    const weightRange = maxWeight - minWeight || 1;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Kilo Takibi</Text>
        <View style={styles.chart}>
          {progressData.weightEntries.map((entry, index) => {
            const height = ((entry.weight - minWeight) / weightRange) * 100;
            const isLast = index === progressData.weightEntries.length - 1;
            
            return (
              <View key={index} style={styles.chartBar}>
                <Text style={styles.chartValue}>{entry.weight}kg</Text>
                <View style={styles.barContainer}>
                  <View 
                    style={[
                      styles.bar, 
                      { 
                        height: `${Math.max(height, 10)}%`,
                        backgroundColor: isLast ? '#4CAF50' : '#667eea'
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.chartLabel}>
                  {new Date(entry.date).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderAdherenceChart = () => {
    if (!progressData || progressData.adherenceScores.length === 0) return null;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Uyum Skoru (Son 7 Gün)</Text>
        <View style={styles.chart}>
          {progressData.adherenceScores.map((entry, index) => {
            const height = (entry.score / 10) * 100;
            const color = entry.score >= 8 ? '#4CAF50' : entry.score >= 6 ? '#FF9800' : '#F44336';
            
            return (
              <View key={index} style={styles.chartBar}>
                <Text style={styles.chartValue}>{entry.score}</Text>
                <View style={styles.barContainer}>
                  <View 
                    style={[
                      styles.bar, 
                      { 
                        height: `${Math.max(height, 10)}%`,
                        backgroundColor: color
                      }
                    ]} 
                  />
                </View>
                <Text style={styles.chartLabel}>
                  {new Date(entry.date).toLocaleDateString('tr-TR', { weekday: 'short' })}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderStats = () => {
    if (!progressData) return null;

    const currentBMI = calculateBMI(progressData.currentWeight);
    const bmiInfo = getBMICategory(currentBMI);
    const progressPercentage = ((progressData.startWeight - progressData.currentWeight) / 
                              (progressData.startWeight - progressData.targetWeight)) * 100;

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <LinearGradient colors={['#4CAF50', '#45a049']} style={styles.statGradient}>
            <Ionicons name="scale" size={24} color="white" />
            <Text style={styles.statValue}>{progressData.weightLoss}kg</Text>
            <Text style={styles.statLabel}>Verilen Kilo</Text>
          </LinearGradient>
        </View>

        <View style={styles.statCard}>
          <LinearGradient colors={['#2196F3', '#1976D2']} style={styles.statGradient}>
            <Ionicons name="fitness" size={24} color="white" />
            <Text style={styles.statValue}>{progressData.averageAdherence.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Ortalama Uyum</Text>
          </LinearGradient>
        </View>

        <View style={styles.statCard}>
          <LinearGradient colors={['#FF9800', '#F57C00']} style={styles.statGradient}>
            <Ionicons name="calendar" size={24} color="white" />
            <Text style={styles.statValue}>{progressData.completedDays}</Text>
            <Text style={styles.statLabel}>Tamamlanan Gün</Text>
          </LinearGradient>
        </View>

        <View style={styles.statCard}>
          <LinearGradient colors={[bmiInfo.color, bmiInfo.color]} style={styles.statGradient}>
            <Ionicons name="body" size={24} color="white" />
            <Text style={styles.statValue}>{currentBMI.toFixed(1)}</Text>
            <Text style={styles.statLabel}>BMI - {bmiInfo.category}</Text>
          </LinearGradient>
        </View>
      </View>
    );
  };

  const renderProgressRing = () => {
    if (!progressData) return null;

    const progressPercentage = Math.min(
      ((progressData.startWeight - progressData.currentWeight) / 
       (progressData.startWeight - progressData.targetWeight)) * 100,
      100
    );

    return (
      <View style={styles.progressRingContainer}>
        <Text style={styles.progressTitle}>Hedefe İlerleme</Text>
        <View style={styles.progressRing}>
          <View style={styles.progressRingInner}>
            <Text style={styles.progressPercentage}>{Math.round(progressPercentage)}%</Text>
            <Text style={styles.progressSubtext}>Tamamlandı</Text>
          </View>
        </View>
        <View style={styles.progressDetails}>
          <View style={styles.progressDetail}>
            <Text style={styles.progressDetailLabel}>Başlangıç</Text>
            <Text style={styles.progressDetailValue}>{progressData.startWeight}kg</Text>
          </View>
          <View style={styles.progressDetail}>
            <Text style={styles.progressDetailLabel}>Şu an</Text>
            <Text style={styles.progressDetailValue}>{progressData.currentWeight}kg</Text>
          </View>
          <View style={styles.progressDetail}>
            <Text style={styles.progressDetailLabel}>Hedef</Text>
            <Text style={styles.progressDetailValue}>{progressData.targetWeight}kg</Text>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.backgroundGradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.loadingText}>İlerleme verileri yükleniyor...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.backgroundGradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>Diyet İlerlemesi</Text>
            <Text style={styles.subtitle}>Başarılarınızı takip edin</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {(['week', 'month', 'all'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[styles.periodButton, selectedPeriod === period && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text style={[styles.periodButtonText, selectedPeriod === period && styles.periodButtonTextActive]}>
                {period === 'week' ? 'Hafta' : period === 'month' ? 'Ay' : 'Tümü'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Progress Ring */}
          {renderProgressRing()}

          {/* Stats Cards */}
          {renderStats()}

          {/* Weight Chart */}
          {renderWeightChart()}

          {/* Adherence Chart */}
          {renderAdherenceChart()}

          <View style={styles.bottomPadding} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  periodSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  progressRingContainer: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 20,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 20,
  },
  progressRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 8,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  progressRingInner: {
    alignItems: 'center',
  },
  progressPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  progressSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  progressDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  progressDetail: {
    alignItems: 'center',
  },
  progressDetailLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  progressDetailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 30,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 60) / 2,
    borderRadius: 15,
    overflow: 'hidden',
  },
  statGradient: {
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  chartContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 20,
    textAlign: 'center',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 120,
  },
  chartBar: {
    alignItems: 'center',
    flex: 1,
    height: '100%',
  },
  chartValue: {
    fontSize: 10,
    color: 'white',
    marginBottom: 4,
    fontWeight: '600',
  },
  barContainer: {
    flex: 1,
    width: 20,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '100%',
    borderRadius: 10,
    minHeight: 10,
  },
  chartLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    textAlign: 'center',
  },
  bottomPadding: {
    height: 50,
  },
}); 