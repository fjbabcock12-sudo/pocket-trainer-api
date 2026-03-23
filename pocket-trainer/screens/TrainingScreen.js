import React, { useState, useEffect } from 'react'
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity, RefreshControl
} from 'react-native'
import axios from 'axios'
import { API_URL } from '../config/config'

export default function TrainingScreen({ session }) {
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#6C47FF" size="large" />
      </View>
    )
  }

  const stats = summary?.last30Days
  const streak = summary?.streak || 0
  const recentWorkouts = summary?.recentWorkouts || []
  const weightHistory = summary?.weightHistory || []

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
      <Text style={styles.heading}>Training</Text>

      {/* Streak */}
      <View style={styles.streakCard}>
        <Text style={styles.streakNumber}>{streak}</Text>
        <Text style={styles.streakLabel}>day streak 🔥</Text>
      </View>

      {/* Last 30 days stats */}
      <Text style={styles.sectionTitle}>Last 30 days</Text>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.workoutCount || 0}</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.totalMinutes || 0}</Text>
          <Text style={styles.statLabel}>Minutes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.totalCaloriesBurned || 0}</Text>
          <Text style={styles.statLabel}>Cal burned</Text>
        </View>
      </View>

      {/* Recent workouts */}
      <Text style={styles.sectionTitle}>Recent workouts</Text>
      {recentWorkouts.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No workouts logged yet.</Text>
          <Text style={styles.emptySubtext}>Tell your trainer about your workout in the chat!</Text>
        </View>
      ) : (
        recentWorkouts.map((w, i) => {
          const isExpanded = expandedId === (w.id || i)
          const exercises = w.exercises || []
          return (
            <TouchableOpacity
              key={w.id || i}
              style={styles.workoutCard}
              onPress={() => toggleExpand(w.id || i)}
              activeOpacity={0.8}
            >
              {/* Header row */}
              <View style={styles.workoutHeader}>
                <View style={styles.workoutLeft}>
                  <Text style={styles.workoutTitle}>{w.title || w.workout_type}</Text>
                  <Text style={styles.workoutDate}>
                    {new Date(w.logged_at).toLocaleDateString('en-US', {
                      weekday: 'short', month: 'short', day: 'numeric'
                    })}
                  </Text>
                </View>
                <View style={styles.workoutRight}>
                  {w.duration_minutes > 0 && (
                    <Text style={styles.workoutStat}>{w.duration_minutes} min</Text>
                  )}
                  {w.calories_burned > 0 && (
                    <Text style={styles.workoutStatSub}>{w.calories_burned} cal</Text>
                  )}
                  <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
                </View>
              </View>

              {/* Expanded exercise grid */}
              {isExpanded && (
                <View style={styles.exerciseSection}>
                  <View style={styles.divider} />
                  {exercises.length === 0 ? (
                    <Text style={styles.noExercises}>No exercise details logged</Text>
                  ) : (
                    <>
                      {/* Grid header */}
                      <View style={styles.gridHeader}>
                        <Text style={[styles.gridHeaderText, styles.colExercise]}>Exercise</Text>
                        <Text style={[styles.gridHeaderText, styles.colSets]}>Sets</Text>
                        <Text style={[styles.gridHeaderText, styles.colReps]}>Reps</Text>
                        <Text style={[styles.gridHeaderText, styles.colWeight]}>Weight</Text>
                      </View>
                      {/* Grid rows */}
                      {exercises.map((ex, j) => (
                        <View
                          key={j}
                          style={[styles.gridRow, j % 2 === 0 ? styles.gridRowEven : styles.gridRowOdd]}
                        >
                          <Text style={[styles.gridCell, styles.colExercise]} numberOfLines={1}>
                            {ex.name || '—'}
                          </Text>
                          <Text style={[styles.gridCell, styles.colSets]}>
                            {ex.sets || '—'}
                          </Text>
                          <Text style={[styles.gridCell, styles.colReps]}>
                            {ex.reps || (ex.duration_seconds ? `${ex.duration_seconds}s` : '—')}
                          </Text>
                          <Text style={[styles.gridCell, styles.colWeight]}>
                            {ex.weight ? `${ex.weight} ${ex.weight_unit || 'lbs'}` : (ex.distance_km ? `${ex.distance_km}km` : '—')}
                          </Text>
                        </View>
                      ))}
                    </>
                  )}
                  {w.notes ? (
                    <Text style={styles.workoutNotes}>📝 {w.notes}</Text>
                  ) : null}
                </View>
              )}
            </TouchableOpacity>
          )
        })
      )}

      {/* Weight history */}
      {weightHistory.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Weight history</Text>
          {weightHistory.map((m, i) => (
            <View key={i} style={styles.metricRow}>
              <Text style={styles.metricDate}>
                {new Date(m.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
              <Text style={styles.metricValue}>{m.weight} {m.weight_unit}</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 20, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  heading: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 20 },
  streakCard: {
    backgroundColor: '#111', borderRadius: 16, padding: 24,
    alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#222'
  },
  streakNumber: { fontSize: 56, fontWeight: '700', color: '#6C47FF' },
  streakLabel: { fontSize: 16, color: '#888', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#888', marginBottom: 12, marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: '#111', borderRadius: 12, padding: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#222'
  },
  statNumber: { fontSize: 24, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 4 },
  emptyCard: {
    backgroundColor: '#111', borderRadius: 12, padding: 20,
    borderWidth: 1, borderColor: '#222', marginBottom: 12
  },
  emptyText: { color: '#fff', fontSize: 15, marginBottom: 4 },
  emptySubtext: { color: '#888', fontSize: 13 },
  workoutCard: {
    backgroundColor: '#111', borderRadius: 12, padding: 16,
    marginBottom: 8, borderWidth: 1, borderColor: '#222'
  },
  workoutHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  workoutLeft: { flex: 1 },
  workoutTitle: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 4 },
  workoutDate: { color: '#888', fontSize: 13 },
  workoutRight: { alignItems: 'flex-end', gap: 2 },
  workoutStat: { color: '#6C47FF', fontSize: 15, fontWeight: '600' },
  workoutStatSub: { color: '#888', fontSize: 13 },
  chevron: { color: '#555', fontSize: 11, marginTop: 4 },
  exerciseSection: { marginTop: 12 },
  divider: { height: 1, backgroundColor: '#222', marginBottom: 12 },
  noExercises: { color: '#555', fontSize: 13, fontStyle: 'italic' },
  gridHeader: {
    flexDirection: 'row', paddingVertical: 6, marginBottom: 4
  },
  gridHeaderText: { fontSize: 11, fontWeight: '600', color: '#555', textTransform: 'uppercase' },
  gridRow: { flexDirection: 'row', paddingVertical: 8, borderRadius: 6 },
  gridRowEven: { backgroundColor: '#1a1a1a' },
  gridRowOdd: { backgroundColor: 'transparent' },
  gridCell: { fontSize: 14, color: '#e0e0e0' },
  colExercise: { flex: 2, paddingLeft: 8 },
  colSets: { flex: 1, textAlign: 'center' },
  colReps: { flex: 1, textAlign: 'center' },
  colWeight: { flex: 1, textAlign: 'right', paddingRight: 8 },
  workoutNotes: { color: '#888', fontSize: 13, marginTop: 10, fontStyle: 'italic' },
  metricRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#111'
  },
  metricDate: { color: '#888', fontSize: 14 },
  metricValue: { color: '#fff', fontSize: 14, fontWeight: '600' }
})