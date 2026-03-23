import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl
} from 'react-native'
import axios from 'axios'
import { API_URL } from '../config/config'

export default function NutritionScreen({ session }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { loadSummary() }, [])

  async function loadSummary() {
    try {
      const res = await axios.get(`${API_URL}/api/nutrition/summary`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      setSummary(res.data)
    } catch (err) {
      console.log('Error loading nutrition summary:', err.message)
    }
    setLoading(false)
    setRefreshing(false)
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#6C47FF" size="large" />
      </View>
    )
  }

  const today = summary?.today
  const weeklyByDay = summary?.weeklyByDay || {}
  const days = Object.entries(weeklyByDay).sort((a, b) => a[0].localeCompare(b[0]))

  function MacroBar({ label, value, max, color }) {
    const pct = Math.min((value / max) * 100, 100)
    return (
      <View style={styles.macroRow}>
        <Text style={styles.macroLabel}>{label}</Text>
        <View style={styles.macroBarBg}>
          <View style={[styles.macroBarFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
        <Text style={styles.macroValue}>{Math.round(value || 0)}g</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadSummary() }}
          tintColor="#6C47FF"
        />
      }
    >
      <Text style={styles.heading}>Nutrition</Text>

      {/* Today's calories */}
      <View style={styles.calorieCard}>
        <Text style={styles.calorieNumber}>{today?.calories || 0}</Text>
        <Text style={styles.calorieLabel}>calories today</Text>
        <Text style={styles.mealCount}>{today?.mealCount || 0} meals logged</Text>
      </View>

      {/* Macros */}
      <Text style={styles.sectionTitle}>Today's macros</Text>
      <View style={styles.macroCard}>
        <MacroBar label="Protein" value={today?.protein || 0} max={200} color="#6C47FF" />
        <MacroBar label="Carbs"   value={today?.carbs   || 0} max={300} color="#FF6B6B" />
        <MacroBar label="Fat"     value={today?.fat     || 0} max={100} color="#FFB347" />
      </View>

      {/* Weekly breakdown */}
      <Text style={styles.sectionTitle}>This week</Text>
      {days.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No meals logged yet.</Text>
          <Text style={styles.emptySubtext}>Tell your trainer what you're eating in the chat!</Text>
        </View>
      ) : (
        days.map(([date, data]) => (
          <View key={date} style={styles.dayRow}>
            <Text style={styles.dayLabel}>
              {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
            <View style={styles.dayStats}>
              <Text style={styles.dayCalories}>{Math.round(data.calories)} cal</Text>
              <Text style={styles.dayMacros}>
                P: {Math.round(data.protein)}g  C: {Math.round(data.carbs)}g  F: {Math.round(data.fat)}g
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  heading: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 20 },
  calorieCard: {
    backgroundColor: '#111', borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#222'
  },
  calorieNumber: { fontSize: 56, fontWeight: '700', color: '#6C47FF' },
  calorieLabel: { fontSize: 16, color: '#888', marginTop: 4 },
  mealCount: { fontSize: 13, color: '#555', marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#888', marginBottom: 12, marginTop: 8 },
  macroCard: {
    backgroundColor: '#111', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#222', marginBottom: 24, gap: 16
  },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  macroLabel: { color: '#888', fontSize: 13, width: 50 },
  macroBarBg: { flex: 1, height: 6, backgroundColor: '#222', borderRadius: 3, overflow: 'hidden' },
  macroBarFill: { height: '100%', borderRadius: 3 },
  macroValue: { color: '#fff', fontSize: 13, width: 40, textAlign: 'right' },
  emptyCard: {
    backgroundColor: '#111', borderRadius: 12, padding: 20,
    borderWidth: 1, borderColor: '#222'
  },
  emptyText: { color: '#fff', fontSize: 15, marginBottom: 4 },
  emptySubtext: { color: '#888', fontSize: 13 },
  dayRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#111'
  },
  dayLabel: { color: '#fff', fontSize: 14, fontWeight: '500' },
  dayStats: { alignItems: 'flex-end' },
  dayCalories: { color: '#6C47FF', fontSize: 14, fontWeight: '600' },
  dayMacros: { color: '#555', fontSize: 12, marginTop: 2 }
})