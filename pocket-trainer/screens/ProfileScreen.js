import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, Switch
} from 'react-native'
import axios from 'axios'
import { API_URL } from '../config/config'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/config'
import { useTheme } from '../context/ThemeContext'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export default function ProfileScreen({ session }) {
  const { theme, toggleTheme } = useTheme()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [height, setHeight] = useState('')
  const [isPublic, setIsPublic] = useState(false)

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    try {
      const res = await axios.get(`${API_URL}/api/profile`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const p = res.data.profile
      setProfile(p)
      setDisplayName(p.display_name || '')
      setBio(p.bio || '')
      setHeight(p.height ? String(p.height) : '')
      setIsPublic(p.account_type === 'public')
    } catch (err) {
      console.log('Error loading profile:', err.message)
    }
    setLoading(false)
  }

  async function saveProfile() {
    setSaving(true)
    try {
      await axios.patch(
        `${API_URL}/api/profile`,
        {
          display_name: displayName,
          bio,
          height: height ? parseFloat(height) : null,
          account_type: isPublic ? 'public' : 'private'
        },
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      )
      Alert.alert('Saved', 'Your profile has been updated.')
    } catch (err) {
      Alert.alert('Error', 'Could not save profile.')
    }
    setSaving(false)
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => { await supabase.auth.signOut() }
      }
    ])
  }

  const s = makeStyles(theme)

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    )
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.heading}>Profile</Text>

      <View style={s.avatarContainer}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>
            {displayName ? displayName[0].toUpperCase() : '?'}
          </Text>
        </View>
        <Text style={s.email}>{session.user.email}</Text>
      </View>

      {/* Appearance + account toggles */}
      <View style={s.card}>
        <View style={s.toggleRow}>
          <View>
            <Text style={s.toggleLabel}>Dark mode</Text>
            <Text style={s.toggleSub}>Switch to a softer dark theme</Text>
          </View>
          <Switch
            value={theme.dark}
            onValueChange={toggleTheme}
            trackColor={{ false: t => t.divider, true: theme.accent }}
            thumbColor="#fff"
          />
        </View>
        <View style={s.cardDivider} />
        <View style={s.toggleRow}>
          <View>
            <Text style={s.toggleLabel}>Public profile</Text>
            <Text style={s.toggleSub}>
              {isPublic ? 'Anyone can find and follow you' : 'Only approved followers can see you'}
            </Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: theme.divider, true: theme.accent }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <Text style={s.sectionTitle}>About you</Text>
      <View style={s.card}>
        <Text style={s.fieldLabel}>Display name</Text>
        <TextInput
          style={s.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          placeholderTextColor={theme.placeholder}
          color={theme.text}
        />
        <Text style={s.fieldLabel}>Bio</Text>
        <TextInput
          style={[s.input, s.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell your trainer about yourself..."
          placeholderTextColor={theme.placeholder}
          color={theme.text}
          multiline
          numberOfLines={3}
        />
        <Text style={s.fieldLabel}>Height (cm)</Text>
        <TextInput
          style={s.input}
          value={height}
          onChangeText={setHeight}
          placeholder="e.g. 178"
          placeholderTextColor={theme.placeholder}
          color={theme.text}
          keyboardType="numeric"
        />
      </View>

      <TouchableOpacity style={s.saveButton} onPress={saveProfile} disabled={saving}>
        <Text style={s.saveButtonText}>{saving ? 'Saving...' : 'Save profile'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.signOutButton} onPress={handleSignOut}>
        <Text style={s.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

function makeStyles(t) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    content: { padding: 20, paddingBottom: 60 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg },
    heading: { fontSize: 28, fontWeight: '700', color: t.text, marginBottom: 24 },
    avatarContainer: { alignItems: 'center', marginBottom: 32 },
    avatar: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: t.accent, justifyContent: 'center', alignItems: 'center', marginBottom: 12
    },
    avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
    email: { color: t.subtext, fontSize: 14 },
    card: {
      backgroundColor: t.card, borderRadius: 12, padding: 16,
      borderWidth: 1, borderColor: t.cardBorder, marginBottom: 16
    },
    cardDivider: { height: 1, backgroundColor: t.divider, marginVertical: 14 },
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    toggleLabel: { color: t.text, fontSize: 15, fontWeight: '600', marginBottom: 4 },
    toggleSub: { color: t.subtext, fontSize: 13, maxWidth: 220 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: t.subtext, marginBottom: 12 },
    fieldLabel: { color: t.subtext, fontSize: 13, marginBottom: 6, marginTop: 12 },
    input: {
      backgroundColor: t.inputBg, borderRadius: 8,
      padding: 12, fontSize: 15, borderWidth: 1, borderColor: t.inputBorder
    },
    textArea: { height: 80, textAlignVertical: 'top' },
    saveButton: {
      backgroundColor: t.accent, borderRadius: 12,
      padding: 16, alignItems: 'center', marginBottom: 12
    },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    signOutButton: {
      borderRadius: 12, padding: 16, alignItems: 'center',
      borderWidth: 1, borderColor: t.cardBorder
    },
    signOutText: { color: t.danger, fontSize: 16 },
  })
}
