import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AuthService from '../lib/auth';
import AuthScreen from './auth';
import OnboardingScreen from './onboarding';
import ApiService from '../lib/api';
import NotificationService from '../lib/notifications';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { ThemeProvider as CaloriaThemeProvider } from '../lib/ThemeProvider';

// Global event emitter for onboarding completion
class OnboardingEvents {
  private listeners: Array<() => void> = [];

  addListener(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  emit(): void {
    this.listeners.forEach(callback => callback());
  }
}

export const onboardingEvents = new OnboardingEvents();

// Splash screen'i göster
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    ...FontAwesome.font,
  });

  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const colorScheme = useColorScheme();

  // Loading animasyon referansları
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check authentication status
        const authStatus = AuthService.isAuthenticated();
        setIsAuthenticated(authStatus);
        
        // Initialize notifications
        if (authStatus) {
          try {
            console.log('🔔 Initializing notifications...');
            await NotificationService.initialize();
            await NotificationService.setupAndroidChannel();
            console.log('✅ Notifications initialized');
          } catch (error) {
            console.error('❌ Notification initialization failed:', error);
          }
        }
        
        // If authenticated, check if user needs onboarding
        if (authStatus) {
          try {
            console.log('Checking user profile for onboarding...');
            const profile = await ApiService.getUserProfile();
            console.log('User profile result:', profile);
            
            // If no profile or profile is incomplete, needs onboarding
            const needsOnboarding = !profile || !profile.name || !profile.age || !profile.height || !profile.weight;
            console.log('Needs onboarding:', needsOnboarding);
            setNeedsOnboarding(needsOnboarding);
          } catch (error) {
            console.error('Error checking profile:', error);
            console.log('Setting needs onboarding to true due to error');
            setNeedsOnboarding(true);
          }
        }
      } catch (error) {
        console.error('Error initializing app:', error);
        setIsAuthenticated(false);
      } finally {
        setIsAuthLoading(false);
      }
    };

    initializeApp();

    // Listen for auth state changes
    const unsubscribe = AuthService.addListener((user: any) => {
      setIsAuthenticated(!!user);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    // Loading animasyonları
    if (isAuthLoading) {
      // Fade in animasyonu
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();

      // Scale animasyonu
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }).start();

      // Döndürme animasyonu
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start();

      // Nabız animasyonu
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [isAuthLoading]);

  useEffect(() => {
    // Auth state listener
    const unsubscribe = AuthService.addListener(async (user) => {
      console.log('Auth state changed, user:', user);
      setIsAuthenticated(!!user);
      
      if (user) {
        // Check if user needs onboarding
        try {
          console.log('Checking user profile...');
          const profile = await ApiService.getUserProfile();
          console.log('User profile result:', profile);
          
          // If no profile or profile is incomplete, needs onboarding
          const needsOnboarding = !profile || !profile.name || !profile.age || !profile.height || !profile.weight;
          console.log('Needs onboarding:', needsOnboarding);
          setNeedsOnboarding(needsOnboarding);
        } catch (error) {
          console.error('Error checking profile:', error);
          console.log('Setting needs onboarding to true due to error');
          setNeedsOnboarding(true);
        }
      } else {
        setNeedsOnboarding(false);
      }
      
      if (!isAuthLoading) {
        SplashScreen.hideAsync();
      }
    });

    // Onboarding completion listener
    const unsubscribeOnboarding = onboardingEvents.addListener(() => {
      console.log('Onboarding completed, setting needsOnboarding to false');
      // Use setTimeout to ensure state update happens after current render cycle
      setTimeout(() => {
        setNeedsOnboarding(false);
        console.log('needsOnboarding state updated to false');
      }, 100);
    });

    return () => {
      unsubscribe();
      unsubscribeOnboarding();
    };
  }, [isAuthLoading]);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Yükleniyor durumu
  if (isAuthLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#667eea', '#764ba2', '#6B73FF']}
          style={styles.loadingGradient}
        >
          <Text style={styles.loadingText}>Caloria</Text>
          <Text style={styles.loadingSubtext}>Loading...</Text>
        </LinearGradient>
      </View>
    );
  }

  // Kullanıcı giriş yapmamışsa auth ekranını göster
  if (!isAuthenticated) {
    console.log('Rendering auth screen - not authenticated');
    return (
      <>
        <StatusBar style="light" />
        <AuthScreen />
      </>
    );
  }

  // Kullanıcı giriş yapmış ve onboarding tamamlamışsa ana uygulamayı göster
  console.log('Rendering main app - authenticated:', isAuthenticated, 'needsOnboarding:', needsOnboarding);
  
  if (needsOnboarding) {
    console.log('Showing onboarding screen');
    return (
      <>
        <StatusBar style="light" />
        <OnboardingScreen />
      </>
    );
  }

  console.log('Showing main app tabs');
  return (
    <CaloriaThemeProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="analysis" />
          <Stack.Screen name="favorites" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="diet-log" />
          <Stack.Screen name="meal-plan" />
          <Stack.Screen name="admin" />
        </Stack>
      </ThemeProvider>
    </CaloriaThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    zIndex: 3,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 15,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
  },
  logoGlow: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    borderRadius: 80,
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    zIndex: 2,
  },
  outerRing: {
    position: 'absolute',
    top: -30,
    left: -30,
    right: -30,
    bottom: -30,
    borderRadius: 90,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderStyle: 'dashed',
    zIndex: 1,
  },
  loadingText: {
    fontSize: 48,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
  },
  loadingSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: '500',
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  loadingMessage: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '400',
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
}); 