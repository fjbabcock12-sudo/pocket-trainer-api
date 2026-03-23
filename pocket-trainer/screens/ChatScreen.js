import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert
} from 'react-native'
import axios from 'axios'
import { API_URL } from '../config/config'

export default function ChatScreen({ session }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const flatListRef = useRef(null)

  useEffect(() => {
    loadHistory()
  }, [])

  async function loadHistory() {
    try {
      const res = await axios.get(`${API_URL}/api/chat/history`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      setMessages(res.data.messages)
    } catch (err) {
      console.log('Error loading history:', err.message)
    }
    setLoadingHistory(false)
  }

  async function sendMessage() {
    if (!input.trim() || loading) return

    const userMessage = { role: 'user', content: input.trim(), id: Date.now().toString() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await axios.post(
        `${API_URL}/api/chat`,
        { message: userMessage.content },
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      )

      const assistantMessage = {
        role: 'assistant',
        content: res.data.message,
        id: (Date.now() + 1).toString(),
        logged: res.data.logged
      }
      setMessages(prev => [...prev, assistantMessage])

      // Show a subtle confirmation if something was logged
      if (res.data.logged) {
        const type = res.data.logged.type
        const label = type === 'workout' ? 'Workout logged' : type === 'meal' ? 'Meal logged' : 'Metric logged'
        Alert.alert('', label, [{ text: 'OK' }], { cancelable: true })
      }
    } catch (err) {
      Alert.alert('Error', 'Could not send message. Is your server running?')
      setMessages(prev => prev.slice(0, -1))
      setInput(userMessage.content)
    }
    setLoading(false)
  }

  function renderMessage({ item }) {
    const isUser = item.role === 'user'
    return (
      <View style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>PT</Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
            {item.content}
          </Text>
        </View>
      </View>
    )
  }

  if (loadingHistory) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#6C47FF" size="large" />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {messages.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Hey, I'm your trainer</Text>
          <Text style={styles.emptySubtitle}>
            Tell me your goals, log a meal, or ask me anything about your fitness journey.
          </Text>
          <View style={styles.suggestions}>
            {[
              "My goal is to lose 20 lbs",
              "I just finished a 30 min run",
              "I had oatmeal for breakfast",
              "Create me a workout plan"
            ].map(s => (
              <TouchableOpacity
                key={s}
                style={styles.suggestion}
                onPress={() => setInput(s)}
              >
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id || item.created_at}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {loading && (
        <View style={styles.typingIndicator}>
          <ActivityIndicator size="small" color="#6C47FF" />
          <Text style={styles.typingText}>Trainer is typing...</Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Message your trainer..."
          placeholderTextColor="#555"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={1000}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!input.trim() || loading) && styles.sendDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  messageList: { padding: 16, paddingBottom: 8 },
  messageRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  userRow: { justifyContent: 'flex-end' },
  assistantRow: { justifyContent: 'flex-start' },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#6C47FF', justifyContent: 'center',
    alignItems: 'center', marginRight: 8
  },
  avatarText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  bubble: { maxWidth: '75%', borderRadius: 18, padding: 12 },
  userBubble: { backgroundColor: '#6C47FF', borderBottomRightRadius: 4 },
  assistantBubble: { backgroundColor: '#111', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#222' },
  messageText: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  assistantText: { color: '#e0e0e0' },
  emptyState: { flex: 1, justifyContent: 'center', padding: 32 },
  emptyTitle: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, color: '#888', lineHeight: 22, marginBottom: 32 },
  suggestions: { gap: 8 },
  suggestion: {
    backgroundColor: '#111', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#222'
  },
  suggestionText: { color: '#ccc', fontSize: 14 },
  typingIndicator: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 8, gap: 8
  },
  typingText: { color: '#555', fontSize: 13 },
  inputRow: {
    flexDirection: 'row', padding: 12, gap: 8,
    borderTopWidth: 1, borderTopColor: '#111', alignItems: 'flex-end'
  },
  input: {
    flex: 1, backgroundColor: '#111', color: '#fff', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 15,
    borderWidth: 1, borderColor: '#222', maxHeight: 120
  },
  sendButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#6C47FF', justifyContent: 'center', alignItems: 'center'
  },
  sendDisabled: { backgroundColor: '#222' },
  sendText: { color: '#fff', fontSize: 18, fontWeight: '700' }
})