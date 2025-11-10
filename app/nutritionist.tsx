import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../lib/ThemeProvider';
import ApiService from '../lib/api';

export default function NutritionistScreen() {
  const { theme } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Merhaba! Beslenme Uzmanıyla birlikte hedeflerinize ulaşın.' },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const expertFeatures = [
    'Kişiselleştirilmiş beslenme planı',
    'Haftalık online görüşme (30dk)',
    'Sınırsız mesajlaşma desteği',
    'Özel tarifler ve öneriler',
    'İlerleme takibi ve raporlama',
    'Hedef belirleme ve motivasyon desteği',
  ];

  const plans = {
    monthly: {
      price: '299,99',
      period: 'ay',
      features: [
        'Kişiselleştirilmiş beslenme planı',
        'Haftalık online görüşme (30dk)',
        'Sınırsız mesajlaşma desteği',
        'Özel tarifler ve öneriler',
        'İlerleme takibi ve raporlama',
        'Hedef belirleme ve motivasyon desteği',
      ]
    },
    yearly: {
      price: '2.499,99',
      period: 'yıl',
      features: [
        'Tüm aylık plan özellikleri',
        'Ekstra 2 ay ücretsiz',
        'Öncelikli destek hattı',
        'Detaylı sağlık analizi',
        'Özel egzersiz programı',
        'Yıllık sağlık raporu',
      ]
    }
  };

  const handleSubscribe = async () => {
    try {
      Alert.alert(
        'Abonelik Onayı',
        `${selectedPlan === 'monthly' ? 'Aylık' : 'Yıllık'} plan için ödeme sayfasına yönlendirileceksiniz.\n\nFiyat: ${plans[selectedPlan].price}₺/${plans[selectedPlan].period}`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Devam Et',
            onPress: async () => {
              // Burada ödeme sayfasına yönlendirme yapılacak
              Alert.alert('Yakında!', 'Ödeme sistemi yakında aktif olacak! 🚀');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Subscription error:', error);
      Alert.alert('Hata', 'İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const handleSend = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = { role: 'user', content: inputMessage };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const allMessages = [...messages, userMessage].map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.content
      }));

      const response = await ApiService.chatWithNutritionist(allMessages);
      setMessages(prev => [...prev, { role: 'ai', content: response.response }]);
    } catch (error: any) {
      const errorMsg = error.message || 'Mesaj gönderirken bir hata oluştu.';
      setMessages(prev => [...prev, { role: 'ai', content: errorMsg }]);
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.primaryColor, theme.secondaryColor]}
        style={styles.backgroundGradient}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.textColor} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.textColor }]}>
              👩‍⚕️ Beslenme Uzmanı
            </Text>
          </View>

          {/* Chat Interface - Full Screen */}
          <View style={styles.chatContainer}>
            <ScrollView 
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
            >
              {messages.map((message, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.messageBox,
                    message.role === 'user' ? styles.userMessage : styles.aiMessage,
                  ]}
                >
                  {message.role === 'ai' && (
                    <View style={styles.aiAvatar}>
                      <Text style={styles.aiAvatarText}>👩‍⚕️</Text>
                    </View>
                  )}
                  <View style={[
                    styles.messageBubble,
                    { backgroundColor: message.role === 'user' ? '#4CAF50' : theme.cardColor + '80' }
                  ]}>
                    <Text style={[styles.messageText, { color: message.role === 'user' ? 'white' : theme.textColor }]}>
                      {message.content}
                    </Text>
                  </View>
                </View>
              ))}
              {isLoading && (
                <View style={[styles.messageBox, styles.aiMessage]}>
                  <View style={styles.aiAvatar}>
                    <Text style={styles.aiAvatarText}>👩‍⚕️</Text>
                  </View>
                  <View style={[styles.messageBubble, { backgroundColor: theme.cardColor + '80' }]}>
                    <ActivityIndicator color={theme.textColor} />
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={[styles.inputContainer, { backgroundColor: theme.cardColor + '40' }]}>
              <TextInput
                style={[styles.input, { color: theme.textColor }]}
                placeholder="Beslenme hakkında soru sorun..."
                placeholderTextColor={`${theme.textColor}66`}
                value={inputMessage}
                onChangeText={setInputMessage}
                multiline
                maxLength={500}
              />
              <TouchableOpacity 
                style={[styles.sendButton, { opacity: (!inputMessage.trim() || isLoading) ? 0.5 : 1 }]}
                onPress={handleSend}
                disabled={isLoading || !inputMessage.trim()}
              >
                <Ionicons name="send" size={22} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  chatContainer: {
    flex: 1,
    padding: 16,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingBottom: 20,
  },
  messageBox: {
    flexDirection: 'row',
    marginBottom: 16,
    maxWidth: '85%',
  },
  userMessage: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  aiMessage: {
    alignSelf: 'flex-start',
  },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(76,175,80,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  aiAvatarText: {
    fontSize: 20,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    flex: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderRadius: 24,
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },

}); 