const supabase = require('../lib/supabase')

// Parses Claude's response for log blocks and saves them to Supabase
// Returns { cleanResponse, loggedType, loggedId }
async function parseAndSaveLogs(userId, responseText) {
  let cleanResponse = responseText
  let loggedType = null
  let loggedId = null

  // Try to parse each log type
  const workoutMatch = extractBlock(responseText, 'LOG_WORKOUT')
  const mealMatch = extractBlock(responseText, 'LOG_MEAL')
  const metricMatch = extractBlock(responseText, 'LOG_METRIC')

  if (workoutMatch) {
    const result = await saveWorkout(userId, workoutMatch)
    if (result) {
      loggedType = 'workout'
      loggedId = result.id
    }
    cleanResponse = removeBlock(cleanResponse, 'LOG_WORKOUT')
  }

  if (mealMatch) {
    const result = await saveMeal(userId, mealMatch)
    if (result) {
      loggedType = 'meal'
      loggedId = result.id
    }
    cleanResponse = removeBlock(cleanResponse, 'LOG_MEAL')
  }

  if (metricMatch) {
    const result = await saveBodyMetric(userId, metricMatch)
    if (result) {
      loggedType = 'body_metric'
      loggedId = result.id
    }
    cleanResponse = removeBlock(cleanResponse, 'LOG_METRIC')
  }

  return {
    cleanResponse: cleanResponse.trim(),
    loggedType,
    loggedId,
  }
}

function extractBlock(text, tag) {
  const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`)
  const match = text.match(regex)
  if (!match) return null
  try {
    return JSON.parse(match[1].trim())
  } catch (e) {
    console.error(`Failed to parse ${tag} block:`, e.message)
    return null
  }
}

function removeBlock(text, tag) {
  const regex = new RegExp(`<${tag}>[\\s\\S]*?<\\/${tag}>`, 'g')
  return text.replace(regex, '').trim()
}

async function saveWorkout(userId, data) {
  const { data: row, error } = await supabase
    .from('workouts')
    .insert({
      user_id: userId,
      title: data.title,
      workout_type: data.workout_type || 'other',
      duration_minutes: data.duration_minutes || null,
      calories_burned: data.calories_burned || null,
      exercises: data.exercises || [],
      notes: data.notes || null,
      logged_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error saving workout:', error.message)
    return null
  }
  return row
}

async function saveMeal(userId, data) {
  const { data: row, error } = await supabase
    .from('meals')
    .insert({
      user_id: userId,
      meal_name: data.meal_name,
      total_calories: data.total_calories || null,
      total_protein_g: data.total_protein_g || null,
      total_carbs_g: data.total_carbs_g || null,
      total_fat_g: data.total_fat_g || null,
      items: data.items || [],
      logged_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error saving meal:', error.message)
    return null
  }
  return row
}

async function saveBodyMetric(userId, data) {
  const { data: row, error } = await supabase
    .from('body_metrics')
    .insert({
      user_id: userId,
      weight: data.weight || null,
      weight_unit: data.weight_unit || 'lbs',
      body_fat_pct: data.body_fat_pct || null,
      notes: data.notes || null,
      logged_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    console.error('Error saving body metric:', error.message)
    return null
  }
  return row
}

module.exports = { parseAndSaveLogs }
