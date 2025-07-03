import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import ApiService from '../lib/api';

export default function CreateStoryScreen() {
  const params = useLocalSearchParams();
  const imageUri = params.imageUri as string;
  
  const [description, setDescription] = useState('');
  const [calories, setCalories] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Hata', 'Lütfen bir açıklama yazın');
      return;
    }

    if (!calories || isNaN(Number(calories)) || Number(calories) <= 0) {
      Alert.alert('Hata', 'Lütfen geçerli bir kalori değeri girin');
      return;
    }

    try {
      setIsSubmitting(true);
      
      await ApiService.createStory({
        imageUri,
        description: description.trim(),
        calories: Number(calories),
      });

      Alert.alert(
        'Başarılı!',
        'Hikayen paylaşıldı!',
        [
          {
            text: 'Tamam',
            onPress: () => {
              router.dismissAll();
              router.replace('/(tabs)/stories');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Story creation error:', error);
      Alert.alert('Hata', 'Hikaye paylaşılamadı. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickCalories = [120, 250, 350, 500, 750];
  const quickDescriptions = [
    'Lezzetli bir öğün! 😋',
    'Sağlıklı beslenme 🥗',
    'Ev yapımı yemek 👨‍🍳',
    'Antrenman sonrası 💪',
    'Kahve molası ☕',
  ];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.backgroundGradient}
      >
        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.title}>Hikaye Oluştur</Text>
            <View style={styles.placeholder} />
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Image Preview */}
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.foodImage} />
              <View style={styles.imageOverlay}>
                <Ionicons name="camera" size={20} color="white" />
              </View>
            </View>

            {/* Description Input */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>📝 Açıklama</Text>
              <TextInput
                style={styles.descriptionInput}
                placeholder="Bu lezzetli yemeği anlat..."
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={description}
                onChangeText={setDescription}
                multiline
                maxLength={200}
                textAlignVertical="top"
              />
              <Text style={styles.characterCount}>
                {description.length}/200
              </Text>

              {/* Quick Description Buttons */}
              <Text style={styles.quickLabel}>Hızlı seçenekler:</Text>
              <View style={styles.quickButtons}>
                {quickDescriptions.map((desc, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.quickButton}
                    onPress={() => setDescription(desc)}
                  >
                    <Text style={styles.quickButtonText}>{desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Calories Input */}
            <View style={styles.inputSection}>
              <Text style={styles.label}>🔥 Kalori</Text>
              <TextInput
                style={styles.caloriesInput}
                placeholder="Kalori değeri"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={calories}
                onChangeText={setCalories}
                keyboardType="numeric"
                maxLength={4}
              />

              {/* Quick Calorie Buttons */}
              <Text style={styles.quickLabel}>Hızlı seçenekler:</Text>
              <View style={styles.quickButtons}>
                {quickCalories.map((cal, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.quickCalorieButton}
                    onPress={() => setCalories(cal.toString())}
                  >
                    <Text style={styles.quickButtonText}>{cal}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <LinearGradient
                colors={isSubmitting ? ['#ccc', '#999'] : ['#4CAF50', '#45a049']}
                style={styles.submitGradient}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Ionicons name="share" size={20} color="white" />
                )}
                <Text style={styles.submitText}>
                  {isSubmitting ? 'Paylaşılıyor...' : 'Hikayeyi Paylaş'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.bottomPadding} />
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  imageContainer: {
    position: 'relative',
    alignItems: 'center',
    marginBottom: 30,
  },
  foodImage: {
    width: 200,
    height: 200,
    borderRadius: 20,
  },
  imageOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputSection: {
    marginBottom: 25,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 10,
  },
  descriptionInput: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: 'white',
    minHeight: 100,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  characterCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right',
    marginTop: 5,
  },
  caloriesInput: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: 'white',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  quickLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 15,
    marginBottom: 10,
  },
  quickButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 5,
  },
  quickCalorieButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 5,
  },
  quickButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  submitButton: {
    marginTop: 20,
    borderRadius: 15,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  bottomPadding: {
    height: 50,
  },
}); 