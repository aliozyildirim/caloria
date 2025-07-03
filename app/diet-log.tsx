import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import ApiService from '../lib/api';

export default function DietLogScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [todayLog, setTodayLog] = useState<any>(null);
  
  // Form data
  const [weight, setWeight] = useState('');
  const [mood, setMood] = useState(5);
  const [energy, setEnergy] = useState(5);
  const [water, setWater] = useState('');
  const [notes, setNotes] = useState('');
  const [exercise, setExercise] = useState('');
  const [sleep, setSleep] = useState('');

  const moodEmojis = ['😢', '😕', '😐', '🙂', '😊', '😄', '🤩', '🥳', '😍', '🤯'];
  const energyLevels = ['💀', '😴', '😪', '😐', '🙂', '😊', '💪', '⚡', '🔥', '🚀'];

  useEffect(() => {
    loadTodayLog();
  }, []);

  const loadTodayLog = async () => {
    try {
      setIsLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      // Get today's log from API
      const log = await ApiService.getDietLog(today);
      
      if (log) {
        setTodayLog(log);
        // Populate form with existing data
        setWeight(log.weight.toString());
        setMood(log.mood);
        setEnergy(log.energy);
        setWater(log.water.toString());
        setNotes(log.notes);
        setExercise(log.exercise);
        setSleep(log.sleep.toString());
      }
      
    } catch (error) {
      console.error('Error loading today log:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!weight) {
      Alert.alert('Hata', 'Lütfen kilonuzu girin');
      return;
    }

    if (isNaN(Number(weight)) || Number(weight) <= 0 || Number(weight) > 500) {
      Alert.alert('Hata', 'Lütfen geçerli bir kilo değeri girin (1-500 kg)');
      return;
    }

    try {
      setIsSaving(true);
      
      const logData = {
        date: new Date().toISOString().split('T')[0],
        weight: Number(weight),
        mood,
        energy,
        water: Number(water) || 0,
        notes: notes.trim(),
        exercise: exercise.trim(),
        sleep: Number(sleep) || 0,
      };

      await ApiService.saveDietLog(logData);

      Alert.alert(
        'Başarılı!',
        'Günlük logunuz kaydedildi!',
        [
          {
            text: 'Tamam',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Save log error:', error);
      Alert.alert('Hata', 'Log kaydedilemedi. Lütfen tekrar deneyin.');
    } finally {
      setIsSaving(false);
    }
  };

  const today = new Date().toLocaleDateString('tr-TR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.backgroundGradient}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.loadingText}>Yükleniyor...</Text>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.backgroundGradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>Günlük Log</Text>
            <Text style={styles.dateText}>{today}</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Weight Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="scale" size={24} color="#4CAF50" />
              <Text style={styles.sectionTitle}>Kilo (kg) *</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Bugünkü kilonuz"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              maxLength={6}
            />
          </View>

          {/* Mood Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="happy" size={24} color="#FF9800" />
              <Text style={styles.sectionTitle}>Ruh Hali</Text>
            </View>
            <View style={styles.moodContainer}>
              {moodEmojis.map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.moodButton,
                    mood === index + 1 && styles.moodButtonSelected
                  ]}
                  onPress={() => setMood(index + 1)}
                >
                  <Text style={styles.moodEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.scaleText}>1 = Çok kötü, 10 = Mükemmel</Text>
          </View>

          {/* Energy Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="flash" size={24} color="#2196F3" />
              <Text style={styles.sectionTitle}>Enerji Seviyesi</Text>
            </View>
            <View style={styles.moodContainer}>
              {energyLevels.map((emoji, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.moodButton,
                    energy === index + 1 && styles.moodButtonSelected
                  ]}
                  onPress={() => setEnergy(index + 1)}
                >
                  <Text style={styles.moodEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.scaleText}>1 = Çok yorgun, 10 = Çok enerjik</Text>
          </View>

          {/* Water Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="water" size={24} color="#00BCD4" />
              <Text style={styles.sectionTitle}>Su Tüketimi (bardak)</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Kaç bardak su içtiniz?"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={water}
              onChangeText={setWater}
              keyboardType="numeric"
              maxLength={2}
            />
          </View>

          {/* Sleep Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bed" size={24} color="#9C27B0" />
              <Text style={styles.sectionTitle}>Uyku (saat)</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Kaç saat uyudunuz?"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={sleep}
              onChangeText={setSleep}
              keyboardType="decimal-pad"
              maxLength={4}
            />
          </View>

          {/* Exercise Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="fitness" size={24} color="#FF5722" />
              <Text style={styles.sectionTitle}>Egzersiz</Text>
            </View>
            <TextInput
              style={styles.textArea}
              placeholder="Bugün hangi egzersizleri yaptınız?"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={exercise}
              onChangeText={setExercise}
              multiline
              maxLength={200}
              textAlignVertical="top"
            />
          </View>

          {/* Notes Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={24} color="#795548" />
              <Text style={styles.sectionTitle}>Notlar</Text>
            </View>
            <TextInput
              style={styles.textArea}
              placeholder="Bugün hakkında notlarınız..."
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={notes}
              onChangeText={setNotes}
              multiline
              maxLength={300}
              textAlignVertical="top"
            />
            <Text style={styles.characterCount}>{notes.length}/300</Text>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <LinearGradient
              colors={isSaving ? ['#ccc', '#999'] : ['#4CAF50', '#45a049']}
              style={styles.saveGradient}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="save" size={20} color="white" />
              )}
              <Text style={styles.saveText}>
                {isSaving ? 'Kaydediliyor...' : 'Günlük Logu Kaydet'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
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
  headerInfo: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  dateText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: 'white',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  textArea: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: 'white',
    minHeight: 80,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  characterCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right',
    marginTop: 5,
  },
  moodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  moodButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodButtonSelected: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderColor: 'white',
  },
  moodEmoji: {
    fontSize: 20,
  },
  scaleText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
  },
  saveButton: {
    marginTop: 20,
    borderRadius: 15,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  bottomPadding: {
    height: 50,
  },
}); 