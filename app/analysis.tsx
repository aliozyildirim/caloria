import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Dimensions,
  Animated,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import ApiService from '../lib/api';
import { FoodAnalysis } from '../lib/foodAnalysis';
import { CircularProgress } from '../components/CircularProgress';

const { width, height } = Dimensions.get('window');

interface NutritionItemProps {
  label: string;
  value: number;
  unit: string;
  color: string;
  editable?: boolean;
  onValueChange?: (value: number) => void;
}

export default function AnalysisScreen() {
  const params = useLocalSearchParams();
  const imageUri = params.imageUri as string;
  const mealType = params.mealType as string || 'snack';
  const analysis: FoodAnalysis = JSON.parse(params.analysis as string);
  
  const [editedAnalysis, setEditedAnalysis] = useState(analysis);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingToFavorites, setIsAddingToFavorites] = useState(false);
  const [isSavingStory, setIsSavingStory] = useState(false);
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>(mealType as any || 'snack');

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const confidenceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(confidenceAnim, {
        toValue: analysis.confidence,
        duration: 1000,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const handleSaveMeal = async () => {
    if (!editedAnalysis.isFood) {
      Alert.alert('❌ Yiyecek Değil', 'Bu öğe yiyecek olarak tanınmadığı için kaydedilemez.');
      return;
    }

    try {
      setIsSaving(true);
      await ApiService.createMeal({
        name: editedAnalysis.name,
        calories: editedAnalysis.calories,
        protein: editedAnalysis.protein,
        carbs: editedAnalysis.carbs,
        fat: editedAnalysis.fat,
        image_uri: imageUri,
        meal_type: selectedMealType,
      });
      
      Alert.alert('🎉 Başarılı!', 'Öğün yemek günlüğünüze kaydedildi', [
        {
          text: 'Tamam',
          onPress: () => router.push('/(tabs)'),
        },
      ]);
    } catch (error) {
      console.error('Error saving meal:', error);
      Alert.alert('❌ Hata', 'Öğün kaydedilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddToFavorites = async () => {
    if (!editedAnalysis.isFood) {
      Alert.alert('❌ Yiyecek Değil', 'Bu öğe yiyecek olarak tanınmadığı için favorilere eklenemez.');
      return;
    }

    try {
      setIsAddingToFavorites(true);
      await ApiService.addToFavorites({
        name: editedAnalysis.name,
        calories: editedAnalysis.calories,
        protein: editedAnalysis.protein,
        carbs: editedAnalysis.carbs,
        fat: editedAnalysis.fat,
        category: editedAnalysis.category,
      });
      
      Alert.alert('❤️ Favorilere Eklendi!', `${editedAnalysis.name} favorilerinize eklendi`);
    } catch (error) {
      console.error('Error adding to favorites:', error);
      Alert.alert('❌ Hata', 'Favorilere eklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsAddingToFavorites(false);
    }
  };

  const handleRetakePhoto = () => {
    router.back();
  };

  const handleDiscard = () => {
    Alert.alert(
      '🗑️ Analizi Sil',
      'Bu analizi silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: 'Sil', style: 'destructive', onPress: () => router.back() },
      ]
    );
  };

  const updateNutrition = (field: keyof FoodAnalysis, value: string) => {
    const numericValue = parseFloat(value) || 0;
    setEditedAnalysis(prev => ({
      ...prev,
      [field]: numericValue,
    }));
  };

  const totalCaloriesFromMacros = Math.round(
    editedAnalysis.protein * 4 + editedAnalysis.carbs * 4 + editedAnalysis.fat * 9
  );

  const handleSaveStory = async () => {
    if (!editedAnalysis.isFood) {
      Alert.alert('❌ Yiyecek Değil', 'Bu öğe yiyecek olarak tanınmadığı için hikaye olarak paylaşılamaz.');
      return;
    }

    try {
      setIsSavingStory(true);
      await ApiService.createStory({
        imageUri,
        description: `${editedAnalysis.name} - ${editedAnalysis.calories} kcal 🍽️`,
        calories: editedAnalysis.calories,
      });
      
      Alert.alert('📖 Hikaye Paylaşıldı!', 'Yemeğiniz hikayelerinize eklendi', [
        {
          text: 'Hikayeleri Gör',
          onPress: () => router.push('/(tabs)/stories'),
        },
        {
          text: 'Tamam',
          style: 'cancel',
        },
      ]);
    } catch (error) {
      console.error('Error saving story:', error);
      Alert.alert('❌ Hata', 'Hikaye paylaşılamadı. Lütfen tekrar deneyin.');
    } finally {
      setIsSavingStory(false);
    }
  };

  const NutritionItem = ({ label, value, unit, color, editable = false, onValueChange }: NutritionItemProps) => (
    <View style={styles.nutritionItem}>
      <View style={styles.nutritionLeft}>
        <View style={[styles.colorIndicator, { backgroundColor: color }]} />
        <Text style={styles.nutritionLabel}>{label}</Text>
      </View>
      <View style={styles.nutritionRight}>
        {editable && isEditing ? (
          <TextInput
            style={styles.nutritionInput}
            value={value.toString()}
            onChangeText={(text: string) => {
              const numValue = parseFloat(text) || 0;
              setEditedAnalysis(prev => ({ ...prev, [label.toLowerCase()]: numValue }));
            }}
            keyboardType="numeric"
            placeholder="0"
          />
        ) : (
          <Text style={styles.nutritionValue}>{Math.round(value)}</Text>
        )}
        <Text style={styles.nutritionUnit}>{unit}</Text>
        <View style={[styles.nutritionProgress, { backgroundColor: `${color}20` }]}>
          <View 
            style={[
              styles.nutritionProgressFill, 
              { 
                backgroundColor: color,
                width: `${Math.min((value / 100) * 100, 100)}%`
              }
            ]} 
          />
        </View>
      </View>
    </View>
  );

  // If it's not food, show different UI
  if (!editedAnalysis.isFood) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#FF6B6B" />
        <LinearGradient
          colors={['#FF6B6B', '#FF8E8E']}
          style={styles.backgroundGradient}
        >
          <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <Animated.View 
              style={[
                styles.header,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Analiz Sonucu</Text>
              <View style={styles.headerButton} />
            </Animated.View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
              {/* Image Section */}
              <Animated.View 
                style={[
                  styles.imageSection,
                  {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                  },
                ]}
              >
                <View style={styles.imageContainer}>
                  <Image source={{ uri: imageUri }} style={styles.foodImage} />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.4)']}
                    style={styles.imageOverlay}
                  >
                    <View style={styles.confidenceTag}>
                      <Ionicons name="warning" size={16} color="#FF6B6B" />
                      <Text style={styles.confidenceText}>
                        %{Math.round(editedAnalysis.confidence * 100)} güven
                      </Text>
                    </View>
                  </LinearGradient>
                </View>
              </Animated.View>

              {/* Warning Card */}
              <Animated.View 
                style={[
                  styles.warningCard,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                <View style={styles.warningIcon}>
                  <Ionicons name="alert-circle" size={48} color="#FF6B6B" />
                </View>
                <Text style={styles.warningTitle}>Yiyecek Tespit Edilmedi</Text>
                <Text style={styles.warningSubtitle}>
                  Bu görüntü: <Text style={styles.detectedItem}>{editedAnalysis.name}</Text>
                </Text>
                <Text style={styles.warningDescription}>
                  {editedAnalysis.description}
                </Text>
              </Animated.View>

              {/* Meal Type Selection */}
              <Animated.View 
                style={[
                  styles.mealTypeCard,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                <Text style={styles.mealTypeTitle}>🍽️ Hangi Öğüne Eklensin?</Text>
                <View style={styles.mealTypeGrid}>
                  {[
                    { key: 'breakfast', label: 'Kahvaltı', icon: '🌅', color: '#FF9500' },
                    { key: 'lunch', label: 'Öğle', icon: '☀️', color: '#4CAF50' },
                    { key: 'dinner', label: 'Akşam', icon: '🌙', color: '#9C27B0' },
                    { key: 'snack', label: 'Atıştırma', icon: '🍎', color: '#FF6B6B' }
                  ].map((meal) => (
                    <TouchableOpacity
                      key={meal.key}
                      style={[
                        styles.mealTypeButton,
                        selectedMealType === meal.key && styles.mealTypeButtonSelected,
                        { borderColor: meal.color }
                      ]}
                      onPress={() => setSelectedMealType(meal.key as any)}
                    >
                      <Text style={styles.mealTypeIcon}>{meal.icon}</Text>
                      <Text style={[
                        styles.mealTypeLabel,
                        selectedMealType === meal.key && styles.mealTypeLabelSelected
                      ]}>
                        {meal.label}
                      </Text>
                      {selectedMealType === meal.key && (
                        <View style={[styles.selectedIndicator, { backgroundColor: meal.color }]}>
                          <Ionicons name="checkmark" size={16} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>

              {/* Action Buttons */}
              <Animated.View 
                style={[
                  styles.actionSection,
                  {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                  },
                ]}
              >
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.discardButton}
                    onPress={handleDiscard}
                  >
                    <Ionicons name="trash" size={20} color="#FF6B6B" />
                    <Text style={styles.discardText}>Sil</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.favoriteButton, isAddingToFavorites && styles.favoriteButtonDisabled]}
                    onPress={handleAddToFavorites}
                  >
                    <Ionicons 
                      name={isAddingToFavorites ? "heart" : "heart-outline"} 
                      size={20} 
                      color="#FF6B6B" 
                    />
                    <Text style={styles.favoriteText}>
                      {isAddingToFavorites ? 'Ekleniyor...' : 'Favorile'}
                    </Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.storyButton, isSavingStory && styles.storyButtonDisabled]}
                    onPress={handleSaveStory}
                  >
                    <Ionicons 
                      name={isSavingStory ? "hourglass" : "book-outline"} 
                      size={20} 
                      color="#4CAF50" 
                    />
                    <Text style={styles.storyText}>
                      {isSavingStory ? 'Paylaşılıyor...' : 'Hikaye'}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.saveButton, (isSaving || isAddingToFavorites || isSavingStory) && styles.saveButtonDisabled]}
                    onPress={handleSaveMeal}
                  >
                    <LinearGradient
                      colors={(isSaving || isAddingToFavorites || isSavingStory) ? ['#ccc', '#aaa'] : ['#4CAF50', '#45a049']}
                      style={styles.saveGradient}
                    >
                      <Ionicons 
                        name={isSaving ? "hourglass" : "checkmark"} 
                        size={20} 
                        color="white" 
                      />
                      <Text style={styles.saveText}>
                        {isSaving ? 'Kaydediliyor...' : 'Öğünü Kaydet'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>
      </View>
    );
  }

  // Regular food analysis UI
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4CAF50" />
      <LinearGradient
        colors={['#4CAF50', '#45a049']}
        style={styles.backgroundGradient}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <Animated.View 
            style={[
              styles.header,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Analiz Sonucu</Text>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={() => setIsEditing(!isEditing)}
            >
              <Ionicons 
                name={isEditing ? "checkmark" : "pencil"} 
                size={24} 
                color="white" 
              />
            </TouchableOpacity>
          </Animated.View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
            {/* Image Section */}
            <Animated.View 
              style={[
                styles.imageSection,
                {
                  opacity: fadeAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <View style={styles.imageContainer}>
                <Image source={{ uri: imageUri }} style={styles.foodImage} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.4)']}
                  style={styles.imageOverlay}
                >
                  <View style={styles.confidenceTag}>
                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                    <Text style={styles.confidenceText}>
                      %{Math.round(editedAnalysis.confidence * 100)} güven
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            </Animated.View>

            {/* Food Info Card */}
            <Animated.View 
              style={[
                styles.foodInfoCard,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {isEditing ? (
                <TextInput
                  style={styles.foodNameInput}
                  value={editedAnalysis.name}
                  onChangeText={(text: string) => setEditedAnalysis(prev => ({ ...prev, name: text }))}
                  placeholder="Yiyecek adı"
                />
              ) : (
                <Text style={styles.foodName}>{editedAnalysis.name}</Text>
              )}
              <Text style={styles.foodDescription}>
                AI tarafından %{Math.round(editedAnalysis.confidence * 100)} güvenle tanındı
              </Text>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>🍽️ {editedAnalysis.category}</Text>
              </View>
              <Text style={styles.portionText}>{editedAnalysis.portions}</Text>
            </Animated.View>

            {/* Calorie Card */}
            <Animated.View 
              style={[
                styles.calorieCard,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.calorieHeader}>
                <Text style={styles.calorieTitle}>Toplam Kalori</Text>
                <View style={styles.calorieProgress}>
                  <CircularProgress
                    size={60}
                    strokeWidth={6}
                    progress={Math.min(editedAnalysis.calories / 500, 1)}
                    color="#FF9500"
                    backgroundColor="#f0f0f0"
                  />
                </View>
              </View>
              <View style={styles.calorieContent}>
                {isEditing ? (
                  <TextInput
                    style={styles.calorieInput}
                    value={editedAnalysis.calories.toString()}
                    onChangeText={(value) => updateNutrition('calories', value)}
                    keyboardType="numeric"
                    placeholder="Kalori"
                  />
                ) : (
                  <Text style={styles.calorieValue}>{editedAnalysis.calories}</Text>
                )}
                <Text style={styles.calorieUnit}>kcal</Text>
              </View>
              <Text style={styles.macroCalories}>
                ({totalCaloriesFromMacros} makro besinlerden)
              </Text>
            </Animated.View>

            {/* Nutrition Breakdown */}
            <Animated.View 
              style={[
                styles.nutritionCard,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Text style={styles.nutritionTitle}>🥗 Besin Değerleri</Text>
              <View style={styles.nutritionList}>
                <NutritionItem
                  label="Protein"
                  value={editedAnalysis.protein}
                  unit="g"
                  color="#FF6B6B"
                  editable={true}
                />
                <NutritionItem
                  label="Carbs"
                  value={editedAnalysis.carbs}
                  unit="g"
                  color="#42A5F5"
                  editable={true}
                />
                <NutritionItem
                  label="Fat"
                  value={editedAnalysis.fat}
                  unit="g"
                  color="#FFA726"
                  editable={true}
                />
              </View>
            </Animated.View>

            {/* Meal Type Selection */}
            <Animated.View 
              style={[
                styles.mealTypeCard,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Text style={styles.mealTypeTitle}>🍽️ Hangi Öğüne Eklensin?</Text>
              <View style={styles.mealTypeGrid}>
                {[
                  { key: 'breakfast', label: 'Kahvaltı', icon: '🌅', color: '#FF9500' },
                  { key: 'lunch', label: 'Öğle', icon: '☀️', color: '#4CAF50' },
                  { key: 'dinner', label: 'Akşam', icon: '🌙', color: '#9C27B0' },
                  { key: 'snack', label: 'Atıştırma', icon: '🍎', color: '#FF6B6B' }
                ].map((meal) => (
                  <TouchableOpacity
                    key={meal.key}
                    style={[
                      styles.mealTypeButton,
                      selectedMealType === meal.key && styles.mealTypeButtonSelected,
                      { borderColor: meal.color }
                    ]}
                    onPress={() => setSelectedMealType(meal.key as any)}
                  >
                    <Text style={styles.mealTypeIcon}>{meal.icon}</Text>
                    <Text style={[
                      styles.mealTypeLabel,
                      selectedMealType === meal.key && styles.mealTypeLabelSelected
                    ]}>
                      {meal.label}
                    </Text>
                    {selectedMealType === meal.key && (
                      <View style={[styles.selectedIndicator, { backgroundColor: meal.color }]}>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>

            {/* Action Buttons */}
            <Animated.View 
              style={[
                styles.actionSection,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.discardButton}
                  onPress={handleDiscard}
                  disabled={isSaving || isAddingToFavorites || isSavingStory}
                >
                  <Ionicons name="trash" size={20} color="#FF6B6B" />
                  <Text style={styles.discardText}>Sil</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.favoriteButton, isAddingToFavorites && styles.favoriteButtonDisabled]}
                  onPress={handleAddToFavorites}
                  disabled={isSaving || isAddingToFavorites || isSavingStory}
                >
                  <Ionicons 
                    name={isAddingToFavorites ? "heart" : "heart-outline"} 
                    size={20} 
                    color="#FF6B6B" 
                  />
                  <Text style={styles.favoriteText}>
                    {isAddingToFavorites ? 'Ekleniyor...' : 'Favorile'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.storyButton, isSavingStory && styles.storyButtonDisabled]}
                  onPress={handleSaveStory}
                  disabled={isSaving || isAddingToFavorites || isSavingStory}
                >
                  <Ionicons 
                    name={isSavingStory ? "hourglass" : "book-outline"} 
                    size={20} 
                    color="#4CAF50" 
                  />
                  <Text style={styles.storyText}>
                    {isSavingStory ? 'Paylaşılıyor...' : 'Hikaye'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.saveButton, (isSaving || isAddingToFavorites || isSavingStory) && styles.saveButtonDisabled]}
                  onPress={handleSaveMeal}
                  disabled={isSaving || isAddingToFavorites || isSavingStory}
                >
                  <LinearGradient
                    colors={(isSaving || isAddingToFavorites || isSavingStory) ? ['#ccc', '#aaa'] : ['#4CAF50', '#45a049']}
                    style={styles.saveGradient}
                  >
                    <Ionicons 
                      name={isSaving ? "hourglass" : "checkmark"} 
                      size={20} 
                      color="white" 
                    />
                    <Text style={styles.saveText}>
                      {isSaving ? 'Kaydediliyor...' : 'Öğünü Kaydet'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animated.View>

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
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  imageSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  imageContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  foodImage: {
    width: '100%',
    height: 250,
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    justifyContent: 'flex-end',
    padding: 16,
  },
  confidenceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 6,
  },
  foodInfoCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  foodName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  foodNameInput: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
    paddingVertical: 4,
  },
  foodDescription: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    lineHeight: 22,
  },
  categoryBadge: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  portionText: {
    fontSize: 14,
    color: '#999',
  },
  calorieCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  calorieHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  calorieTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  calorieProgress: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieContent: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  calorieValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF9500',
  },
  calorieInput: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF9500',
    borderBottomWidth: 2,
    borderBottomColor: '#FF9500',
    minWidth: 120,
  },
  calorieUnit: {
    fontSize: 20,
    fontWeight: '600',
    color: '#999',
    marginLeft: 8,
  },
  macroCalories: {
    fontSize: 14,
    color: '#666',
  },
  nutritionCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  nutritionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  nutritionList: {
    gap: 16,
  },
  nutritionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nutritionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  nutritionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  nutritionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    minWidth: 40,
    textAlign: 'right',
  },
  nutritionInput: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#4CAF50',
    minWidth: 50,
    textAlign: 'right',
    paddingVertical: 2,
  },
  nutritionUnit: {
    fontSize: 14,
    color: '#666',
    minWidth: 15,
  },
  nutritionProgress: {
    width: 60,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  nutritionProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  warningCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  warningIcon: {
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginBottom: 8,
    textAlign: 'center',
  },
  warningSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  detectedItem: {
    fontWeight: 'bold',
    color: '#333',
  },
  warningDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionSection: {
    flexDirection: 'column',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  discardButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#FF6B6B',
    gap: 8,
  },
  discardText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  favoriteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#FF6B6B',
    gap: 8,
  },
  favoriteButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ccc',
  },
  favoriteText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B6B',
  },
  storyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#4CAF50',
    gap: 8,
  },
  storyButtonDisabled: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ccc',
  },
  storyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  saveButton: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  saveText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  bottomPadding: {
    height: 40,
  },
  mealTypeCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 20,
    padding: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  mealTypeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  mealTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mealTypeButton: {
    width: '48%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
    position: 'relative',
  },
  mealTypeButtonSelected: {
    borderColor: '#4CAF50',
  },
  mealTypeIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  mealTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  mealTypeLabelSelected: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 