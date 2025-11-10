import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import AuthService from '../lib/auth';
import ApiService from '../lib/api';
import { calculateBMR, calculateTDEE, calculateMacros, calculateBMI } from '../lib/calorieCalculator';
import { onboardingEvents } from '../lib/events';

const { width } = Dimensions.get('window');

interface UserData {
  name: string;
  age: string;
  gender: 'male' | 'female' | '';
  height: string;
  weight: string;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | '';
  goal: 'lose' | 'maintain' | 'gain' | '';
  targetWeight: string;
}

const steps = [
  { id: 1, title: 'Kişisel Bilgiler', icon: 'person' },
  { id: 2, title: 'Fiziksel Özellikler', icon: 'body' },
  { id: 3, title: 'Aktivite Seviyesi', icon: 'fitness' },
  { id: 4, title: 'Hedefin', icon: 'flag' },
  { id: 5, title: 'Hedef Kilo', icon: 'trending-up' },
  { id: 6, title: 'Özet', icon: 'checkmark-circle' },
];

const activityLevels = [
  { id: 'sedentary', title: 'Hareketsiz', description: 'Ofis işi, az hareket', multiplier: 1.2 },
  { id: 'light', title: 'Az Aktif', description: 'Haftada 1-3 gün egzersiz', multiplier: 1.375 },
  { id: 'moderate', title: 'Orta Aktif', description: 'Haftada 3-5 gün egzersiz', multiplier: 1.55 },
  { id: 'active', title: 'Aktif', description: 'Haftada 6-7 gün egzersiz', multiplier: 1.725 },
  { id: 'very_active', title: 'Çok Aktif', description: 'Günde 2 kez egzersiz', multiplier: 1.9 },
];

const goals = [
  { id: 'lose', title: 'Kilo Ver', description: 'Haftalık 0.5kg kayıp', icon: 'trending-down', color: '#FF6B6B' },
  { id: 'maintain', title: 'Kilo Koru', description: 'Mevcut kilonu koru', icon: 'remove', color: '#4ECDC4' },
  { id: 'gain', title: 'Kilo Al', description: 'Haftalık 0.5kg artış', icon: 'trending-up', color: '#45B7D1' },
];

