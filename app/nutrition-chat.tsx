import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme } from '../lib/ThemeProvider';
import ApiService from '../lib/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function NutritionChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const { theme } = useTheme();

  useEffect(() => {
    // İlk karşılama mesajı
    setMessages([
      {
        role: 'assistant',
        content: 'Merhaba! Ben senin kişisel beslenme uzmanınım. Sağlıklı beslenme, diyet ve fitness konularında sana yardımcı olabilirim. Ne konuda bilgi almak istersin?'
      }
    ]);
  }, []);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    
    // Kullanıcı mesajını ekle
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    
    setIsLoading(true);
    try {
      // AI'dan yanıt al
      const response = await ApiService.chatWithNutritionist([
        ...messages,
        { role: 'user', content: userMessage }
      ]);

      // AI yanıtını ekle
      setMessages(prev => [...prev, { role: 'assistant', content: response.response }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Üzgünüm, bir hata oluştu. Lütfen tekrar deneyin.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.primaryColor }]}
    >
      <Stack.Screen
        options={{
          title: 'Beslenme Uzmanı Chat',
          headerStyle: { backgroundColor: theme.primaryColor },
          headerTintColor: theme.textColor,
        }}
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((message, index) => (
          <View
            key={index}
            style={[
              styles.messageWrapper,
              message.role === 'user' ? styles.userMessage : styles.aiMessage,
              { backgroundColor: message.role === 'user' ? theme.accentColor : theme.cardColor }
            ]}
          >
            <Text style={[styles.messageText, { color: theme.textColor }]}>
              {message.content}
            </Text>
          </View>
        ))}
        {isLoading && (
          <View style={[styles.messageWrapper, styles.aiMessage, { backgroundColor: theme.cardColor }]}>
            <ActivityIndicator color={theme.textColor} />
          </View>
        )}
      </ScrollView>

      <View style={[styles.inputContainer, { backgroundColor: theme.cardColor }]}>
        <TextInput
          style={[styles.input, { color: theme.textColor, backgroundColor: theme.backgroundColor }]}
          placeholder="Mesajınızı yazın..."
          placeholderTextColor={theme.textColor + '80'}
          value={inputMessage}
          onChangeText={setInputMessage}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendButton, { backgroundColor: theme.accentColor }]}
          onPress={sendMessage}
          disabled={isLoading || !inputMessage.trim()}
        >
          <Text style={styles.sendButtonText}>Gönder</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageWrapper: {
    maxWidth: '80%',
    marginVertical: 8,
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiMessage: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  input: {
    flex: 1,
    marginRight: 12,
    padding: 12,
    borderRadius: 20,
    maxHeight: 120,
    fontSize: 16,
  },
  sendButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 