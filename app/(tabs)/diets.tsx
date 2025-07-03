import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import ApiService from '../../lib/api';
import { useTheme } from '../../lib/ThemeProvider';

const { width } = Dimensions.get('window');

interface DietPlan {
  id: number;
  name: string;
  description: string;
  duration: number;
  daily_calories: number;
  difficulty: 'easy' | 'medium' | 'hard';
  benefits: string[];
  restrictions: string[];
  is_active: boolean;
}

export default function DietsScreen() {
  const [dietPlans, setDietPlans] = useState<DietPlan[]>([]);
  const [activeDietPlan, setActiveDietPlan] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDiet, setSelectedDiet] = useState<DietPlan | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const { theme } = useTheme();

  // Mock diet plans data
  const mockDietPlans: DietPlan[] = [
    {
      id: 1,
      name: 'Ketojenik Diyet',
      description: 'Düşük karbonhidrat, yüksek yağ içerikli beslenme planı',
      duration: 30,
      daily_calories: 1800,
      difficulty: 'hard',
      benefits: ['Hızlı kilo verme', 'Mental netlik', 'Kan şekeri kontrolü'],
      restrictions: ['Karbonhidrat kısıtlaması', 'Şeker yasak', 'Tahıl yasak'],
      is_active: true
    },
    {
      id: 2,
      name: 'Akdeniz Diyeti',
      description: 'Geleneksel Akdeniz mutfağına dayalı sağlıklı beslenme',
      duration: 60,
      daily_calories: 2000,
      difficulty: 'easy',
      benefits: ['Kalp sağlığı', 'Uzun yaşam', 'Anti-inflamatuar'],
      restrictions: ['İşlenmiş gıda kısıtlaması', 'Kırmızı et sınırlaması'],
      is_active: true
    },
    {
      id: 3,
      name: 'Vegan Diyet',
      description: 'Tamamen bitki bazlı beslenme programı',
      duration: 45,
      daily_calories: 1900,
      difficulty: 'medium',
      benefits: ['Çevre dostu', 'Yüksek fiber', 'Düşük kolesterol'],
      restrictions: ['Hayvansal ürün yasak', 'B12 desteği gerekli'],
      is_active: true
    },
    {
      id: 4,
      name: 'Paleo Diyet',
      description: 'Paleolitik döneme dayalı doğal beslenme',
      duration: 21,
      daily_calories: 1750,
      difficulty: 'medium',
      benefits: ['Doğal beslenme', 'İltihap azaltma', 'Enerji artışı'],
      restrictions: ['Tahıl yasak', 'Baklagil yasak', 'İşlenmiş gıda yasak'],
      is_active: true
    },
    {
      id: 5,
      name: 'Aralıklı Oruç',
      description: '16:8 aralıklı oruç metoduyla beslenme',
      duration: 28,
      daily_calories: 1850,
      difficulty: 'medium',
      benefits: ['Hücresel yenilenme', 'Kilo kontrolü', 'Mental berraklık'],
      restrictions: ['Belirli saatlerde yemek', 'Oruç periyodları'],
      is_active: true
    },
    {
      id: 6,
      name: 'Düşük Karbonhidrat',
      description: 'Karbonhidratı azaltılmış dengeli beslenme',
      duration: 35,
      daily_calories: 1950,
      difficulty: 'easy',
      benefits: ['Stabil kan şekeri', 'Kilo kontrolü', 'Enerji dengesi'],
      restrictions: ['Karbonhidrat sınırlaması', 'Şeker kontrolü'],
      is_active: true
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Load real diet plans from API
      const [dietPlansData, activeDiet] = await Promise.all([
        ApiService.getDietPlans().catch(() => mockDietPlans), // Fallback to mock data if API fails
        ApiService.getActiveDietPlan().catch(() => null)
      ]);
      
      console.log('Diets page - Loaded diet plans:', dietPlansData?.length);
      console.log('Diets page - Active diet plan:', activeDiet);
      
      setDietPlans(dietPlansData);
      setActiveDietPlan(activeDiet);
      
    } catch (error) {
      console.error('Error loading diet data:', error);
      // Fallback to mock data
      setDietPlans(mockDietPlans);
      setActiveDietPlan(null);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleDietPress = (diet: DietPlan) => {
    setSelectedDiet(diet);
    setModalVisible(true);
  };

  const handleStartDiet = async (diet: DietPlan) => {
    // Check if this diet is already active
    if (activeDietPlan && activeDietPlan.diet_plan_id === diet.id) {
      Alert.alert(
        'Zaten Aktif',
        'Bu diyet planı zaten aktif durumda!',
        [{ text: 'Tamam', style: 'default' }]
      );
      return;
    }

    Alert.alert(
      'Diyet Planını Başlat',
      `"${diet.name}" diyet planını başlatmak istediğinizden emin misiniz?\n\nSüre: ${diet.duration} gün\nGünlük Kalori: ${diet.daily_calories} kcal\n\n⚠️ Dikkat: Bu diyet planını başlatmadan önce doktorunuza danışmanızı öneririz.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Başlat',
          onPress: async () => {
            try {
              // Real API call
              await ApiService.activateDietPlan(diet.id);
              Alert.alert('Başarılı!', `${diet.name} diyet planı başlatıldı! Başarılar!`);
              setModalVisible(false);
              loadData(); // Refresh data
            } catch (error) {
              console.error('Error starting diet:', error);
              Alert.alert('Hata', 'Diyet planı başlatılırken bir hata oluştu.');
            }
          }
        }
      ]
    );
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return ['#4CAF50', '#45a049'];
      case 'medium': return ['#FF9800', '#FF8F00'];
      case 'hard': return ['#F44336', '#E53935'];
      default: return ['#666', '#555'];
    }
  };

  const getDifficultyText = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'Kolay';
      case 'medium': return 'Orta';
      case 'hard': return 'Zor';
      default: return 'Bilinmiyor';
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.primaryColor, theme.secondaryColor]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView style={styles.safeAreaContainer}>
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>🥗 Diyet Planları</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.8)' : theme.textColor + 'CC' }]}>Sağlıklı beslenme programları</Text>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false} 
            style={styles.scrollView}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {/* Active Diet Plan */}
            {activeDietPlan && (
              <View style={styles.activeDietCard}>
                <LinearGradient
                  colors={['#4CAF50', '#45a049']}
                  style={styles.activeDietGradient}
                >
                  <View style={styles.activeDietHeader}>
                    <Text style={styles.activeDietTitle}>🎯 Aktif Diyet Planı</Text>
                    <Text style={styles.activeDietName}>{activeDietPlan.diet_plan?.name || activeDietPlan.name}</Text>
                  </View>
                  
                  <View style={styles.activeDietStats}>
                    <View style={styles.dietStatItem}>
                      <Text style={styles.dietStatValue}>
                        {Math.floor((new Date().getTime() - new Date(activeDietPlan.start_date).getTime()) / (1000 * 60 * 60 * 24))}
                      </Text>
                      <Text style={styles.dietStatLabel}>Gün Geçti</Text>
                    </View>
                    <View style={styles.dietStatItem}>
                      <Text style={styles.dietStatValue}>
                        {Math.max(0, Math.floor((new Date(activeDietPlan.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}
                      </Text>
                      <Text style={styles.dietStatLabel}>Gün Kaldı</Text>
                    </View>
                    <View style={styles.dietStatItem}>
                      <Text style={styles.dietStatValue}>{activeDietPlan.diet_plan?.daily_calories || activeDietPlan.daily_calories}</Text>
                      <Text style={styles.dietStatLabel}>Günlük Kcal</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            )}

            {/* Medical Disclaimer */}
            <View style={styles.disclaimerCard}>
              <LinearGradient
                colors={['#FF6B6B', '#FF8E53']}
                style={styles.disclaimerGradient}
              >
                <View style={styles.disclaimerHeader}>
                  <Ionicons name="warning" size={24} color="white" />
                  <Text style={styles.disclaimerTitle}>Önemli Uyarı</Text>
                </View>
                <Text style={styles.disclaimerText}>
                  Herhangi bir diyet programına başlamadan önce doktorunuza danışmanızı şiddetle tavsiye ederiz. 
                  Bu uygulamadaki bilgiler genel bilgilendirme amaçlıdır ve kişisel sağlık tavsiyesi yerine geçmez.
                </Text>
              </LinearGradient>
            </View>

            {/* Diet Plans */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Mevcut Diyet Planları</Text>
              {dietPlans
                .sort((a, b) => {
                  // Aktif planı en üste koy
                  const aIsActive = activeDietPlan && activeDietPlan.diet_plan_id === a.id;
                  const bIsActive = activeDietPlan && activeDietPlan.diet_plan_id === b.id;
                  
                  if (aIsActive && !bIsActive) return -1;
                  if (!aIsActive && bIsActive) return 1;
                  return 0; // Diğerleri aynı sırada kalsın
                })
                .map((diet) => {
                const isActive = activeDietPlan && activeDietPlan.diet_plan_id === diet.id;
                return (
                  <TouchableOpacity 
                    key={diet.id} 
                    style={[styles.dietCard, isActive && styles.activeDietCard]}
                    onPress={() => handleDietPress(diet)}
                  >
                    <LinearGradient
                      colors={isActive ? ['#4CAF50', '#45a049', '#2E7D32'] : getDifficultyColor(diet.difficulty)}
                      style={styles.dietGradient}
                    >
                      {isActive && (
                        <View style={styles.activeIndicator}>
                          <Text style={styles.activeIndicatorText}>✅ AKTİF PLAN</Text>
                        </View>
                      )}
                      
                      <View style={styles.dietHeader}>
                        <View style={styles.dietInfo}>
                          <Text style={styles.dietTitle}>{diet.name}</Text>
                          <Text style={styles.dietDescription}>{diet.description}</Text>
                        </View>
                        <View style={styles.dietBadges}>
                          <View style={styles.difficultyBadge}>
                            <Text style={styles.difficultyText}>
                              {getDifficultyText(diet.difficulty)}
                            </Text>
                          </View>
                        </View>
                      </View>
                      
                      <View style={styles.dietStats}>
                        <View style={styles.dietStatItem}>
                          <Text style={styles.dietStatValue}>{diet.duration}</Text>
                          <Text style={styles.dietStatLabel}>Gün</Text>
                        </View>
                        <View style={styles.dietStatItem}>
                          <Text style={styles.dietStatValue}>{diet.daily_calories}</Text>
                          <Text style={styles.dietStatLabel}>Kcal/Gün</Text>
                        </View>
                        <View style={styles.dietStatItem}>
                          <Text style={styles.dietStatValue}>{diet.benefits.length}</Text>
                          <Text style={styles.dietStatLabel}>Fayda</Text>
                        </View>
                      </View>
                      
                      <View style={styles.dietFooter}>
                        <Text style={styles.tapToLearnMore}>
                          {isActive ? 'Aktif planınız - Detaylar için dokunun' : 'Detaylar için dokunun'}
                        </Text>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>

      {/* Diet Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={selectedDiet ? getDifficultyColor(selectedDiet.difficulty) : ['#666', '#555']}
              style={styles.modalGradient}
            >
              {selectedDiet && (
                <>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>{selectedDiet.name}</Text>
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={() => setModalVisible(false)}
                    >
                      <Ionicons name="close" size={24} color="white" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.modalDescription}>{selectedDiet.description}</Text>

                  <View style={styles.modalStats}>
                    <View style={styles.modalStatItem}>
                      <Text style={styles.modalStatValue}>{selectedDiet.duration}</Text>
                      <Text style={styles.modalStatLabel}>Gün</Text>
                    </View>
                    <View style={styles.modalStatItem}>
                      <Text style={styles.modalStatValue}>{selectedDiet.daily_calories}</Text>
                      <Text style={styles.modalStatLabel}>Kcal/Gün</Text>
                    </View>
                    <View style={styles.modalStatItem}>
                      <Text style={styles.modalStatValue}>{getDifficultyText(selectedDiet.difficulty)}</Text>
                      <Text style={styles.modalStatLabel}>Zorluk</Text>
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>✅ Faydalar</Text>
                    {(selectedDiet.benefits || []).map((benefit, index) => (
                      <Text key={index} style={styles.modalListItem}>• {benefit}</Text>
                    ))}
                    {(!selectedDiet.benefits || selectedDiet.benefits.length === 0) && (
                      <Text style={styles.modalListItem}>• Bilgi mevcut değil</Text>
                    )}
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>⚠️ Kısıtlamalar</Text>
                    {(selectedDiet.restrictions || []).map((restriction, index) => (
                      <Text key={index} style={styles.modalListItem}>• {restriction}</Text>
                    ))}
                    {(!selectedDiet.restrictions || selectedDiet.restrictions.length === 0) && (
                      <Text style={styles.modalListItem}>• Bilgi mevcut değil</Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.startDietButton}
                    onPress={() => handleStartDiet(selectedDiet)}
                  >
                    <Text style={styles.startDietButtonText}>
                      {activeDietPlan && activeDietPlan.diet_plan_id === selectedDiet.id 
                        ? '✅ Bu Plan Zaten Aktif' 
                        : 'Diyet Planını Başlat'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
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
  safeAreaContainer: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  scrollView: {
    flex: 1,
  },
  activeDietCard: {
    margin: 20,
    marginTop: 0,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.5)',
  },
  activeDietGradient: {
    padding: 20,
  },
  activeDietHeader: {
    marginBottom: 15,
  },
  activeDietTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  activeDietName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  activeDietStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  dietStatItem: {
    alignItems: 'center',
  },
  dietStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  dietStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  disclaimerCard: {
    margin: 20,
    marginTop: 0,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  disclaimerGradient: {
    padding: 20,
  },
  disclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  disclaimerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  disclaimerText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  dietCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  dietGradient: {
    padding: 20,
  },
  dietHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dietInfo: {
    flex: 1,
    marginRight: 12,
  },
  dietTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  dietDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 20,
  },
  dietBadges: {
    alignItems: 'flex-end',
  },
  difficultyBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  dietStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  dietFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tapToLearnMore: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width - 40,
    maxHeight: '80%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalGradient: {
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 20,
    lineHeight: 24,
  },
  modalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  modalStatItem: {
    alignItems: 'center',
  },
  modalStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  modalStatLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  modalListItem: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
    lineHeight: 20,
  },
  startDietButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  startDietButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  activeIndicator: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeIndicatorText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
}); 