export default function OnboardingScreen() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<UserData>({
    name: '',
    age: '',
    gender: '',
    height: '',
    weight: '',
    activityLevel: '',
    goal: '',
    targetWeight: '',
  });

  const currentUser = AuthService.getCurrentUser();

  const updateUserData = (field: keyof UserData, value: string) => {
    // Input validasyonları
    if (field === 'age' || field === 'height' || field === 'weight' || field === 'targetWeight') {
      // Sadece sayı ve nokta kabul et
      const numericValue = value.replace(/[^0-9.]/g, '');
      setUserData(prev => ({ ...prev, [field]: numericValue }));
    } else if (field === 'name') {
      // Sadece harf, boşluk ve Türkçe karakterler
      const nameValue = value.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ\s]/g, '');
      setUserData(prev => ({ ...prev, [field]: nameValue }));
    } else {
      setUserData(prev => ({ ...prev, [field]: value }));
    }
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        return userData.name.trim() !== '' && userData.age !== '' && parseInt(userData.age) > 0;
      case 2:
        return userData.gender !== '' && userData.height !== '' && userData.weight !== '';
      case 3:
        return userData.activityLevel !== '';
      case 4:
        return userData.goal !== '';
      case 5:
        return userData.targetWeight !== '' && parseFloat(userData.targetWeight) > 0;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep()) {
      if (currentStep < 6) {
        setCurrentStep(currentStep + 1);
      } else {
        handleComplete();
      }
    } else {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const age = parseInt(userData.age);
      const height = parseFloat(userData.height);
      const weight = parseFloat(userData.weight);
      const targetWeight = parseFloat(userData.targetWeight);

      // Calculate nutrition goals
      const bmr = calculateBMR(age, userData.gender as 'male' | 'female', height, weight);
      const tdee = calculateTDEE(bmr, userData.activityLevel as any);
      const calorieGoal = userData.goal === 'lose' ? tdee - 500 : userData.goal === 'gain' ? tdee + 500 : tdee;
      const macros = calculateMacros(calorieGoal);

      // Save profile to API
      await ApiService.updateUserProfile({
        name: userData.name,
        age,
        height,
        weight,
        gender: userData.gender as 'male' | 'female',
        activityLevel: userData.activityLevel as any,
        goal: userData.goal as any,
        targetWeight,
        dailyCalorieGoal: Math.round(calorieGoal),
        dailyProteinGoal: Math.round(macros.protein),
        dailyCarbsGoal: Math.round(macros.carbs),
        dailyFatGoal: Math.round(macros.fat),
      });

      Alert.alert(
        'Tebrikler! 🎉',
        'Profilin başarıyla oluşturuldu. Artık Caloria\'yı kullanmaya başlayabilirsin!',
        [{ 
          text: 'Başla', 
          onPress: () => {
            // Emit onboarding completion event
            onboardingEvents.emit();
          }
        }]
      );
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Hata', 'Profil kaydedilirken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {steps.map((step, index) => (
        <View key={step.id} style={styles.stepItem}>
          <View style={[
            styles.stepCircle,
            currentStep >= step.id && styles.stepCircleActive,
            currentStep === step.id && styles.stepCircleCurrent
          ]}>
            <Ionicons 
              name={step.icon as any} 
              size={16} 
              color={currentStep >= step.id ? '#fff' : '#ccc'} 
            />
          </View>
          {index < steps.length - 1 && (
            <View style={[
              styles.stepLine,
              currentStep > step.id && styles.stepLineActive
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <View style={styles.welcomeContainer}>
              <Text style={styles.stepTitle}>Merhaba! 👋</Text>
              <Text style={styles.stepDescription}>
                Sana özel beslenme planı oluşturmak için birkaç bilgiye ihtiyacımız var.
              </Text>
            </View>
            
            <View style={styles.inputContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>✨ Adın ne?</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person" size={20} color="#667eea" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Adın ve soyadın"
                    placeholderTextColor="rgba(0,0,0,0.4)"
                    value={userData.name}
                    onChangeText={(value) => updateUserData('name', value)}
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>🎂 Yaşın kaç?</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="calendar" size={20} color="#667eea" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="25"
                    placeholderTextColor="rgba(0,0,0,0.4)"
                    value={userData.age}
                    onChangeText={(value) => updateUserData('age', value)}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
              </View>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <View style={styles.welcomeContainer}>
              <Text style={styles.stepTitle}>Fiziksel Özellikler 📏</Text>
              <Text style={styles.stepDescription}>
                Boy ve kilo bilgilerin hedef kalori hesabı için gerekli.
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>👤 Cinsiyetin</Text>
                <View style={styles.genderContainer}>
                  {[
                    { id: 'male', title: 'Erkek', icon: 'man', color: '#42A5F5' },
                    { id: 'female', title: 'Kadın', icon: 'woman', color: '#E91E63' }
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.genderButton,
                        userData.gender === option.id && styles.genderButtonActive,
                        { borderColor: option.color }
                      ]}
                      onPress={() => updateUserData('gender', option.id)}
                    >
                      <Ionicons 
                        name={option.icon as any} 
                        size={32} 
                        color={userData.gender === option.id ? '#fff' : option.color} 
                      />
                      <Text style={[
                        styles.genderText,
                        userData.gender === option.id && styles.genderTextActive,
                        { color: userData.gender === option.id ? '#fff' : option.color }
                      ]}>
                        {option.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.inputLabel}>📏 Boy (cm)</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="resize" size={20} color="#667eea" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="170"
                      placeholderTextColor="rgba(0,0,0,0.4)"
                      value={userData.height}
                      onChangeText={(value) => updateUserData('height', value)}
                      keyboardType="numeric"
                      maxLength={3}
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.inputLabel}>⚖️ Kilo (kg)</Text>
                  <View style={styles.inputWrapper}>
                    <Ionicons name="fitness" size={20} color="#667eea" style={styles.inputIcon} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="70"
                      placeholderTextColor="rgba(0,0,0,0.4)"
                      value={userData.weight}
                      onChangeText={(value) => updateUserData('weight', value)}
                      keyboardType="numeric"
                      maxLength={3}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <View style={styles.welcomeContainer}>
              <Text style={styles.stepTitle}>Aktivite Seviyesi 🏃‍♂️</Text>
              <Text style={styles.stepDescription}>
                Günlük aktivite seviyeni seç. Bu kalori ihtiyacını belirleyecek.
              </Text>
            </View>

            <View style={styles.activityGridContainer}>
              {activityLevels.map((level, index) => (
                <TouchableOpacity
                  key={level.id}
                  style={[
                    styles.activityGridButton,
                    userData.activityLevel === level.id && styles.activityGridButtonActive
                  ]}
                  onPress={() => updateUserData('activityLevel', level.id)}
                >
                  <View style={styles.activityGridIcon}>
                    <Text style={styles.activityGridEmoji}>
                      {level.id === 'sedentary' ? '🪑' : 
                       level.id === 'light' ? '🚶‍♂️' :
                       level.id === 'moderate' ? '🏃‍♂️' :
                       level.id === 'active' ? '💪' : '🔥'}
                    </Text>
                  </View>
                  <Text style={[
                    styles.activityGridTitle,
                    userData.activityLevel === level.id && styles.activityGridTitleActive
                  ]}>
                    {level.title}
                  </Text>
                  <Text style={[
                    styles.activityGridDescription,
                    userData.activityLevel === level.id && styles.activityGridDescriptionActive
                  ]}>
                    {level.description}
                  </Text>
                  {userData.activityLevel === level.id && (
                    <View style={styles.activityGridCheck}>
                      <Ionicons name="checkmark" size={20} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <View style={styles.welcomeContainer}>
              <Text style={styles.stepTitle}>Hedefin Ne? 🎯</Text>
              <Text style={styles.stepDescription}>
                Ana hedefini seç. Buna göre kalori planını ayarlayacağız.
              </Text>
            </View>

            <View style={styles.goalGridContainer}>
              {goals.map((goal) => (
                <TouchableOpacity
                  key={goal.id}
                  style={[
                    styles.goalGridButton,
                    userData.goal === goal.id && styles.goalGridButtonActive
                  ]}
                  onPress={() => updateUserData('goal', goal.id)}
                >
                  <View style={[styles.goalGridIcon, { backgroundColor: goal.color + '20' }]}>
                    <Ionicons 
                      name={goal.icon as any} 
                      size={32} 
                      color={userData.goal === goal.id ? '#fff' : goal.color} 
                    />
                  </View>
                  <Text style={[
                    styles.goalGridTitle,
                    userData.goal === goal.id && styles.goalGridTitleActive
                  ]}>
                    {goal.title}
                  </Text>
                  <Text style={[
                    styles.goalGridDescription,
                    userData.goal === goal.id && styles.goalGridDescriptionActive
                  ]}>
                    {goal.description}
                  </Text>
                  {userData.goal === goal.id && (
                    <View style={styles.goalGridCheck}>
                      <Ionicons name="checkmark" size={20} color={goal.color} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContent}>
            <View style={styles.welcomeContainer}>
              <Text style={styles.stepTitle}>Hedef Kilo 🎯</Text>
              <Text style={styles.stepDescription}>
                Ulaşmak istediğin kilonu belirt.
              </Text>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>🎯 Hedef Kilon (kg)</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="flag" size={20} color="#667eea" style={styles.inputIcon} />
                  <TextInput
                    style={styles.textInput}
                    placeholder="65"
                    placeholderTextColor="rgba(0,0,0,0.4)"
                    value={userData.targetWeight}
                    onChangeText={(value) => updateUserData('targetWeight', value)}
                    keyboardType="numeric"
                    maxLength={3}
                  />
                </View>
              </View>

              {userData.weight && userData.targetWeight && (
                <View style={styles.weightDifference}>
                  <Ionicons 
                    name={parseFloat(userData.targetWeight) > parseFloat(userData.weight) ? "trending-up" : 
                          parseFloat(userData.targetWeight) < parseFloat(userData.weight) ? "trending-down" : "remove"} 
                    size={24} 
                    color="#667eea" 
                  />
                  <Text style={styles.weightDifferenceText}>
                    {parseFloat(userData.targetWeight) > parseFloat(userData.weight) 
                      ? `+${(parseFloat(userData.targetWeight) - parseFloat(userData.weight)).toFixed(1)} kg artış hedefi`
                      : parseFloat(userData.targetWeight) < parseFloat(userData.weight)
                      ? `${(parseFloat(userData.weight) - parseFloat(userData.targetWeight)).toFixed(1)} kg kayıp hedefi`
                      : 'Mevcut kilonu koruma hedefi'
                    }
                  </Text>
                </View>
              )}
            </View>
          </View>
        );

      case 6:
        const age = parseInt(userData.age);
        const height = parseFloat(userData.height);
        const weight = parseFloat(userData.weight);
        const targetWeight = parseFloat(userData.targetWeight);

        if (!userData.gender || !age || !height || !weight) {
          return (
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>Hata</Text>
              <Text style={styles.stepDescription}>
                Lütfen önceki adımlardaki tüm bilgileri doldurun.
              </Text>
            </View>
          );
        }

        const bmr = calculateBMR(age, userData.gender as 'male' | 'female', height, weight);
        const tdee = calculateTDEE(bmr, userData.activityLevel as any);
        const calorieGoal = userData.goal === 'lose' ? tdee - 500 : userData.goal === 'gain' ? tdee + 500 : tdee;
        const macros = calculateMacros(calorieGoal);
        const bmi = calculateBMI(weight, height);

        return (
          <View style={styles.stepContent}>
            <View style={styles.welcomeContainer}>
              <Text style={styles.stepTitle}>Özet 📊</Text>
              <Text style={styles.stepDescription}>
                Senin için hesaplanan beslenme planı:
              </Text>
            </View>

            <View style={styles.summaryContainer}>
              <View style={styles.summaryMainCard}>
                <View style={styles.summaryMainIcon}>
                  <Ionicons name="flame" size={32} color="#FF6B6B" />
                </View>
                <Text style={styles.summaryMainTitle}>Günlük Kalori Hedefi</Text>
                <Text style={styles.summaryMainValue}>{Math.round(calorieGoal)} kcal</Text>
              </View>

              <View style={styles.summaryRow}>
                <View style={[styles.summarySmallCard, { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }]}>
                  <Ionicons name="fitness" size={24} color="#FF6B6B" />
                  <Text style={[styles.summaryTitle, { color: '#fff' }]}>Protein</Text>
                  <Text style={[styles.summaryValue, { color: '#FF6B6B' }]}>{Math.round(macros.protein)}g</Text>
                </View>
                <View style={[styles.summarySmallCard, { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }]}>
                  <Ionicons name="restaurant" size={24} color="#4ECDC4" />
                  <Text style={[styles.summaryTitle, { color: '#fff' }]}>Karbonhidrat</Text>
                  <Text style={[styles.summaryValue, { color: '#4ECDC4' }]}>{Math.round(macros.carbs)}g</Text>
                </View>
                <View style={[styles.summarySmallCard, { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.3)' }]}>
                  <Ionicons name="water" size={24} color="#FFE66D" />
                  <Text style={[styles.summaryTitle, { color: '#fff' }]}>Yağ</Text>
                  <Text style={[styles.summaryValue, { color: '#FFE66D' }]}>{Math.round(macros.fat)}g</Text>
                </View>
              </View>

              <View style={styles.summaryBMICard}>
                <View style={styles.summaryBMIIcon}>
                  <Ionicons name="body" size={28} color="#667eea" />
                </View>
                <View style={styles.summaryBMIContent}>
                  <Text style={styles.summaryBMITitle}>BMI Değerin</Text>
                  <Text style={styles.summaryBMIValue}>{bmi.toFixed(1)}</Text>
                  <Text style={styles.summaryBMICategory}>
                    {bmi < 18.5 ? 'Zayıf' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Fazla Kilolu' : 'Obez'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Profil Oluştur</Text>
          <Text style={styles.headerStep}>{currentStep}/6</Text>
        </View>
        {renderStepIndicator()}
      </LinearGradient>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {renderStep()}
        </ScrollView>

        <View style={styles.buttonContainer}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={prevStep}>
              <Ionicons name="chevron-back" size={20} color="#fff" />
              <Text style={styles.backButtonText}>Geri</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[
              styles.nextButton, 
              !validateStep() && styles.nextButtonDisabled,
              currentStep === 1 && styles.nextButtonFullWidth
            ]}
            onPress={nextStep}
            disabled={!validateStep() || loading}
          >
            <LinearGradient
              colors={validateStep() ? ['#667eea', '#764ba2'] : ['#ccc', '#999']}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>
                {currentStep === 6 ? (loading ? 'Kaydediliyor...' : 'Tamamla') : 'Devam'}
              </Text>
              {currentStep < 6 && <Ionicons name="chevron-forward" size={20} color="#fff" />}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#667eea', // Fallback color
  },
  header: {
    padding: 20,
    paddingTop: 10,
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  headerStep: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#667eea',
  },
  stepCircleCurrent: {
    backgroundColor: '#fff',
  },
  stepLine: {
    width: 20,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 12,
  },
  stepLineActive: {
    backgroundColor: '#667eea',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 20,
    width: '100%',
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  optionContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#764ba2',
  },
  optionText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 8,
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  activityGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 24,
    justifyContent: 'space-between',
  },
  activityGridButton: {
    width: '48%',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 8,
    minHeight: 120,
    justifyContent: 'center',
    position: 'relative',
  },
  activityGridButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#764ba2',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  activityGridIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  activityGridEmoji: {
    fontSize: 24,
  },
  activityGridTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  activityGridTitleActive: {
    color: '#fff',
  },
  activityGridDescription: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 14,
    textAlign: 'center',
  },
  activityGridDescriptionActive: {
    color: 'rgba(255,255,255,0.9)',
  },
  activityGridCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 24,
    justifyContent: 'space-between',
  },
  goalGridButton: {
    width: '48%',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 8,
    minHeight: 120,
    justifyContent: 'center',
    position: 'relative',
  },
  goalGridButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#764ba2',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  goalGridIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  goalGridTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  goalGridTitleActive: {
    color: '#fff',
  },
  goalGridDescription: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 14,
    textAlign: 'center',
  },
  goalGridDescriptionActive: {
    color: 'rgba(255,255,255,0.9)',
  },
  goalGridCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weightDifference: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(102, 126, 234, 0.3)',
  },
  weightDifferenceText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  summaryContainer: {
    width: '100%',
    gap: 16,
  },
  summaryMainCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  summaryMainIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  summaryMainTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
    textAlign: 'center',
  },
  summaryMainValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summarySmallCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  summaryBMICard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  summaryBMIIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(102, 126, 234, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  summaryBMIContent: {
    flex: 1,
  },
  summaryBMITitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  summaryBMIValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#667eea',
    marginBottom: 2,
  },
  summaryBMICategory: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 30,
    gap: 16,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  backButtonText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 8,
    fontWeight: '600',
  },
  nextButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 6,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  nextButtonDisabled: {
    elevation: 2,
    shadowOpacity: 0.1,
  },
  nextButtonFullWidth: {
    width: '100%',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  welcomeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  inputContainer: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genderButtonActive: {
    backgroundColor: '#667eea',
    borderColor: '#764ba2',
  },
  genderText: {
    fontSize: 16,
    color: '#fff',
    marginLeft: 8,
    fontWeight: '500',
  },
  genderTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
}); 