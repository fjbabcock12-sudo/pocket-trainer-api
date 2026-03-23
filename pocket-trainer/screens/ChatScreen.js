import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert
} from 'react-native'
import axios from 'axios'
import { API_URL } from '../config/config'
import { useTheme } from '../context/ThemeContext'

export default function ChatScreen({ session }) {
  const { theme } = useTheme()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const flatListRef = useRef(null)

  useEffect(() => { loadHistory() }, [])

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

  const s = makeStyles(theme)

  function renderMessage({ item }) {
    const isUser = item.role === 'user'
    return (
      <View style={[s.messageRow, isUser ? s.userRow : s.assistantRow]}>
        {!isUser && (
          <View style={s.avatar}>
            <Text style={s.avatarText}>PT</Text>
          </View>
        )}
        <View style={[s.bubble, isUser ? s.userBubble : s.assistantBubble]}>
          <Text style={[s.messageText, isUser ? s.userText : s.assistantText]}>
            {item.content}
          </Text>
        </View>
      </View>
    )
  }

  if (loadingHistory) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {messages.length === 0 && (
        <View style={s.emptyState}>
          <Text style={s.emptyTitle}>Hey, I'm your trainer</Text>
          <Text style={s.emptyBody}>
            Pocket Trainer is your AI-powered personal fitness coach. Describe your workouts, meals,
            and body stats in plain language and your trainer will log them automatically. Share your
            goals, ask for training or meal plans, or check in on your progress anytime. The more
            context you provide — your current weight, fitness goals, and dietary preferences —
            the more tailored your experience will be.
          </Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={item => item.id || item.created_at}
        contentContainerStyle={s.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {loading && (
        <View style={s.typingIndicator}>
          <ActivityIndicator size="small" color={theme.accent} />
          <Text style={s.typingText}>Trainer is typing...</Text>
        </View>
      )}

      <View style={s.inputRow}>
        <TextInput
          style={s.input}
          placeholder="Message your trainer..."
          placeholderTextColor={theme.placeholder}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={1000}
          onSubmitEditing={sendMessage}
        />
        <TouchableOpacity
          style={[s.sendButton, (!input.trim() || loading) && s.sendDisabled]}
          onPress={sendMessage}
          disabled={!input.trim() || loading}
        >
          <Text style={s.sendText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

function makeStyles(t) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg },
    messageList: { padding: 16, paddingBottom: 8 },
    messageRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
    userRow: { justifyContent: 'flex-end' },
    assistantRow: { justifyContent: 'flex-start' },
    avatar: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: t.accent, justifyContent: 'center',
      alignItems: 'center', marginRight: 8
    },
    avatarText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    bubble: { maxWidth: '75%', borderRadius: 18, padding: 12 },
    userBubble: { backgroundColor: t.accent, borderBottomRightRadius: 4 },
    assistantBubble: { backgroundColor: t.bubbleBg, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: t.cardBorder },
    messageText: { fontSize: 15, lineHeight: 22 },
    userText: { color: '#fff' },
    assistantText: { color: t.bubbleText },
    emptyState: { flex: 1, justifyContent: 'center', padding: 32 },
    emptyTitle: { fontSize: 24, fontWeight: '700', color: t.text, marginBottom: 16 },
    emptyBody: { fontSize: 15, color: t.subtext, lineHeight: 24 },
    typingIndicator: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingBottom: 8, gap: 8
    },
    typingText: { color: t.muted, fontSize: 13 },
    inputRow: {
      flexDirection: 'row', padding: 12, gap: 8,
      borderTopWidth: 1, borderTopColor: t.divider, alignItems: 'flex-end'
    },
    input: {
      flex: 1, backgroundColor: t.inputBg, color: t.text, borderRadius: 20,
      paddingHorizontal: 16, paddingVertical: 10, fontSize: 15,
      borderWidth: 1, borderColor: t.inputBorder, maxHeight: 120
    },
    sendButton: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: t.accent, justifyContent: 'center', alignItems: 'center'
    },
    sendDisabled: { backgroundColor: t.divider },
    sendText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  })
}
