import React, { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config/config'
import { ThemeProvider, useTheme } from './context/ThemeContext'

import AuthScreen from './screens/AuthScreen'
import ChatScreen from './screens/ChatScreen'
import TrainingScreen from './screens/TrainingScreen'
import NutritionScreen from './screens/NutritionScreen'
import ProfileScreen from './screens/ProfileScreen'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const TABS = [
  { name: 'Chat',      icon: 'chatbubble',  iconOff: 'chatbubble-outline' },
  { name: 'Training',  icon: 'barbell',     iconOff: 'barbell-outline' },
  { name: 'Nutrition', icon: 'nutrition',   iconOff: 'nutrition-outline' },
  { name: 'Profile',   icon: 'person',      iconOff: 'person-outline' },
]

function Sidebar({ active, onSelect, theme }) {
  const s = sidebarStyles(theme)
  return (
    <View style={s.sidebar}>
      <Text style={s.logo}>PT</Text>
      <View style={s.nav}>
        {TABS.map(tab => {
          const isActive = active === tab.name
          return (
            <TouchableOpacity
              key={tab.name}
              style={[s.navItem, isActive && s.navItemActive]}
              onPress={() => onSelect(tab.name)}
            >
              <Ionicons
                name={isActive ? tab.icon : tab.iconOff}
                size={20}
                color={isActive ? theme.accent : theme.subtext}
              />
              <Text style={[s.navLabel, isActive && s.navLabelActive]}>
                {tab.name}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

function sidebarStyles(t) {
  return StyleSheet.create({
    sidebar: {
      width: 200,
      backgroundColor: t.card,
      borderRightWidth: 1,
      borderRightColor: t.cardBorder,
      paddingTop: 24,
      paddingHorizontal: 12,
      paddingBottom: 24,
    },
    logo: {
      fontSize: 20,
      fontWeight: '800',
      color: t.accent,
      paddingHorizontal: 12,
      marginBottom: 32,
    },
    nav: { gap: 4 },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 8,
    },
    navItemActive: { backgroundColor: t.rowAlt },
    navLabel: { fontSize: 14, color: t.subtext, fontWeight: '500' },
    navLabelActive: { color: t.accent, fontWeight: '600' },
  })
}

function Main() {
  const { theme } = useTheme()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Chat')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
  }, [])

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.bg }]}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    )
  }

  if (!session) return <AuthScreen onAuth={setSession} />

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Sidebar active={activeTab} onSelect={setActiveTab} theme={theme} />
      <View style={styles.content}>
        {activeTab === 'Chat'      && <ChatScreen session={session} />}
        {activeTab === 'Training'  && <TrainingScreen session={session} />}
        {activeTab === 'Nutrition' && <NutritionScreen session={session} />}
        {activeTab === 'Profile'   && <ProfileScreen session={session} />}
      </View>
    </View>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <Main />
    </ThemeProvider>
  )
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  root: { flex: 1, flexDirection: 'row' },
  content: { flex: 1 },
})
