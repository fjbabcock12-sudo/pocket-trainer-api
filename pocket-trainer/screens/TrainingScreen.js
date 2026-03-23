import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity, RefreshControl
} from 'react-native'
import axios from 'axios'
import { API_URL } from '../config/config'
import { useTheme } from '../context/ThemeContext'

export default function TrainingScreen({ session }) {
  const { theme } = useTheme()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => { loadSummary() }, [])

  async function loadSummary() {
    try {
      const res = await axios.get(`${API_URL}/api/training/summary`, {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      setSummary(res.data)
    } catch (err) {
      console.log('Error loading training summary:', err.message)
    }
    setLoading(false)
    setRefreshing(false)
  }

  function toggleExpand(id) {
    setExpandedId(prev => prev === id ? null : id)
  }

  const s = makeStyles(theme)

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={theme.accent} size="large" />
      </View>
    )
  }

  const stats = summary?.last30Days
  const streak = summary?.streak || 0
  const recentWorkouts = summary?.recentWorkouts || []
  const weightHistory = summary?.weightHistory || []

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
      <Text style={s.heading}>Training</Text>

      <View style={s.streakCard}>
        <Text style={s.streakNumber}>{streak}</Text>
        <Text style={s.streakLabel}>day streak 🔥</Text>
      </View>

      <Text style={s.sectionTitle}>Last 30 days</Text>
      <View style={s.statsRow}>
        <View style={s.statCard}>
          <Text style={s.statNumber}>{stats?.workoutCount || 0}</Text>
          <Text style={s.statLabel}>Workouts</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statNumber}>{stats?.totalMinutes || 0}</Text>
          <Text style={s.statLabel}>Minutes</Text>
        </View>
        <View style={s.statCard}>
          <Text style={s.statNumber}>{stats?.totalCaloriesBurned || 0}</Text>
          <Text style={s.statLabel}>Cal burned</Text>
        </View>
      </View>

      <Text style={s.sectionTitle}>Recent workouts</Text>
      {recentWorkouts.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyText}>No workouts logged yet.</Text>
          <Text style={s.emptySubtext}>Tell your trainer about your workout in the chat!</Text>
        </View>
      ) : (
        recentWorkouts.map((w, i) => {
          const isExpanded = expandedId === (w.id || i)
          const exercises = w.exercises || []
          return (
            <TouchableOpacity
              key={w.id || i}
              style={s.workoutCard}
              onPress={() => toggleExpand(w.id || i)}
              activeOpacity={0.8}
            >
              <View style={s.workoutHeader}>
                <View style={s.workoutLeft}>
                  <Text style={s.workoutTitle}>{w.title || w.workout_type}</Text>
                  <Text style={s.workoutDate}>
                    {new Date(w.logged_at).toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric'
                    })}
                  </Text>
                </View>
                <View style={s.workoutRight}>
                  {w.duration_minutes > 0 && (
                    <Text style={s.workoutStat}>{w.duration_minutes} min</Text>
                  )}
                  {w.calories_burned > 0 && (
                    <Text style={s.workoutStatSub}>{w.calories_burned} cal</Text>
                  )}
                  <Text style={s.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                </View>
              </View>

              {isExpanded && (
                <View style={s.exerciseSection}>
                  <View style={s.divider} />
                  {exercises.length === 0 ? (
                    <Text style={s.noExercises}>No exercise details logged</Text>
                  ) : (
                    <>
                      <View style={s.gridHeader}>
                        <Text style={[s.gridHeaderText, s.colExercise]}>Exercise</Text>
                        <Text style={[s.gridHeaderText, s.colSets]}>Sets</Text>
                        <Text style={[s.gridHeaderText, s.colReps]}>Reps</Text>
                        <Text style={[s.gridHeaderText, s.colWeight]}>Weight</Text>
                      </View>
                      {exercises.map((ex, j) => (
                        <View
                          key={j}
                          style={[s.gridRow, j % 2 === 0 ? s.gridRowEven : s.gridRowOdd]}
                        >
                          <Text style={[s.gridCell, s.colExercise]} numberOfLines={1}>
                            {ex.name || '—'}
                          </Text>
                          <Text style={[s.gridCell, s.colSets]}>{ex.sets || '—'}</Text>
                          <Text style={[s.gridCell, s.colReps]}>
                            {ex.reps || (ex.duration_seconds ? `${ex.duration_seconds}s` : '—')}
                          </Text>
                          <Text style={[s.gridCell, s.colWeight]}>
                            {ex.weight ? `${ex.weight} ${ex.weight_unit || 'lbs'}` : (ex.distance_km ? `${ex.distance_km}km` : '—')}
                          </Text>
                        </View>
                      ))}
                    </>
                  )}
                  {w.notes ? <Text style={s.workoutNotes}>📝 {w.notes}</Text> : null}
                </View>
              )}
            </TouchableOpacity>
          )
        })
      )}

      {weightHistory.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Weight history</Text>
          {weightHistory.map((m, i) => (
            <View key={i} style={s.metricRow}>
              <Text style={s.metricDate}>
                {new Date(m.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              <Text style={s.metricValue}>{m.weight} {m.weight_unit}</Text>
            </View>
          ))}
        </>
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
    streakCard: {
      backgroundColor: t.card, borderRadius: 16, padding: 24,
      alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: t.cardBorder
    },
    streakNumber: { fontSize: 56, fontWeight: '700', color: t.accent },
    streakLabel: { fontSize: 16, color: t.subtext, marginTop: 4 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: t.subtext, marginBottom: 12, marginTop: 8 },
    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    statCard: {
      flex: 1, backgroundColor: t.card, borderRadius: 12, padding: 16,
      alignItems: 'center', borderWidth: 1, borderColor: t.cardBorder
    },
    statNumber: { fontSize: 24, fontWeight: '700', color: t.text },
    statLabel: { fontSize: 12, color: t.subtext, marginTop: 4 },
    emptyCard: {
      backgroundColor: t.card, borderRadius: 12, padding: 20,
      borderWidth: 1, borderColor: t.cardBorder, marginBottom: 12
    },
    emptyText: { color: t.text, fontSize: 15, marginBottom: 4 },
    emptySubtext: { color: t.subtext, fontSize: 13 },
    workoutCard: {
      backgroundColor: t.card, borderRadius: 12, padding: 16,
      marginBottom: 8, borderWidth: 1, borderColor: t.cardBorder
    },
    workoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    workoutLeft: { flex: 1 },
    workoutTitle: { color: t.text, fontSize: 15, fontWeight: '600', marginBottom: 4 },
    workoutDate: { color: t.subtext, fontSize: 13 },
    workoutRight: { alignItems: 'flex-end', gap: 2 },
    workoutStat: { color: t.accent, fontSize: 15, fontWeight: '600' },
    workoutStatSub: { color: t.subtext, fontSize: 13 },
    chevron: { color: t.muted, fontSize: 11, marginTop: 4 },
    exerciseSection: { marginTop: 12 },
    divider: { height: 1, backgroundColor: t.divider, marginBottom: 12 },
    noExercises: { color: t.muted, fontSize: 13, fontStyle: 'italic' },
    gridHeader: { flexDirection: 'row', paddingVertical: 6, marginBottom: 4 },
    gridHeaderText: { fontSize: 11, fontWeight: '600', color: t.muted, textTransform: 'uppercase' },
    gridRow: { flexDirection: 'row', paddingVertical: 8, borderRadius: 6 },
    gridRowEven: { backgroundColor: t.rowAlt },
    gridRowOdd: { backgroundColor: 'transparent' },
    gridCell: { fontSize: 14, color: t.text },
    colExercise: { flex: 2, paddingLeft: 8 },
    colSets: { flex: 1, textAlign: 'center' },
    colReps: { flex: 1, textAlign: 'center' },
    colWeight: { flex: 1, textAlign: 'right', paddingRight: 8 },
    workoutNotes: { color: t.subtext, fontSize: 13, marginTop: 10, fontStyle: 'italic' },
    metricRow: {
      flexDirection: 'row', justifyContent: 'space-between',
      paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: t.divider
    },
    metricDate: { color: t.subtext, fontSize: 14 },
    metricValue: { color: t.text, fontSize: 14, fontWeight: '600' },
  })
}
