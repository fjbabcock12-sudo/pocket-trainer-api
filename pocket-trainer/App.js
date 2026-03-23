import React, { useState, useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config/config'

import AuthScreen from './screens/AuthScreen'
import ChatScreen from './screens/ChatScreen'
import TrainingScreen from './screens/TrainingScreen'
import NutritionScreen from './screens/NutritionScreen'
import ProfileScreen from './screens/ProfileScreen'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const Tab = createBottomTabNavigator()

export default function App() {
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
      <View style={styles.centered}>
        <ActivityIndicator color="#6C47FF" size="large" />
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
          tabBarActiveTintColor: '#6C47FF',
          tabBarInactiveTintColor: '#555',
          tabBarStyle: { backgroundColor: '#000', borderTopColor: '#111' },
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
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

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }
})