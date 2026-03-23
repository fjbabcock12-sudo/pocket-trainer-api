const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { requireAuth } = require('../middleware/auth')

// GET /api/profile
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', req.userId)
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ profile: data })
})

// PATCH /api/profile
router.patch('/', requireAuth, async (req, res) => {
  const allowed = [
    'display_name', 'bio', 'avatar_url', 'location',
    'account_type', 'date_of_birth', 'gender',
    'height', 'height_unit', 'weight_unit', 'timezone', 'units_system'
  ]

  const updates = {}
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key]
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No valid fields to update' })
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', req.userId)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ profile: data })
})

// GET /api/profile/privacy
router.get('/privacy', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('privacy_settings')
    .select('*')
    .eq('user_id', req.userId)
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ privacy: data })
})

// PATCH /api/profile/privacy
router.patch('/privacy', requireAuth, async (req, res) => {
  const allowed = [
    'share_display_name', 'share_avatar', 'share_bio', 'share_location',
    'share_weight', 'share_body_fat', 'share_measurements',
    'share_workouts', 'share_streak', 'share_goals', 'share_achievements',
    'share_calories', 'share_macros', 'share_meals',
    'appear_on_leaderboard', 'leaderboard_visibility'
  ]

  const updates = {}
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key]
  }

  const { data, error } = await supabase
    .from('privacy_settings')
    .update(updates)
    .eq('user_id', req.userId)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ privacy: data })
})

module.exports = router
