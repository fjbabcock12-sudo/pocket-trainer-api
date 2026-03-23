import React, { useState, useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
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
const Tab = createBottomTabNavigator()

function Main() {
  const { theme } = useTheme()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

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

  if (!session) {
    return <AuthScreen onAuth={setSession} />
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            const icons = {
              Chat: focused ? 'chatbubble' : 'chatbubble-outline',
              Training: focused ? 'barbell' : 'barbell-outline',
              Nutrition: focused ? 'nutrition' : 'nutrition-outline',
              Profile: focused ? 'person' : 'person-outline',
            }
            return <Ionicons name={icons[route.name]} size={size} color={color} />
          },
          tabBarActiveTintColor: theme.accent,
          tabBarInactiveTintColor: theme.subtext,
          tabBarStyle: { backgroundColor: theme.tabBar, borderTopColor: theme.tabBorder },
          headerStyle: { backgroundColor: theme.header },
          headerTintColor: theme.headerText,
          headerTitleStyle: { fontWeight: '700' },
        })}
      >
        <Tab.Screen name="Chat" options={{ headerShown: false }}>
          {() => <ChatScreen session={session} />}
        </Tab.Screen>
        <Tab.Screen name="Training">
          {() => <TrainingScreen session={session} />}
        </Tab.Screen>
        <Tab.Screen name="Nutrition">
          {() => <NutritionScreen session={session} />}
        </Tab.Screen>
        <Tab.Screen name="Profile">
          {() => <ProfileScreen session={session} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
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
})
