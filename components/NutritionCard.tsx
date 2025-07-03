import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NutritionCardProps {
  title: string;
  current: number;
  unit: string;
  goal: number;
  color: string;
  progress?: number;
  icon?: string;
}

export const NutritionCard = ({ title, current, unit, goal, color, progress, icon }: NutritionCardProps) => {
  const progressPercentage = progress !== undefined ? progress : Math.min((current / goal) * 100, 100);

  return (
    <View style={styles.card}>
      <View style={[styles.colorBar, { backgroundColor: color }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          {icon && (
            <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
              <Ionicons name={icon as any} size={16} color={color} />
            </View>
          )}
          <Text style={styles.title}>{title}</Text>
        </View>
        <Text style={styles.value}>
          {current}
          <Text style={styles.unit}>{unit}</Text>
        </Text>
        <Text style={styles.goal}>of {goal}{unit}</Text>
        
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${progressPercentage}%`,
                  backgroundColor: color 
                }
              ]} 
            />
          </View>
          <Text style={styles.percentage}>{Math.round(progressPercentage)}%</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  colorBar: {
    height: 4,
    width: '100%',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  unit: {
    fontSize: 14,
    fontWeight: 'normal',
    color: '#666',
  },
  goal: {
    fontSize: 11,
    color: '#999',
    marginBottom: 12,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  percentage: {
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
    minWidth: 28,
    textAlign: 'right',
  },
}); 