import { Tabs } from 'expo-router';
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../lib/ThemeProvider';
import { useLanguage } from '../../lib/LanguageProvider';

type TabBarIconProps = {
  color: string;
  size: number;
  focused: boolean;
};

const CustomTabBarIcon = ({ name, color, size, focused }: { name: any, color: string, size: number, focused: boolean }) => {
  return (
    <View style={[styles.iconContainer, focused && styles.activeIconContainer]}>
      {focused && (
        <LinearGradient
          colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0.1)']}
          style={styles.activeIconGradient}
        />
      )}
      <Ionicons 
        name={name} 
        size={focused ? 20 : 18}
        color={focused ? 'white' : 'rgba(255,255,255,0.7)'} 
      />
    </View>
  );
};

const CameraTabIcon = ({ color, size, focused }: TabBarIconProps) => {
  return (
    <View style={styles.cameraIconContainer}>
      <LinearGradient
        colors={['#4CAF50', '#45a049']}
        style={styles.cameraGradient}
      >
        <Ionicons name="camera" size={22} color="white" />
      </LinearGradient>
      <View style={styles.cameraRing} />
    </View>
  );
};

export default function TabLayout() {
  const { theme } = useTheme();
  const { t } = useLanguage();
  
  // Theme aware colors
  const isDark = theme.name === 'Gece Teması';
  const tabBarColors = isDark 
    ? ['rgba(26, 26, 26, 0.95)', 'rgba(45, 45, 45, 0.95)', 'rgba(30, 30, 30, 0.95)']
    : ['rgba(102, 126, 234, 0.95)', 'rgba(118, 75, 162, 0.95)', 'rgba(107, 115, 255, 0.95)'];

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: 'white',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.6)',
        tabBarStyle: {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: 90,
          paddingBottom: 25,
          paddingTop: 15,
          paddingHorizontal: 2,
        },
        tabBarLabelStyle: {
          fontSize: 9,
          fontWeight: '600',
          marginTop: 3,
        },
        tabBarItemStyle: {
          paddingVertical: 3,
        },
        tabBarBackground: () => (
          <LinearGradient
            colors={tabBarColors}
            style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 25, borderTopRightRadius: 25 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.home,
          tabBarIcon: ({ color, size, focused }: TabBarIconProps) => (
            <CustomTabBarIcon name="home" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="stories"
        options={{
          title: t.tabs.stories,
          tabBarIcon: ({ color, size, focused }: TabBarIconProps) => (
            <CustomTabBarIcon name="book" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="water"
        options={{
          title: t.tabs.water,
          tabBarIcon: ({ color, size, focused }: TabBarIconProps) => (
            <CustomTabBarIcon name="water" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: '',
          tabBarIcon: ({ color, size, focused }: TabBarIconProps) => (
            <CameraTabIcon color={color} size={size} focused={focused} />
          ),
          tabBarLabel: '',
        }}
      />
      <Tabs.Screen
        name="games"
        options={{
          title: t.tabs.games,
          tabBarIcon: ({ color }) => <Ionicons name="game-controller" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="diets"
        options={{
          title: t.tabs.diets,
          tabBarIcon: ({ color, size, focused }: TabBarIconProps) => (
            <CustomTabBarIcon name="nutrition" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tabs.profile,
          tabBarIcon: ({ color, size, focused }: TabBarIconProps) => (
            <CustomTabBarIcon name="person" color={color} size={size} focused={focused} />
          ),
        }}
      />
      {/* Hidden tabs */}
      <Tabs.Screen
        name="history"
        options={{
          href: null, // Hide from tab bar
        }}
      />
      <Tabs.Screen
        name="index-old"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeIconContainer: {
    transform: [{ scale: 1.1 }],
  },
  activeIconGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 18,
  },
  cameraIconContainer: {
    marginTop: -25,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cameraGradient: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  cameraRing: {
    position: 'absolute',
    width: 65,
    height: 65,
    borderRadius: 32.5,
    borderWidth: 2,
    borderColor: 'rgba(76, 175, 80, 0.2)',
    top: -5,
  },
}); 