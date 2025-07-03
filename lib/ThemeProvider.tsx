import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from './api';
import AuthService from './auth';

interface ThemeData {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  cardColor: string;
}

interface FeatureData {
  id: number;
  name: string;
  type: string;
  enabled: boolean;
  config: any;
}

interface ThemeContextType {
  theme: ThemeData;
  features: FeatureData[];
  isLoading: boolean;
  refreshTheme: () => Promise<void>;
  hasFeature: (featureName: string) => boolean;
  setLocalTheme: (themeName: string) => void;
}

const defaultTheme: ThemeData = {
  name: 'Default Theme',
  primaryColor: '#667eea',
  secondaryColor: '#764ba2',
  accentColor: '#6B73FF',
  backgroundColor: '#f8f9fa',
  textColor: '#333333',
  cardColor: '#ffffff'
};

const darkTheme: ThemeData = {
  name: 'Gece Teması',
  primaryColor: '#1a1a1a',
  secondaryColor: '#2d2d2d',
  accentColor: '#bb86fc',
  backgroundColor: '#121212',
  textColor: '#ffffff',
  cardColor: '#1e1e1e'
};

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  features: [],
  isLoading: true,
  refreshTheme: async () => {},
  hasFeature: () => false,
  setLocalTheme: () => {}
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeData>(defaultTheme);
  const [features, setFeatures] = useState<FeatureData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadThemeAndFeatures = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Loading theme and features...');
      
      // Try to get theme from server first
      let serverTheme = null;
      try {
        console.log('🌐 Attempting to get theme from server...');
        serverTheme = await ApiService.getUserTheme();
        console.log('🎨 Theme response from server:', serverTheme);
      } catch (error: any) {
        console.log('⚠️ Server theme fetch failed:', error.message);
        
        // If it's a 400 error (user profile not found), we can still continue
        if (error.status === 400) {
          console.log('👤 User profile not found, using default theme');
        } else {
          console.log('🔌 Server might be offline, using local fallback');
        }
      }

      // Get theme from AsyncStorage as fallback
      let localTheme = null;
      try {
        localTheme = await AsyncStorage.getItem('user_theme');
        console.log('💾 Local theme from storage:', localTheme);
      } catch (error) {
        console.log('⚠️ Failed to get local theme:', error);
      }

      // Determine which theme to use (priority: server > local > default)
      let finalTheme = 'light';
      if (serverTheme?.theme) {
        finalTheme = serverTheme.theme;
        console.log('✅ Using server theme:', finalTheme);
        
        // Save to local storage for offline use
        try {
          await AsyncStorage.setItem('user_theme', finalTheme);
        } catch (error) {
          console.log('⚠️ Failed to save theme locally:', error);
        }
      } else if (localTheme) {
        finalTheme = localTheme;
        console.log('💾 Using local theme:', finalTheme);
      } else {
        console.log('⚪ Using default theme:', finalTheme);
      }

      // Check if user has dark theme reward before applying dark theme
      if (finalTheme === 'dark') {
        try {
          const userRewards = await ApiService.getUserRewards();
          const hasDarkTheme = userRewards.some((reward: any) => 
            reward.name === 'Gece Teması' || 
            reward.id === 2 || 
            (reward.category === 'theme' && reward.name.includes('Gece'))
          );
          
          if (!hasDarkTheme) {
            console.log('🔒 Startup: User doesn\'t have dark theme reward, forcing light theme');
            finalTheme = 'light';
            // Update storage to reflect the change
            try {
              await AsyncStorage.setItem('user_theme', 'light');
              // Also update server if possible
              try {
                await ApiService.setUserTheme('light');
                console.log('🔄 Corrected theme preference on server');
              } catch (serverError) {
                console.log('⚠️ Could not update server theme, but local corrected');
              }
            } catch (error) {
              console.log('⚠️ Failed to update theme in storage:', error);
            }
          } else {
            console.log('✅ Startup: User has dark theme reward, allowing dark theme');
          }
        } catch (error) {
          console.log('⚠️ Startup: Failed to check user rewards, forcing light theme');
          finalTheme = 'light';
          // Clear any dark theme setting from storage
          try {
            await AsyncStorage.setItem('user_theme', 'light');
          } catch (storageError) {
            console.log('⚠️ Failed to clear theme from storage');
          }
        }
      }

      // Set theme
      const themeData = finalTheme === 'dark' ? darkTheme : defaultTheme;
      setTheme(themeData);

      // Try to load features (optional, can fail)
      try {
        const features = await ApiService.getActiveUserFeatures();
        console.log('🔧 Loaded features:', features);
        setFeatures(features);
      } catch (error) {
        console.log('⚠️ Failed to load features, using empty array');
        setFeatures([]);
      }

    } catch (error) {
      console.error('❌ Critical theme loading error:', error);
      // Use default theme as final fallback
      setTheme(defaultTheme);
      setFeatures([]);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshTheme = async () => {
    setIsLoading(true);
    await loadThemeAndFeatures();
  };

  const setLocalTheme = async (themeName: string) => {
    try {
      console.log('🎨 Setting theme to:', themeName);
      
      // If trying to set dark theme, ALWAYS check reward first - no local fallback
      if (themeName === 'dark') {
        try {
          const userRewards = await ApiService.getUserRewards();
          const hasDarkTheme = userRewards.some((reward: any) => 
            reward.name === 'Gece Teması' || 
            reward.id === 2 || 
            (reward.category === 'theme' && reward.name.includes('Gece'))
          );
          
          if (!hasDarkTheme) {
            console.log('🔒 User doesn\'t have dark theme reward - BLOCKED');
            throw new Error('Dark theme locked - reward required');
          }
          
          console.log('✅ User has dark theme reward - ALLOWED');
        } catch (rewardError) {
          console.log('⚠️ Failed to check rewards or user lacks reward - BLOCKING dark theme');
          throw new Error('Dark theme locked - no reward or server unreachable');
        }
      }
      
      // Set theme immediately for better UX
      const newTheme = themeName === 'dark' ? darkTheme : defaultTheme;
      setTheme(newTheme);
      
      // Save to local storage immediately
      try {
        await AsyncStorage.setItem('user_theme', themeName);
        console.log('💾 Theme saved to local storage');
      } catch (error) {
        console.log('⚠️ Failed to save theme locally:', error);
      }
      
      // Try to sync with server (required for dark theme)
      try {
        console.log('🌐 Syncing theme with server...');
        await ApiService.setUserTheme(themeName as 'light' | 'dark');
        console.log('✅ Theme synced with server successfully');
      } catch (error: any) {
        console.log('⚠️ Failed to sync theme with server:', error.message);
        
        if (error.status === 403 && error.response?.data?.errorCode === 'THEME_LOCKED') {
          console.log('🔒 Server rejected dark theme - user lacks reward');
          // Revert to light theme
          setTheme(defaultTheme);
          await AsyncStorage.setItem('user_theme', 'light');
          throw new Error('Dark theme locked by server');
        }
        
        // For dark theme, if server is unreachable, we already checked rewards above
        // For light theme, server issues are okay
        if (themeName === 'dark') {
          console.log('⚠️ Dark theme requires server confirmation - but reward check passed');
        }
      }
      
    } catch (error) {
      console.error('❌ Error setting theme:', error);
      throw error;
    }
  };

  const hasFeature = (featureName: string): boolean => {
    return features.some(feature => 
      feature.name.toLowerCase().includes(featureName.toLowerCase()) && feature.enabled
    );
  };

  useEffect(() => {
    loadThemeAndFeatures();
  }, []);

  const contextValue: ThemeContextType = {
    theme,
    features,
    isLoading,
    refreshTheme,
    hasFeature,
    setLocalTheme
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

 