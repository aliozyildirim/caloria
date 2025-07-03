import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Meal } from '../lib/api';

interface RecentMealCardProps {
  meal: Meal;
  onPress?: () => void;
}

export const RecentMealCard: React.FC<RecentMealCardProps> = ({ meal, onPress }) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMealTypeIcon = (mealType: string) => {
    switch (mealType) {
      case 'breakfast': return 'sunny';
      case 'lunch': return 'restaurant';
      case 'dinner': return 'moon';
      case 'snack': return 'cafe';
      default: return 'restaurant';
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.imageContainer}>
        {meal.image_uri ? (
          <Image source={{ uri: meal.image_uri }} style={styles.image} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name={getMealTypeIcon(meal.meal_type) as any} size={24} color="#ccc" />
          </View>
        )}
      </View>
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {meal.name}
          </Text>
          <Text style={styles.time}>{formatTime(meal.created_at)}</Text>
        </View>
        
        <Text style={styles.calories}>{Math.round(meal.calories)} kalori</Text>
        
        <View style={styles.macros}>
          <View style={styles.macro}>
            <Text style={styles.macroValue}>{Math.round(meal.protein)}g</Text>
            <Text style={styles.macroLabel}>Protein</Text>
          </View>
          <View style={styles.macro}>
            <Text style={styles.macroValue}>{Math.round(meal.carbs)}g</Text>
            <Text style={styles.macroLabel}>Karb</Text>
          </View>
          <View style={styles.macro}>
            <Text style={styles.macroValue}>{Math.round(meal.fat)}g</Text>
            <Text style={styles.macroLabel}>Yağ</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: {
    marginRight: 12,
  },
  image: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  placeholderImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  calories: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
    marginBottom: 8,
  },
  macros: {
    flexDirection: 'row',
    gap: 16,
  },
  macro: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  macroLabel: {
    fontSize: 10,
    color: '#999',
  },
}); 