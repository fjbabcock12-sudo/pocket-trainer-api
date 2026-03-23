import React, { useState, useEffect, useRef } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  ScrollView, StyleSheet, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert
} from 'react-native'
import axios from 'axios'
import { API_URL } from '../config/config'
import { useTheme } from '../context/ThemeContext'

function getGreeting(name) {
  const h = new Date().getHours()
  const time = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 22 ? 'Good evening' : 'Hey'
  return name ? `${time}, ${name}` : time
}

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function ChatScreen({ session }) {
  const { theme } = useTheme()
  const [view, setView] = useState('loading')
  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const flatListRef = useRef(null)

  useEffect(() => { init() }, [])

  async function init() {
    const [convRes, profileRes] = await Promise.allSettled([
      axios.get(`${API_URL}/api/chat/conversations`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      }),
      axios.get(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      }),
    ])

    const convs = convRes.status === 'fulfilled' ? convRes.value.data.conversations : []
    setConversations(convs)

    if (profileRes.status === 'fulfilled') {
      setDisplayName(profileRes.value.data.profile?.display_name || '')
    }

    if (convs.length > 0) {
      await openConversation(convs[0])
    } else {
      setView('home')
    }
  }

  async function openConversation(conv) {
    setView('chat')
    setActiveConv({ id: conv.id, title: conv.title, messages: [] })
    try {
      const res = await axios.get(`${API_URL}/api/chat/conversations/${conv.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      setActiveConv({ id: conv.id, title: conv.title, messages: res.data.messages })
    } catch (err) {
      console.log('Error loading conversation:', err.message)
    }
  }

  async function sendMessage() {
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)

    const tempUserMsg = { role: 'user', content: text, id: `tmp-${Date.now()}` }

    if (view === 'home') {
      setActiveConv({ id: null, title: text.slice(0, 60), messages: [tempUserMsg] })
      setView('chat')
    } else {
      setActiveConv(prev => ({ ...prev, messages: [...prev.messages, tempUserMsg] }))
    }

    try {
      const res = await axios.post(
        `${API_URL}/api/chat`,
        { message: text, conversationId: activeConv?.id || null },
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      )

      const convId = res.data.conversationId
      const assistantMsg = {
        role: 'assistant',
        content: res.data.message,
        id: `tmp-${Date.now() + 1}`,
      }

      setActiveConv(prev => ({ ...prev, id: convId, messages: [...prev.messages, assistantMsg] }))

      const convRes = await axios.get(`${API_URL}/api/chat/conversations`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      setConversations(convRes.data.conversations)

      if (res.data.logged) {
        const type = res.data.logged.type
        const label = type === 'workout' ? 'Workout logged' : type === 'meal' ? 'Meal logged' : 'Metric logged'
        Alert.alert('', label, [{ text: 'OK' }], { cancelable: true })
      }
    } catch (err) {
      Alert.alert('Error', 'Could not send message.')
      setActiveConv(prev => ({ ...prev, messages: prev.messages.slice(0, -1) }))
      setInput(text)
    }

    setSending(false)
  }

  const s = makeStyles(theme)

  if (view === 'loading') {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    )
  }

  // ── Chat view ──────────────────────────────────────────
  if (view === 'chat') {
    return (
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={s.chatHeader}>
          <TouchableOpacity onPress={() => { setActiveConv(null); setView('home') }} style={s.backBtn}>
            <Text style={s.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={s.chatTitle} numberOfLines={1}>{activeConv?.title || 'New chat'}</Text>
          <View style={{ width: 36 }} />
        </View>

        <FlatList
          ref={flatListRef}
          data={activeConv?.messages || []}
          keyExtractor={item => item.id || item.created_at}
          contentContainerStyle={s.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
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
          }}
        />

        {sending && (
          <View style={s.typingRow}>
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
            style={[s.sendBtn, (!input.trim() || sending) && s.sendDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || sending}
          >
            <Text style={s.sendText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    )
  }

  // ── Home view ──────────────────────────────────────────
  return (
    <View style={s.container}>
      {/* Conversation list — scrollable top section */}
      {conversations.length > 0 && (
        <ScrollView style={s.convList} contentContainerStyle={s.convListContent}>
          <Text style={s.convListLabel}>Recent chats</Text>
          {conversations.map(conv => (
            <TouchableOpacity
              key={conv.id}
              style={s.convCard}
              onPress={() => openConversation(conv)}
              activeOpacity={0.7}
            >
              <Text style={s.convTitle} numberOfLines={1}>{conv.title}</Text>
              <Text style={s.convTime}>{timeAgo(conv.updated_at)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Centered greeting + input */}
      <View style={s.homeCenter}>
        <View style={s.homeContent}>
          <Text style={s.greeting}>{getGreeting(displayName)}</Text>
          <Text style={s.description}>
            {conversations.length === 0
              ? "Pocket Trainer is your AI-powered personal fitness coach. Describe your workouts, meals, and body stats in plain language and your trainer will log them automatically. Share your goals, ask for training or meal plans, or check in on your progress anytime."
              : "What would you like to work on today?"}
          </Text>
          <View style={s.homeInputRow}>
            <TextInput
              style={s.homeInput}
              placeholder={conversations.length === 0 ? "Start chatting with your trainer..." : "Start a new chat..."}
              placeholderTextColor={theme.placeholder}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={1000}
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity
              style={[s.sendBtn, (!input.trim() || sending) && s.sendDisabled]}
              onPress={sendMessage}
              disabled={!input.trim() || sending}
            >
              <Text style={s.sendText}>↑</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  )
}

function makeStyles(t) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg },

    // Conversation list (top of home)
    convList: { maxHeight: 220, borderBottomWidth: 1, borderBottomColor: t.divider },
    convListContent: { padding: 16, gap: 8 },
    convListLabel: { fontSize: 11, fontWeight: '600', color: t.muted, textTransform: 'uppercase', marginBottom: 4 },
    convCard: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      backgroundColor: t.card, borderRadius: 10, padding: 12,
      borderWidth: 1, borderColor: t.cardBorder,
    },
    convTitle: { flex: 1, fontSize: 14, color: t.text, fontWeight: '500', marginRight: 12 },
    convTime: { fontSize: 12, color: t.muted },

    // Home centered section
    homeCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
    homeContent: { width: '100%', maxWidth: 580, alignItems: 'center' },
    greeting: { fontSize: 28, fontWeight: '700', color: t.text, marginBottom: 12, textAlign: 'center' },
    description: { fontSize: 15, color: t.subtext, lineHeight: 24, textAlign: 'center', marginBottom: 28 },
    homeInputRow: {
      flexDirection: 'row', gap: 8, alignItems: 'flex-end',
      width: '100%',
      backgroundColor: t.inputBg, borderRadius: 16,
      borderWidth: 1, borderColor: t.inputBorder,
      paddingHorizontal: 16, paddingVertical: 8,
    },
    homeInput: {
      flex: 1, color: t.text, fontSize: 15,
      maxHeight: 120, paddingVertical: 4,
    },

    // Chat view
    chatHeader: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: 16, paddingVertical: 12,
      borderBottomWidth: 1, borderBottomColor: t.divider,
    },
    backBtn: { width: 36, height: 36, justifyContent: 'center' },
    backBtnText: { fontSize: 22, color: t.accent },
    chatTitle: { flex: 1, textAlign: 'center', fontWeight: '600', fontSize: 15, color: t.text },
    messageList: { padding: 16, paddingBottom: 8 },
    messageRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
    userRow: { justifyContent: 'flex-end' },
    assistantRow: { justifyContent: 'flex-start' },
    avatar: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: t.accent, justifyContent: 'center', alignItems: 'center', marginRight: 8,
    },
    avatarText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    bubble: { maxWidth: '75%', borderRadius: 18, padding: 12 },
    userBubble: { backgroundColor: t.accent, borderBottomRightRadius: 4 },
    assistantBubble: { backgroundColor: t.bubbleBg, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: t.cardBorder },
    messageText: { fontSize: 15, lineHeight: 22 },
    userText: { color: '#fff' },
    assistantText: { color: t.bubbleText },
    typingRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingBottom: 8, gap: 8,
    },
    typingText: { color: t.muted, fontSize: 13 },
    inputRow: {
      flexDirection: 'row', padding: 12, gap: 8,
      borderTopWidth: 1, borderTopColor: t.divider, alignItems: 'flex-end',
    },
    input: {
      flex: 1, backgroundColor: t.inputBg, color: t.text, borderRadius: 20,
      paddingHorizontal: 16, paddingVertical: 10, fontSize: 15,
      borderWidth: 1, borderColor: t.inputBorder, maxHeight: 120,
    },
    sendBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: t.accent, justifyContent: 'center', alignItems: 'center',
    },
    sendDisabled: { backgroundColor: t.divider },
    sendText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  })
}
