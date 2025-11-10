import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../lib/ThemeProvider';
import ApiService from '../lib/api';

export default function NutritionExpertScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyAdvice, setDailyAdvice] = useState<any>(null);
  const { theme } = useTheme();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const advice = await ApiService.getDailyNutritionAdvice();
      setDailyAdvice(advice);
    } catch (error) {
      console.error('Error loading nutrition advice:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#FF6B6B';
      case 'medium': return '#FFA726';
      case 'low': return '#4CAF50';
      default: return theme.textColor;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
        <LinearGradient colors={[theme.primaryColor, theme.secondaryColor]} style={styles.gradient}>
          <SafeAreaView style={styles.safeArea}>
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="white" />
              <Text style={styles.loadingText}>Yükleniyor...</Text>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[theme.primaryColor, theme.secondaryColor]} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>🧠 Beslenme Uzmanı</Text>
            <TouchableOpacity onPress={() => router.push('/nutritionist')} style={styles.chatButton}>
              <Ionicons name="chatbubbles" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="white" />}
          >
            {dailyAdvice && (
              <>
                {/* Score Card */}
                <View style={styles.scoreCard}>
                  <Text style={styles.scoreTitle}>Günlük Skor</Text>
                  <Text style={styles.scoreValue}>{dailyAdvice.score}/100</Text>
                  <View style={styles.scoreBar}>
                    <View style={[styles.scoreBarFill, { width: `${dailyAdvice.score}%` }]} />
                  </View>
                </View>

                {/* Overview */}
                {dailyAdvice.overview && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>📊 Günlük Özet</Text>
                    <View style={styles.overviewGrid}>
                      <View style={styles.overviewItem}>
                        <Text style={styles.overviewValue}>{dailyAdvice.overview.calorieStatus}%</Text>
                        <Text style={styles.overviewLabel}>Kalori</Text>
                      </View>
                      <View style={styles.overviewItem}>
                        <Text style={styles.overviewValue}>{dailyAdvice.overview.proteinStatus}%</Text>
                        <Text style={styles.overviewLabel}>Protein</Text>
                      </View>
                      <View style={styles.overviewItem}>
                        <Text style={styles.overviewValue}>{dailyAdvice.overview.carbsStatus}%</Text>
                        <Text style={styles.overviewLabel}>Karb</Text>
                      </View>
                      <View style={styles.overviewItem}>
                        <Text style={styles.overviewValue}>{dailyAdvice.overview.fatStatus}%</Text>
                        <Text style={styles.overviewLabel}>Yağ</Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Recommendations */}
                {dailyAdvice.recommendations && dailyAdvice.recommendations.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>✨ Öneriler</Text>
                    {dailyAdvice.recommendations.map((item: any, index: number) => (
                      <View key={index} style={[styles.card, { borderLeftColor: getPriorityColor(item.priority) }]}>
                        <View style={styles.cardHeader}>
                          <Text style={styles.cardIcon}>{item.icon}</Text>
                          <Text style={styles.cardTitle}>{item.title}</Text>
                        </View>
                        <Text style={styles.cardMessage}>{item.message}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Warnings */}
                {dailyAdvice.warnings && dailyAdvice.warnings.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>⚠️ Uyarılar</Text>
                    {dailyAdvice.warnings.map((item: any, index: number) => (
                      <View key={index} style={[styles.card, { borderLeftColor: '#FF6B6B' }]}>
                        <View style={styles.cardHeader}>
                          <Text style={styles.cardIcon}>{item.icon}</Text>
                          <Text style={styles.cardTitle}>{item.title}</Text>
                        </View>
                        <Text style={styles.cardMessage}>{item.message}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Tips */}
                {dailyAdvice.tips && dailyAdvice.tips.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>💡 İpuçları</Text>
                    {dailyAdvice.tips.map((tip: string, index: number) => (
                      <View key={index} style={styles.tipCard}>
                        <Text style={styles.tipText}>• {tip}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  chatButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 16,
    fontSize: 16,
  },
  scoreCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  scoreTitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    marginBottom: 8,
  },
  scoreValue: {
    color: 'white',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  scoreBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  overviewItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  overviewValue: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  overviewLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  cardTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  cardMessage: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
  },
  tipCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  tipText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
  },
});
