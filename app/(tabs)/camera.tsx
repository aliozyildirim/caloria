import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { analyzeFoodImage } from '../../lib/foodAnalysis';

export default function CameraScreen() {
  const params = useLocalSearchParams();
  const mealType = params.mealType as string;
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [type, setType] = useState(CameraType.back);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanMode, setScanMode] = useState<'photo' | 'barcode' | 'story'>('photo');
  const cameraRef = useRef<Camera>(null);

  // Automatic meal type detection based on time
  const getAutoMealType = (): string => {
    if (mealType) return mealType; // Use provided meal type if available
    
    const hour = new Date().getHours();
    
    if (hour >= 6 && hour < 11) return 'breakfast';    // 06:00 - 10:59
    if (hour >= 11 && hour < 16) return 'lunch';       // 11:00 - 15:59
    if (hour >= 16 && hour < 21) return 'dinner';      // 16:00 - 20:59
    return 'snack';                                     // 21:00 - 05:59
  };

  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        setIsAnalyzing(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: false,
        });
        
        if (photo) {
          if (scanMode === 'story') {
            await createStory(photo.uri);
          } else {
            await analyzePhoto(photo.uri);
          }
        }
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to take picture');
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setIsAnalyzing(true);
        if (scanMode === 'story') {
          await createStory(result.assets[0].uri);
        } else {
          await analyzePhoto(result.assets[0].uri);
        }
        setIsAnalyzing(false);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
      setIsAnalyzing(false);
    }
  };

  const analyzePhoto = async (imageUri: string) => {
    try {
      const analysis = await analyzeFoodImage(imageUri);
      const detectedMealType = getAutoMealType();
      
      router.push({
        pathname: '/analysis',
        params: {
          imageUri,
          analysis: JSON.stringify(analysis),
          mealType: detectedMealType,
        },
      });
    } catch (error) {
      console.error('Error analyzing photo:', error);
      Alert.alert('Error', 'Failed to analyze food. Please try again.');
    }
  };

  const createStory = async (imageUri: string) => {
    try {
      router.push({
        pathname: '/create-story',
        params: {
          imageUri,
        },
      });
    } catch (error) {
      console.error('Error creating story:', error);
      Alert.alert('Error', 'Failed to create story. Please try again.');
    }
  };

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setIsAnalyzing(true);
    
    // Mock barcode analysis - in real app, you'd query a food database
    setTimeout(() => {
      const mockBarcodeFood = {
        name: 'Coca Cola 330ml',
        calories: 139,
        protein: 0,
        carbs: 35,
        fat: 0,
        confidence: 0.95,
        portions: '1 can (330ml)',
        description: 'Carbonated soft drink',
        isFood: true,
        category: 'Beverages',
      };

      const detectedMealType = getAutoMealType();

      router.push({
        pathname: '/analysis',
        params: {
          imageUri: 'barcode://scanned',
          analysis: JSON.stringify(mockBarcodeFood),
          mealType: detectedMealType,
        },
      });
      setIsAnalyzing(false);
    }, 1500);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Ionicons name="camera-outline" size={64} color="#ccc" />
        <Text style={styles.noPermissionText}>No access to camera</Text>
        <Text style={styles.noPermissionSubtext}>
          Please enable camera permissions in your device settings
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {scanMode === 'photo' ? 'Snap Your Food' : scanMode === 'barcode' ? 'Scan Barcode' : 'Story'}
        </Text>
        <Text style={styles.subtitle}>
          {scanMode === 'photo' 
            ? 'Take a photo to analyze calories and nutrition'
            : scanMode === 'barcode' ? 'Scan packaged food barcode for instant nutrition info' : 'Story mode'}
        </Text>
        
        {/* Meal Type Indicator */}
        <View style={styles.mealTypeIndicator}>
          <Text style={styles.mealTypeText}>
            📅 {new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} - 
            Önerilen: {
              getAutoMealType() === 'breakfast' ? '🌅 Kahvaltı' :
              getAutoMealType() === 'lunch' ? '☀️ Öğle' :
              getAutoMealType() === 'dinner' ? '🌙 Akşam' : '🍿 Atıştırmalık'
            }
          </Text>
        </View>
      </View>

      {/* Mode Toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeButton, scanMode === 'photo' && styles.modeButtonActive]}
          onPress={() => setScanMode('photo')}
        >
          <Ionicons 
            name="camera" 
            size={20} 
            color={scanMode === 'photo' ? '#fff' : '#666'} 
          />
          <Text style={[styles.modeText, scanMode === 'photo' && styles.modeTextActive]}>
            Photo
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.modeButton, scanMode === 'barcode' && styles.modeButtonActive]}
          onPress={() => setScanMode('barcode')}
        >
          <Ionicons 
            name="barcode" 
            size={20} 
            color={scanMode === 'barcode' ? '#fff' : '#666'} 
          />
          <Text style={[styles.modeText, scanMode === 'barcode' && styles.modeTextActive]}>
            Barcode
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeButton, scanMode === 'story' && styles.modeButtonActive]}
          onPress={() => setScanMode('story')}
        >
          <Ionicons 
            name="book" 
            size={20} 
            color={scanMode === 'story' ? '#fff' : '#666'} 
          />
          <Text style={[styles.modeText, scanMode === 'story' && styles.modeTextActive]}>
            Story
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cameraContainer}>
        {scanMode === 'photo' ? (
          <Camera
            ref={cameraRef}
            style={styles.camera}
            type={type}
            ratio="1:1"
          >
            <View style={styles.cameraOverlay}>
              <View style={styles.focusFrame} />
              <Text style={styles.focusText}>Center your food in the frame</Text>
            </View>
          </Camera>
        ) : scanMode === 'barcode' ? (
          <BarCodeScanner
            onBarCodeScanned={isAnalyzing ? undefined : handleBarCodeScanned}
            style={styles.camera}
          >
            <View style={styles.cameraOverlay}>
              <View style={styles.barcodeFrame} />
              <Text style={styles.focusText}>
                {isAnalyzing ? 'Analyzing barcode...' : 'Align barcode within the frame'}
              </Text>
            </View>
          </BarCodeScanner>
        ) : (
          <Camera
            ref={cameraRef}
            style={styles.camera}
            type={type}
            ratio="1:1"
          >
            <View style={styles.cameraOverlay}>
              <View style={styles.focusFrame} />
              <Text style={styles.focusText}>Center your food in the frame</Text>
            </View>
          </Camera>
        )}
      </View>

      <View style={styles.controls}>
        {scanMode === 'photo' ? (
          <>
            <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
              <Ionicons name="images" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.captureButton, isAnalyzing && styles.captureButtonDisabled]}
              onPress={takePicture}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <View style={styles.captureInner} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.flipButton}
              onPress={() => {
                setType(
                  type === CameraType.back ? CameraType.front : CameraType.back
                );
              }}
            >
              <Ionicons name="camera-reverse" size={24} color="#fff" />
            </TouchableOpacity>
          </>
        ) : scanMode === 'barcode' ? (
          <View style={styles.barcodeControls}>
            {isAnalyzing && (
              <View style={styles.analyzingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.analyzingText}>Analyzing barcode...</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.controls}>
            <TouchableOpacity style={styles.galleryButton} onPress={pickImage}>
              <Ionicons name="images" size={24} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.captureButton, isAnalyzing && styles.captureButtonDisabled]}
              onPress={takePicture}
              disabled={isAnalyzing}
            >
              {isAnalyzing ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <View style={styles.captureInner} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.flipButton}
              onPress={() => {
                setType(
                  type === CameraType.back ? CameraType.front : CameraType.back
                );
              }}
            >
              <Ionicons name="camera-reverse" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
  },
  modeToggle: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
  },
  modeButtonActive: {
    backgroundColor: '#4CAF50',
  },
  modeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  modeTextActive: {
    color: '#fff',
  },
  cameraContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 20,
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  barcodeFrame: {
    width: 300,
    height: 100,
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  focusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 20,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 20,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  captureButtonDisabled: {
    backgroundColor: '#ccc',
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  flipButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  barcodeControls: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzingContainer: {
    alignItems: 'center',
  },
  analyzingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 12,
  },
  noPermissionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  noPermissionSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  mealTypeIndicator: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
  },
  mealTypeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
}); 