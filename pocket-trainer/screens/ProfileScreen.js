import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, ActivityIndicator, Alert, Switch
} from 'react-native'
import axios from 'axios'
import { API_URL } from '../config/config'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/config'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export default function ProfileScreen({ session }) {
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#6C47FF" size="large" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Profile</Text>

      {/* Avatar placeholder */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {displayName ? displayName[0].toUpperCase() : '?'}
          </Text>
        </View>
        <Text style={styles.email}>{session.user.email}</Text>
      </View>

      {/* Account type toggle */}
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleLabel}>Public profile</Text>
            <Text style={styles.toggleSub}>
              {isPublic ? 'Anyone can find and follow you' : 'Only approved followers can see you'}
            </Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: '#222', true: '#6C47FF' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      {/* Fields */}
      <Text style={styles.sectionTitle}>About you</Text>
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>Display name</Text>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
          placeholderTextColor="#555"
        />
        <Text style={styles.fieldLabel}>Bio</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell your trainer about yourself..."
          placeholderTextColor="#555"
          multiline
          numberOfLines={3}
        />
        <Text style={styles.fieldLabel}>Height (cm)</Text>
        <TextInput
          style={styles.input}
          value={height}
          onChangeText={setHeight}
          placeholder="e.g. 178"
          placeholderTextColor="#555"
          keyboardType="numeric"
        />
      </View>

      <TouchableOpacity
        style={styles.saveButton}
        onPress={saveProfile}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Saving...' : 'Save profile'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 20, paddingBottom: 60 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  heading: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 24 },
  avatarContainer: { alignItems: 'center', marginBottom: 32 },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#6C47FF', justifyContent: 'center', alignItems: 'center', marginBottom: 12
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  email: { color: '#888', fontSize: 14 },
  card: {
    backgroundColor: '#111', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#222', marginBottom: 16
  },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  toggleLabel: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  toggleSub: { color: '#888', fontSize: 13, maxWidth: 220 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#888', marginBottom: 12 },
  fieldLabel: { color: '#888', fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#1a1a1a', color: '#fff', borderRadius: 8,
    padding: 12, fontSize: 15, borderWidth: 1, borderColor: '#333'
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  saveButton: {
    backgroundColor: '#6C47FF', borderRadius: 12,
    padding: 16, alignItems: 'center', marginBottom: 12
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  signOutButton: {
    borderRadius: 12, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#333'
  },
  signOutText: { color: '#FF6B6B', fontSize: 16 }
})