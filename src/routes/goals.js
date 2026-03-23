const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { requireAuth } = require('../middleware/auth')

// GET /api/goals
router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', req.userId)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ goals: data })
})

// POST /api/goals
router.post('/', requireAuth, async (req, res) => {
  const { goal_type, title, description, target_value, target_unit, start_value, target_date } = req.body

  if (!goal_type || !title) {
    return res.status(400).json({ error: 'goal_type and title are required' })
  }

  const { data, error } = await supabase
    .from('goals')
    .insert({
      user_id: req.userId,
      goal_type,
      title,
      description,
      target_value,
      target_unit,
      start_value,
      current_value: start_value,
      target_date,
      status: 'active',
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json({ goal: data })
})

// PATCH /api/goals/:id
router.patch('/:id', requireAuth, async (req, res) => {
  const allowed = ['title', 'description', 'target_value', 'target_unit',
                   'current_value', 'target_date', 'status']
  const updates = {}
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key]
  }

  const { data, error } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ goal: data })
})

// DELETE /api/goals/:id
router.delete('/:id', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId)

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ success: true })
})

module.exports = router
