const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { requireAuth } = require('../middleware/auth')

// ── Workouts ──────────────────────────────────────────────

// GET /api/training/workouts
router.get('/workouts', requireAuth, async (req, res) => {
  const limit = parseInt(req.query.limit) || 20
  const offset = parseInt(req.query.offset) || 0

  const { data, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('user_id', req.userId)
    .order('logged_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ workouts: data })
})

// POST /api/training/workouts (manual entry, not via chat)
router.post('/workouts', requireAuth, async (req, res) => {
  const { title, workout_type, duration_minutes, calories_burned, exercises, notes, logged_at } = req.body

  const { data, error } = await supabase
    .from('workouts')
    .insert({
      user_id: req.userId,
      title,
      workout_type: workout_type || 'other',
      duration_minutes,
      calories_burned,
      exercises: exercises || [],
      notes,
      logged_at: logged_at || new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json({ workout: data })
})

// DELETE /api/training/workouts/:id
router.delete('/workouts/:id', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('workouts')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId)

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ success: true })
})

// ── Body Metrics ──────────────────────────────────────────

// GET /api/training/metrics
router.get('/metrics', requireAuth, async (req, res) => {
  const limit = parseInt(req.query.limit) || 30

  const { data, error } = await supabase
    .from('body_metrics')
    .select('*')
    .eq('user_id', req.userId)
    .order('logged_at', { ascending: false })
    .limit(limit)

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ metrics: data })
})

// POST /api/training/metrics (manual entry)
router.post('/metrics', requireAuth, async (req, res) => {
  const { weight, weight_unit, body_fat_pct, muscle_mass, notes } = req.body

  const { data, error } = await supabase
    .from('body_metrics')
    .insert({
      user_id: req.userId,
      weight,
      weight_unit: weight_unit || 'lbs',
      body_fat_pct,
      muscle_mass,
      notes,
      logged_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json({ metric: data })
})

// GET /api/training/summary
// Returns a summary for the training tab dashboard
router.get('/summary', requireAuth, async (req, res) => {
  const userId = req.userId

  // Last 30 days of workouts
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [workoutsResult, metricsResult] = await Promise.all([
    supabase
      .from('workouts')
      .select('id, title, workout_type, duration_minutes, calories_burned, exercises, notes, logged_at')
      .eq('user_id', userId)
      .gte('logged_at', thirtyDaysAgo.toISOString())
      .order('logged_at', { ascending: true }),
    supabase
      .from('body_metrics')
      .select('weight, weight_unit, logged_at')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false })
      .limit(30),
  ])

  const workouts = workoutsResult.data || []
  const metrics = metricsResult.data || []

  // Compute streak
  const streak = computeStreak(workouts)

  return res.json({
    last30Days: {
      workoutCount: workouts.length,
      totalMinutes: workouts.reduce((s, w) => s + (w.duration_minutes || 0), 0),
      totalCaloriesBurned: workouts.reduce((s, w) => s + (w.calories_burned || 0), 0),
    },
    streak,
    weightHistory: metrics.slice(0, 10).reverse(),
    recentWorkouts: workouts.slice(-5).reverse(),
  })
})

function computeStreak(workouts) {
  if (workouts.length === 0) return 0

  const workoutDays = new Set(
    workouts.map(w => new Date(w.logged_at).toISOString().split('T')[0])
  )

  let streak = 0
  const today = new Date()

  for (let i = 0; i < 365; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    if (workoutDays.has(dateStr)) {
      streak++
    } else if (i > 0) {
      break
    }
  }

  return streak
}

module.exports = router
