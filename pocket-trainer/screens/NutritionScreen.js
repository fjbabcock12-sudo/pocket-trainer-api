import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl
} from 'react-native'
import axios from 'axios'
import { API_URL } from '../config/config'
import { useTheme } from '../context/ThemeContext'

export default function NutritionScreen({ session }) {
  const { theme } = useTheme()
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

  const s = makeStyles(theme)

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    )
  }

  const today = summary?.today
  const weeklyByDay = summary?.weeklyByDay || {}
  const days = Object.entries(weeklyByDay).sort((a, b) => a[0].localeCompare(b[0]))

  function MacroBar({ label, value, max, color }) {
    const pct = Math.min((value / max) * 100, 100)
    return (
      <View style={s.macroRow}>
        <Text style={s.macroLabel}>{label}</Text>
        <View style={s.macroBarBg}>
          <View style={[s.macroBarFill, { width: `${pct}%`, backgroundColor: color }]} />
        </View>
        <Text style={s.macroValue}>{Math.round(value || 0)}g</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadSummary() }}
          tintColor={theme.accent}
        />
      }
    >
      <Text style={s.heading}>Nutrition</Text>

      <View style={s.calorieCard}>
        <Text style={s.calorieNumber}>{today?.calories || 0}</Text>
        <Text style={s.calorieLabel}>calories today</Text>
        <Text style={s.mealCount}>{today?.mealCount || 0} meals logged</Text>
      </View>

      <Text style={s.sectionTitle}>Today's macros</Text>
      <View style={s.macroCard}>
        <MacroBar label="Protein" value={today?.protein || 0} max={200} color={theme.accent} />
        <MacroBar label="Carbs"   value={today?.carbs   || 0} max={300} color="#FF6B6B" />
        <MacroBar label="Fat"     value={today?.fat     || 0} max={100} color="#FFB347" />
      </View>

      <Text style={s.sectionTitle}>This week</Text>
      {days.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyText}>No meals logged yet.</Text>
          <Text style={s.emptySubtext}>Tell your trainer what you're eating in the chat!</Text>
        </View>
      ) : (
        days.map(([date, data]) => (
          <View key={date} style={s.dayRow}>
            <Text style={s.dayLabel}>
              {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
            <View style={s.dayStats}>
              <Text style={s.dayCalories}>{Math.round(data.calories)} cal</Text>
              <Text style={s.dayMacros}>
                P: {Math.round(data.protein)}g  C: {Math.round(data.carbs)}g  F: {Math.round(data.fat)}g
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  )
}

function makeStyles(t) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    content: { padding: 20, paddingBottom: 40 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: t.bg },
    heading: { fontSize: 28, fontWeight: '700', color: t.text, marginBottom: 20 },
    calorieCard: {
      backgroundColor: t.card, borderRadius: 16, padding: 24,
      alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: t.cardBorder
    },
    calorieNumber: { fontSize: 56, fontWeight: '700', color: t.accent },
    calorieLabel: { fontSize: 16, color: t.subtext, marginTop: 4 },
    mealCount: { fontSize: 13, color: t.muted, marginTop: 8 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: t.subtext, marginBottom: 12, marginTop: 8 },
    macroCard: {
      backgroundColor: t.card, borderRadius: 12, padding: 16,
      borderWidth: 1, borderColor: t.cardBorder, marginBottom: 24, gap: 16
    },
    macroRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    macroLabel: { color: t.subtext, fontSize: 13, width: 50 },
    macroBarBg: { flex: 1, height: 6, backgroundColor: t.macroBg, borderRadius: 3, overflow: 'hidden' },
    macroBarFill: { height: '100%', borderRadius: 3 },
    macroValue: { color: t.text, fontSize: 13, width: 40, textAlign: 'right' },
    emptyCard: {
      backgroundColor: t.card, borderRadius: 12, padding: 20,
      borderWidth: 1, borderColor: t.cardBorder
    },
    emptyText: { color: t.text, fontSize: 15, marginBottom: 4 },
    emptySubtext: { color: t.subtext, fontSize: 13 },
    dayRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: t.divider
    },
    dayLabel: { color: t.text, fontSize: 14, fontWeight: '500' },
    dayStats: { alignItems: 'flex-end' },
    dayCalories: { color: t.accent, fontSize: 14, fontWeight: '600' },
    dayMacros: { color: t.muted, fontSize: 12, marginTop: 2 },
  })
}
