const express = require('express')
const router = express.Router()
const supabase = require('../lib/supabase')
const { requireAuth } = require('../middleware/auth')

// GET /api/nutrition/meals
router.get('/meals', requireAuth, async (req, res) => {
  const limit = parseInt(req.query.limit) || 20
  const offset = parseInt(req.query.offset) || 0
  const date = req.query.date // optional YYYY-MM-DD filter

  let query = supabase
    .from('meals')
    .select('*')
    .eq('user_id', req.userId)
    .order('logged_at', { ascending: false })

  if (date) {
    query = query
      .gte('logged_at', `${date}T00:00:00.000Z`)
      .lte('logged_at', `${date}T23:59:59.999Z`)
  } else {
    query = query.range(offset, offset + limit - 1)
  }

  const { data, error } = await query
  if (error) return res.status(500).json({ error: error.message })
  return res.json({ meals: data })
})

// POST /api/nutrition/meals (manual entry)
router.post('/meals', requireAuth, async (req, res) => {
  const { meal_name, total_calories, total_protein_g, total_carbs_g, total_fat_g, items, notes, logged_at } = req.body

  const { data, error } = await supabase
    .from('meals')
    .insert({
      user_id: req.userId,
      meal_name,
      total_calories,
      total_protein_g,
      total_carbs_g,
      total_fat_g,
      items: items || [],
      notes,
      logged_at: logged_at || new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json({ meal: data })
})

// DELETE /api/nutrition/meals/:id
router.delete('/meals/:id', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('meals')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId)

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ success: true })
})

// GET /api/nutrition/summary
// Returns today's totals + weekly breakdown for the nutrition tab
router.get('/summary', requireAuth, async (req, res) => {
  const userId = req.userId

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: meals, error } = await supabase
    .from('meals')
    .select('meal_name, logged_at, total_calories, total_protein_g, total_carbs_g, total_fat_g')
    .eq('user_id', userId)
    .gte('logged_at', sevenDaysAgo.toISOString())
    .order('logged_at', { ascending: true })

  if (error) return res.status(500).json({ error: error.message })

  const todayStr = new Date().toISOString().split('T')[0]
  const todaysMeals = (meals || []).filter(m => m.logged_at?.startsWith(todayStr))

  // Group by day for weekly chart
  const byDay = {}
  for (const meal of meals || []) {
    const day = meal.logged_at?.split('T')[0]
    if (!day) continue
    if (!byDay[day]) byDay[day] = { calories: 0, protein: 0, carbs: 0, fat: 0 }
    byDay[day].calories += meal.total_calories || 0
    byDay[day].protein  += meal.total_protein_g || 0
    byDay[day].carbs    += meal.total_carbs_g || 0
    byDay[day].fat      += meal.total_fat_g || 0
  }

  return res.json({
    today: {
      calories: todaysMeals.reduce((s, m) => s + (m.total_calories || 0), 0),
      protein:  todaysMeals.reduce((s, m) => s + (m.total_protein_g || 0), 0),
      carbs:    todaysMeals.reduce((s, m) => s + (m.total_carbs_g || 0), 0),
      fat:      todaysMeals.reduce((s, m) => s + (m.total_fat_g || 0), 0),
      mealCount: todaysMeals.length,
    },
    weeklyByDay: byDay,
  })
})

module.exports = router
