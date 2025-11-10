import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Switch,
  Dimensions,
  Animated,
  ActionSheetIOS,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import ApiService, { UserProfile, UserReward, Reward } from '../../lib/api';
import AuthService from '../../lib/auth';
import { useTheme } from '../../lib/ThemeProvider';

const { width } = Dimensions.get('window');

interface TodayStats {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userRewards, setUserRewards] = useState<UserReward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [todayMeals, setTodayMeals] = useState<any[]>([]);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [userXP, setUserXP] = useState({ totalXP: 0, level: 1 });

  // Theme context
  const { theme, refreshTheme, hasFeature, setLocalTheme } = useTheme();

  // Form states
  const [showEditModal, setShowEditModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    height: '',
    weight: '',
    gender: 'male',
    activityLevel: 'moderate',
    goal: 'maintain',
    targetWeight: '',
    dailyCalorieGoal: '',
    dailyProteinGoal: '',
    dailyCarbsGoal: '',
    dailyFatGoal: ''
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    loadProfileData();
    
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
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadProfileData();
      
      // Start animations
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }, [])
  );

  const loadProfileData = async () => {
    try {
      setIsLoading(true);
      const currentUser = AuthService.getCurrentUser();
      if (!currentUser) {
        setIsLoading(false);
        return;
      }

      // Load profile and today's meals in parallel
      const today = new Date().toISOString().split('T')[0];
      const [profileData, mealsData, userRewardsData, xpData] = await Promise.all([
        ApiService.getUserProfile().catch(() => null),
        ApiService.getMeals(today).catch(() => []),
        ApiService.getUserRewards().catch(() => []),
        ApiService.getUserXP().catch(() => ({ totalXP: 0, level: 1 }))
      ]);

      if (profileData) {
        setProfile(profileData);
        setFormData({
          name: profileData.name || '',
          age: profileData.age?.toString() || '',
          height: profileData.height?.toString() || '',
          weight: profileData.weight?.toString() || '',
          gender: profileData.gender || 'male',
          activityLevel: profileData.activity_level || 'moderate',
          goal: profileData.goal || 'maintain',
          targetWeight: profileData.target_weight?.toString() || '',
          dailyCalorieGoal: profileData.daily_calorie_goal?.toString() || '',
          dailyProteinGoal: profileData.daily_protein_goal?.toString() || '',
          dailyCarbsGoal: profileData.daily_carbs_goal?.toString() || '',
          dailyFatGoal: profileData.daily_fat_goal?.toString() || ''
        });
      }

      setTodayMeals(mealsData || []);
      setUserRewards(userRewardsData || []);
      setUserXP(xpData);
      setIsLoading(false);
    } catch (error) {
      console.error('Load profile data error:', error);
      setIsLoading(false);
    }
  };

  const calculateBMI = () => {
    if (!profile?.height || !profile?.weight || profile.height <= 0 || profile.weight <= 0) return 0;
    const heightInM = profile.height / 100;
    return profile.weight / (heightInM * heightInM);
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { text: 'Zayıf', color: '#42A5F5', emoji: '📉' };
    if (bmi < 25) return { text: 'Normal', color: '#4CAF50', emoji: '✅' };
    if (bmi < 30) return { text: 'Fazla Kilolu', color: '#FFA726', emoji: '⚠️' };
    return { text: 'Obez', color: '#FF6B6B', emoji: '🚨' };
  };

  const getActivityText = (level?: string) => {
    switch (level) {
      case 'sedentary': return { text: 'Hareketsiz', emoji: '🛋️' };
      case 'light': return { text: 'Az Aktif', emoji: '🚶' };
      case 'moderate': return { text: 'Orta Aktif', emoji: '🏃' };
      case 'active': return { text: 'Aktif', emoji: '🏋️' };
      case 'very_active': return { text: 'Çok Aktif', emoji: '🏃‍♂️' };
      default: return { text: 'Belirlenmemiş', emoji: '❓' };
    }
  };

  const getGoalText = (goal?: string) => {
    switch (goal) {
      case 'lose': return { text: 'Kilo Ver', emoji: '📉', color: '#FF6B6B' };
      case 'maintain': return { text: 'Koru', emoji: '⚖️', color: '#4CAF50' };
      case 'gain': return { text: 'Kilo Al', emoji: '📈', color: '#42A5F5' };
      default: return { text: 'Belirlenmemiş', emoji: '❓', color: '#666' };
    }
  };

  const getIdealWeightRange = () => {
    if (!profile?.height || !profile?.gender) return { min: 0, max: 0 };
    
    const heightInM = profile.height / 100;
    const minBMI = 18.5;
    const maxBMI = 24.9;
    
    return {
      min: Math.round(minBMI * heightInM * heightInM),
      max: Math.round(maxBMI * heightInM * heightInM)
    };
  };

  const calculateTodayStats = (): TodayStats => {
    if (!Array.isArray(todayMeals)) {
      return { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 };
    }

    return todayMeals.reduce((acc, meal) => ({
      totalCalories: acc.totalCalories + (parseFloat(meal?.calories) || 0),
      totalProtein: acc.totalProtein + (parseFloat(meal?.protein) || 0),
      totalCarbs: acc.totalCarbs + (parseFloat(meal?.carbs) || 0),
      totalFat: acc.totalFat + (parseFloat(meal?.fat) || 0)
    }), { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0 });
  };

  const handleLogout = async () => {
    Alert.alert(
      'Çıkış Yap',
      'Hesabınızdan çıkış yapmak istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.logout();
              router.replace('/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu');
            }
          }
        },
      ]
    );
  };

  const bmi = calculateBMI();
  const bmiCategory = getBMICategory(bmi);
  const activityInfo = getActivityText(profile?.activity_level);
  const goalInfo = getGoalText(profile?.goal);
  const todayStats = calculateTodayStats();
  const idealWeight = getIdealWeightRange();

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri izni gereklidir.');
      return false;
    }
    return true;
  };

  const handleImagePicker = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['İptal', 'Kameradan Çek', 'Galeriden Seç'],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            openCamera();
          } else if (buttonIndex === 2) {
            openImageLibrary();
          }
        }
      );
    } else {
      Alert.alert(
        'Profil Fotoğrafı Seç',
        'Fotoğrafı nereden seçmek istiyorsunuz?',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Kamera', onPress: openCamera },
          { text: 'Galeri', onPress: openImageLibrary },
        ]
      );
    }
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Kamera kullanmak için izin gereklidir.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      updateProfileImage(result.assets[0].uri);
    }
  };

  const openImageLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      updateProfileImage(result.assets[0].uri);
    }
  };

  const updateProfileImage = async (imageUri: string) => {
    try {
      setProfileImage(imageUri);
      
      // In a real app, you would upload the image to a server
      // For now, we'll just store it locally
      Alert.alert('Başarılı!', 'Profil fotoğrafınız güncellendi.');
      
      // You could also update the profile via API:
      // await ApiService.updateUserProfile({ avatar: imageUri });
      
    } catch (error) {
      console.error('Error updating profile image:', error);
      Alert.alert('Hata', 'Profil fotoğrafı güncellenirken bir hata oluştu.');
    }
  };

  const getRewardIcon = (iconName: string) => {
    switch (iconName) {
      case 'bronze': return '🥉';
      case 'silver': return '🥈';
      case 'gold': return '🥇';
      case 'moon': return '🌙';
      case 'water': return '💧';
      case 'apple': return '🍎';
      case 'fire': return '🔥';
      case 'trophy': return '🏆';
      case 'star': return '⭐';
      case 'diamond': return '💎';
      case 'crown': return '👑';
      case 'medal': return '🏅';
      default: return iconName || '🎁';
    }
  };

  const saveProfile = async () => {
    try {
      await ApiService.updateUserProfile({
        name: formData.name,
        age: parseInt(formData.age) || 0,
        height: parseInt(formData.height) || 0,
        weight: parseFloat(formData.weight) || 0,
        gender: formData.gender,
        activityLevel: formData.activityLevel,
        goal: formData.goal,
        targetWeight: parseFloat(formData.targetWeight) || 0,
        dailyCalorieGoal: parseInt(formData.dailyCalorieGoal) || 0,
        dailyProteinGoal: parseInt(formData.dailyProteinGoal) || 0,
        dailyCarbsGoal: parseInt(formData.dailyCarbsGoal) || 0,
        dailyFatGoal: parseInt(formData.dailyFatGoal) || 0
      });
      
      Alert.alert('Başarılı!', 'Profil bilgileriniz kaydedildi.');
      setShowEditModal(false);
      loadProfileData();
    } catch (error) {
      Alert.alert('Hata!', 'Profil kaydedilemedi.');
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
          <ScrollView 
            showsVerticalScrollIndicator={false}
            style={styles.scrollView}
          >
            <Animated.View 
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
                },
              ]}
            >
              {/* Beautiful Profile Header */}
              <View style={styles.profileHeader}>
                <View style={styles.avatarSection}>
                  <View style={styles.avatarContainer}>
                    {profileImage ? (
                      <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                    ) : (
                      <LinearGradient
                        colors={['#4CAF50', '#45a049']}
                        style={styles.avatarGradient}
                      >
                        <Text style={styles.avatarText}>
                          {profile?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </Text>
                      </LinearGradient>
                    )}
                    <TouchableOpacity style={styles.editAvatarButton} onPress={handleImagePicker}>
                      <Ionicons name="camera" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>
                      {profile?.name || 'Kullanıcı'}
                    </Text>
                    <Text style={styles.userEmail}>
                      {AuthService.getCurrentUser()?.email || 'user@example.com'}
                    </Text>
                    <View style={styles.userStats}>
                      <Text style={styles.statText}>🎯 {goalInfo.emoji} {goalInfo.text}</Text>
                      <Text style={styles.statText}>🏃 {activityInfo.emoji} {activityInfo.text}</Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity 
                  style={[styles.themeButton, { backgroundColor: theme.accentColor }]}
                  onPress={() => {
                    console.log('Navigating to challenges screen with rewards shop...');
                    router.push({ 
                      pathname: '/(tabs)/games', 
                      params: { openModal: 'shop' } 
                      });
                  }}
                >
                  <Ionicons name="color-palette-outline" size={20} color="white" />
                </TouchableOpacity>
              </View>

              {/* Tema Kontrolleri */}
              <View style={[styles.themeSection, { backgroundColor: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)' }]}>
                <View style={styles.themeSectionHeader}>
                  <View style={styles.themeIconContainer}>
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      style={styles.themeIconGradient}
                    >
                      <Ionicons name="color-palette" size={24} color="white" />
                    </LinearGradient>
                  </View>
                  <View style={styles.themeHeaderText}>
                    <Text style={[styles.themeSectionTitle, { color: theme.textColor === '#ffffff' ? 'white' : '#333' }]}>
                      🎨 Tema Seçimi
                    </Text>
                    <Text style={[styles.themeSectionSubtitle, { color: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.7)' : '#666' }]}>
                      Aktif: {theme.textColor === '#ffffff' ? 'Gece Teması' : 'Gündüz Teması'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.themeOptionsContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.modernThemeButton,
                      theme.textColor !== '#ffffff' && styles.activeModernThemeButton,
                      { 
                        backgroundColor: theme.textColor !== '#ffffff' ? '#4CAF50' : (theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                        borderColor: theme.textColor !== '#ffffff' ? '#4CAF50' : 'transparent'
                      }
                    ]}
                    onPress={async () => {
                      try {
                        console.log('🌞 Light theme button pressed');
                        
                        // Use new simple theme API
                        try {
                          console.log('Calling setUserTheme("light") API...');
                          await ApiService.setUserTheme('light');
                          console.log('setUserTheme success, refreshing theme...');
                          await refreshTheme();
                          Alert.alert('Başarılı! ☀️', 'Gündüz teması aktif edildi!');
                        } catch (serverError) {
                          console.log('Server error, using local theme:', serverError);
                          setLocalTheme('light');
                          Alert.alert('Başarılı! ☀️', 'Gündüz teması aktif edildi! (Local)');
                        }
                        
                        // Force reload the component
                        setTimeout(() => {
                          loadProfileData();
                        }, 100);
                        
                      } catch (error) {
                        console.error('Theme switch error:', error);
                        Alert.alert('Hata!', 'Tema değiştirilemedi.');
                      }
                    }}
                  >
                    <LinearGradient
                      colors={theme.textColor !== '#ffffff' ? ['#4CAF50', '#45a049'] : ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                      style={styles.themeButtonGradient}
                    >
                      <View style={styles.themeButtonContent}>
                        <Ionicons 
                          name="sunny" 
                          size={28} 
                          color={theme.textColor !== '#ffffff' ? 'white' : (theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.6)' : '#666')} 
                        />
                        <Text style={[
                          styles.modernThemeButtonText, 
                          { color: theme.textColor !== '#ffffff' ? 'white' : (theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.6)' : '#666') }
                        ]}>
                          Gündüz Teması
                        </Text>
                        <Text style={[
                          styles.themeButtonSubtext,
                          { color: theme.textColor !== '#ffffff' ? 'rgba(255,255,255,0.8)' : (theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.4)' : '#999') }
                        ]}>
                          Ücretsiz
                        </Text>
                        {theme.textColor !== '#ffffff' && (
                          <View style={styles.activeIndicator}>
                            <Ionicons name="checkmark-circle" size={20} color="white" />
                          </View>
                        )}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[
                      styles.modernThemeButton,
                      theme.textColor === '#ffffff' && styles.activeModernThemeButton,
                      { 
                        backgroundColor: theme.textColor === '#ffffff' ? '#bb86fc' : (theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                        borderColor: theme.textColor === '#ffffff' ? '#bb86fc' : 'transparent'
                      }
                    ]}
                    onPress={async () => {
                      try {
                        // Check if user has purchased dark theme reward
                        const hasDarkTheme = userRewards.some(reward => 
                          reward.name === 'Gece Teması' || 
                          reward.id === 2 || 
                          (reward.category === 'theme' && reward.name.includes('Gece'))
                        );
                        
                        if (!hasDarkTheme) {
                          Alert.alert(
                            'Gece Teması Kilitli 🔒', 
                            'Gece temasını kullanmak için önce ödül mağazasından satın almanız gerekiyor!',
                            [
                              { text: 'Tamam', style: 'cancel' },
                              { 
                                text: 'Mağazaya Git', 
                                onPress: () => {
                                  console.log('Navigating to games screen with rewards shop...');
                                  router.push({ 
                                    pathname: '/(tabs)/games', 
                                    params: { openModal: 'shop' } 
                                  });
                                }
                              }
                            ]
                          );
                          return;
                        }

                        console.log('🌙 Dark theme button pressed - user has reward');
                        
                        // User has the reward, can use dark theme
                        try {
                          console.log('Calling setUserTheme("dark") API...');
                          await ApiService.setUserTheme('dark');
                          console.log('setUserTheme success, refreshing theme...');
                          await refreshTheme();
                          Alert.alert('Başarılı! 🌙', 'Gece teması aktif edildi!');
                        } catch (serverError: any) {
                          console.log('Server error:', serverError);
                          
                          if (serverError.status === 403 && serverError.response?.data?.errorCode === 'THEME_LOCKED') {
                            // Backend says user doesn't have the reward
                            Alert.alert(
                              'Gece Teması Kilitli 🔒', 
                              'Backend kontrolü: Gece temasını kullanmak için önce ödül mağazasından satın almanız gerekiyor!',
                              [
                                { text: 'Tamam', style: 'cancel' },
                                { 
                                  text: 'Mağazaya Git', 
                                  onPress: () => {
                                    console.log('Navigating to games screen with rewards shop...');
                                    router.push({ 
                                      pathname: '/(tabs)/games', 
                                      params: { openModal: 'shop' } 
                                    });
                                  }
                                }
                              ]
                            );
                            return;
                          }
                          
                          // Check if it's the specific dark theme locked message
                          if (serverError.message && serverError.message.includes('Dark theme is locked')) {
                            Alert.alert(
                              'Gece Teması Kilitli 🔒', 
                              'Backend doğrulaması başarısız! Gece temasını kullanmak için ödül mağazasından satın almanız gerekiyor.',
                              [
                                { text: 'Tamam', style: 'cancel' },
                                { 
                                  text: 'Mağazaya Git', 
                                  onPress: () => {
                                    console.log('Navigating to games screen with rewards shop...');
                                    router.push({ 
                                      pathname: '/(tabs)/games', 
                                      params: { openModal: 'shop' } 
                                    });
                                  }
                                }
                              ]
                            );
                            return;
                          }
                          
                          // All other server errors - NO LOCAL FALLBACK
                          console.log('Server error, NO local fallback for dark theme:', serverError.message);
                          Alert.alert(
                            'Bağlantı Hatası ⚠️', 
                            'Dark theme ayarlamak için internet bağlantısı gereklidir. Lütfen daha sonra tekrar deneyin.',
                            [{ text: 'Tamam', style: 'cancel' }]
                          );
                        }
                        
                        // Force reload the component
                        setTimeout(() => {
                          loadProfileData();
                        }, 100);
                        
                      } catch (error) {
                        console.error('Theme activation error:', error);
                        Alert.alert('Hata!', 'Tema değiştirilemedi.');
                      }
                    }}
                  >
                    <LinearGradient
                      colors={theme.textColor === '#ffffff' ? ['#bb86fc', '#9c5dfc'] : ['rgba(187, 134, 252, 0.3)', 'rgba(156, 93, 252, 0.3)']}
                      style={styles.themeButtonGradient}
                    >
                      <View style={styles.themeButtonContent}>
                        <Ionicons 
                          name="moon" 
                          size={28} 
                          color={theme.textColor === '#ffffff' ? 'white' : (theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.6)' : '#666')} 
                        />
                        <Text style={[
                          styles.modernThemeButtonText,
                          { color: theme.textColor === '#ffffff' ? 'white' : (theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.6)' : '#666') }
                        ]}>
                          Gece Teması
                        </Text>
                        <Text style={[
                          styles.themeButtonSubtext,
                          { color: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.8)' : (theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.4)' : '#999') }
                        ]}>
                          Premium
                        </Text>
                        {theme.textColor === '#ffffff' && (
                          <View style={styles.activeIndicator}>
                            <Ionicons name="checkmark-circle" size={20} color="white" />
                          </View>
                        )}
                        {!userRewards.some(reward => 
                          reward.name === 'Gece Teması' || 
                          reward.id === 2 || 
                          (reward.category === 'theme' && reward.name.includes('Gece'))
                        ) && (
                          <View style={styles.premiumLockIcon}>
                            <Ionicons name="lock-closed" size={16} color="#FF6B6B" />
                          </View>
                        )}
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Body Stats Cards */}
              <View style={styles.bodyStatsSection}>
                <Text style={[styles.sectionTitle, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>📊 Vücut İstatistikleri</Text>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <LinearGradient
                      colors={['#FF6B6B', '#FF8E53']}
                      style={styles.statGradient}
                    >
                      <Text style={styles.statEmoji}>⚖️</Text>
                      <Text style={styles.statValue}>{profile?.weight || 0}kg</Text>
                      <Text style={styles.statLabel}>Mevcut Kilo</Text>
                    </LinearGradient>
                  </View>

                  <View style={styles.statCard}>
                    <LinearGradient
                      colors={['#4ECDC4', '#44A08D']}
                      style={styles.statGradient}
                    >
                      <Text style={styles.statEmoji}>📏</Text>
                      <Text style={styles.statValue}>{profile?.height || 0}cm</Text>
                      <Text style={styles.statLabel}>Boy</Text>
                    </LinearGradient>
                  </View>

                  <View style={styles.statCard}>
                    <LinearGradient
                      colors={['#45B7D1', '#96C93D']}
                      style={styles.statGradient}
                    >
                      <Text style={styles.statEmoji}>🎯</Text>
                      <Text style={styles.statValue}>{profile?.target_weight || 0}kg</Text>
                      <Text style={styles.statLabel}>Hedef Kilo</Text>
                    </LinearGradient>
                  </View>

                  <View style={styles.statCard}>
                    <LinearGradient
                      colors={[bmiCategory.color, `${bmiCategory.color}CC`]}
                      style={styles.statGradient}
                    >
                      <Text style={styles.statEmoji}>{bmiCategory.emoji}</Text>
                      <Text style={styles.statValue}>{isNaN(bmi) ? '0.0' : bmi.toFixed(1)}</Text>
                      <Text style={styles.statLabel}>BMI</Text>
                      <Text style={styles.bmiCategory}>{bmiCategory.text}</Text>
                    </LinearGradient>
                  </View>
                </View>
              </View>

              {/* Daily Goals */}
              <View style={styles.dailyGoalsSection}>
                <Text style={[styles.sectionTitle, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>🎯 Günlük Hedefler</Text>
                <View style={styles.goalsContainer}>
                  <View style={[styles.goalItem, { backgroundColor: theme.textColor === '#ffffff' ? 'rgba(255,255,255,0.1)' : theme.cardColor + '40' }]}>
                    <View style={styles.goalHeader}>
                      <Text style={styles.goalEmoji}>🔥</Text>
                      <Text style={[styles.goalLabel, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>Kalori</Text>
                    </View>
                    <Text style={[styles.goalValue, { color: theme.textColor === '#ffffff' ? 'white' : theme.textColor }]}>
                      {Math.round(todayStats.totalCalories || 0)} / {profile?.daily_calorie_goal || 2000}
                    </Text>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            width: `${Math.min(Math.max(((todayStats.totalCalories || 0) / (profile?.daily_calorie_goal || 2000)) * 100, 0), 100)}%`,
                            backgroundColor: '#FF6B6B'
                          }
                        ]} 
                      />
                    </View>
                  </View>

                  <View style={styles.goalItem}>
                    <View style={styles.goalHeader}>
                      <Text style={styles.goalEmoji}>💪</Text>
                      <Text style={styles.goalLabel}>Protein</Text>
                    </View>
                    <Text style={styles.goalValue}>
                      {Math.round(todayStats.totalProtein || 0)}g / {profile?.daily_protein_goal || 150}g
                    </Text>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            width: `${Math.min(Math.max(((todayStats.totalProtein || 0) / (profile?.daily_protein_goal || 150)) * 100, 0), 100)}%`,
                            backgroundColor: '#4ECDC4'
                          }
                        ]} 
                      />
                    </View>
                  </View>

                  <View style={styles.goalItem}>
                    <View style={styles.goalHeader}>
                      <Text style={styles.goalEmoji}>🌾</Text>
                      <Text style={styles.goalLabel}>Karbonhidrat</Text>
                    </View>
                    <Text style={styles.goalValue}>
                      {Math.round(todayStats.totalCarbs || 0)}g / {profile?.daily_carbs_goal || 250}g
                    </Text>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            width: `${Math.min(Math.max(((todayStats.totalCarbs || 0) / (profile?.daily_carbs_goal || 250)) * 100, 0), 100)}%`,
                            backgroundColor: '#FFD93D'
                          }
                        ]} 
                      />
                    </View>
                  </View>

                  <View style={styles.goalItem}>
                    <View style={styles.goalHeader}>
                      <Text style={styles.goalEmoji}>🥑</Text>
                      <Text style={styles.goalLabel}>Yağ</Text>
                    </View>
                    <Text style={styles.goalValue}>
                      {Math.round(todayStats.totalFat || 0)}g / {profile?.daily_fat_goal || 67}g
                    </Text>
                    <View style={styles.progressBar}>
                      <View 
                        style={[
                          styles.progressFill, 
                          { 
                            width: `${Math.min(Math.max(((todayStats.totalFat || 0) / (profile?.daily_fat_goal || 67)) * 100, 0), 100)}%`,
                            backgroundColor: '#FFA726'
                          }
                        ]} 
                      />
                    </View>
                  </View>
                </View>
              </View>

              {/* Health Info */}
              <View style={styles.healthInfoSection}>
                <Text style={styles.sectionTitle}>💡 Sağlık Bilgileri</Text>
                <View style={styles.healthCard}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                    style={styles.healthGradient}
                  >
                    <View style={styles.healthItem}>
                      <Text style={styles.healthLabel}>İdeal Kilo Aralığı</Text>
                      <Text style={styles.healthValue}>
                        {idealWeight.min}kg - {idealWeight.max}kg
                      </Text>
                    </View>
                    
                    <View style={styles.healthItem}>
                      <Text style={styles.healthLabel}>Yaş</Text>
                      <Text style={styles.healthValue}>{profile?.age || 0} yaşında</Text>
                    </View>
                    
                    <View style={styles.healthItem}>
                      <Text style={styles.healthLabel}>Cinsiyet</Text>
                      <Text style={styles.healthValue}>
                        {profile?.gender === 'male' ? 'Erkek' : '👩 Kadın'}
                      </Text>
                    </View>
                  </LinearGradient>
                </View>
              </View>

              {/* Quick Actions */}
              <View style={styles.actionsSection}>
                <Text style={styles.sectionTitle}>⚡ Hızlı İşlemler</Text>
                <View style={styles.actionsGrid}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => router.push('/nutrition-expert')}
                  >
                    <LinearGradient
                      colors={['#9C27B0', '#7B1FA2']}
                      style={styles.actionGradient}
                    >
                      <Ionicons name="bulb" size={24} color="#fff" />
                      <Text style={styles.actionText}>Beslenme Uzmanı</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => router.push('/settings')}
                  >
                    <LinearGradient
                      colors={['#4CAF50', '#45a049']}
                      style={styles.actionGradient}
                    >
                      <Ionicons name="settings" size={24} color="#fff" />
                      <Text style={styles.actionText}>Ayarlar</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => router.push('/(tabs)/history')}
                  >
                    <LinearGradient
                      colors={['#42A5F5', '#1976D2']}
                      style={styles.actionGradient}
                    >
                      <Ionicons name="analytics" size={24} color="#fff" />
                      <Text style={styles.actionText}>İstatistikler</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => router.push('/(tabs)/diets')}
                  >
                    <LinearGradient
                      colors={['#FFA726', '#FF7043']}
                      style={styles.actionGradient}
                    >
                      <Ionicons name="restaurant" size={24} color="#fff" />
                      <Text style={styles.actionText}>Diyet Planları</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={handleLogout}
                  >
                    <LinearGradient
                      colors={['#FF6B6B', '#FF5252']}
                      style={styles.actionGradient}
                    >
                      <Ionicons name="log-out" size={24} color="#fff" />
                      <Text style={styles.actionText}>Çıkış Yap</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  backgroundGradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    marginBottom: 20,
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: 16,
    position: 'relative',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  avatarGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  userStats: {
    flexDirection: 'column',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  themeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyStatsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    width: (width - 56) / 2,
    height: 120,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  statGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
  },
  bmiCategory: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
    marginTop: 2,
  },
  dailyGoalsSection: {
    marginBottom: 24,
  },
  goalsContainer: {
    paddingHorizontal: 20,
  },
  goalItem: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  goalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  goalValue: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 8,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  healthInfoSection: {
    marginBottom: 24,
  },
  healthCard: {
    marginHorizontal: 20,
  },
  healthGradient: {
    borderRadius: 16,
    padding: 20,
  },
  healthItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  healthLabel: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  healthValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: 'bold',
  },
  actionsSection: {
    marginBottom: 40,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  actionButton: {
    width: (width - 56) / 3,
    height: 80,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  actionGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginTop: 4,
  },
  safeAreaContainer: {
    flex: 1,
  },
  themeSection: {
    padding: 20,
    marginBottom: 20,
  },
  themeSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  themeIconContainer: {
    marginRight: 8,
  },
  themeIconGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeHeaderText: {
    flex: 1,
  },
  themeSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  themeSectionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  themeOptionsContainer: {
    flexDirection: 'column',
    gap: 12,
  },
  modernThemeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    marginBottom: 8,
  },
  activeModernThemeButton: {
    elevation: 8,
    shadowOpacity: 0.35,
  },
  themeButtonGradient: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  themeButtonContent: {
    alignItems: 'center',
    position: 'relative',
  },
  modernThemeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    textAlign: 'center',
  },
  themeButtonSubtext: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 175, 80, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumLockIcon: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 107, 107, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 