import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, useMemo
} from 'react-native'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/config'
import { useTheme } from '../context/ThemeContext'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export default function AuthScreen({ onAuth }) {
  const { theme } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password')
      return
    }
    setLoading(true)
    try {
      if (isSignUp) {
        if (!username) {
          Alert.alert('Missing fields', 'Please enter a username')
          setLoading(false)
          return
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } }
        })
        if (error) throw error
        Alert.alert('Account created!', 'You can now log in.')
        setIsSignUp(false)
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onAuth(data.session)
      }
    } catch (err) {
      Alert.alert('Error', err.message)
    }
    setLoading(false)
  }

  const s = makeStyles(theme)

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={s.inner}>
        <Text style={s.title}>Pocket Trainer</Text>
        <Text style={s.subtitle}>Your AI personal trainer</Text>

        {isSignUp && (
          <TextInput
            style={s.input}
            placeholder="Username"
            placeholderTextColor={theme.placeholder}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        )}
        <TextInput
          style={s.input}
          placeholder="Email"
          placeholderTextColor={theme.placeholder}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={s.input}
          placeholder="Password"
          placeholderTextColor={theme.placeholder}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={s.button} onPress={handleAuth} disabled={loading}>
          <Text style={s.buttonText}>
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Log In'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
          <Text style={s.switchText}>
            {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

function makeStyles(t) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    inner: { flex: 1, justifyContent: 'center', padding: 24 },
    title: { fontSize: 32, fontWeight: '700', color: t.text, textAlign: 'center', marginBottom: 8 },
    subtitle: { fontSize: 16, color: t.subtext, textAlign: 'center', marginBottom: 48 },
    input: {
      backgroundColor: t.inputBg, color: t.text, borderRadius: 12,
      padding: 16, marginBottom: 12, fontSize: 16, borderWidth: 1, borderColor: t.inputBorder
    },
    button: {
      backgroundColor: t.accent, borderRadius: 12,
      padding: 16, alignItems: 'center', marginTop: 8, marginBottom: 16
    },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    switchText: { color: t.accent, textAlign: 'center', fontSize: 14 },
  })
}
