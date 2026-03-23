const supabase = require('../lib/supabase')

// Pulls everything Claude needs to know about the user
// and assembles it into a system prompt
async function buildUserContext(userId) {
  const [profile, goals, recentWorkouts, recentMeals, recentMetrics] =
    await Promise.all([
      getProfile(userId),
      getActiveGoals(userId),
      getRecentWorkouts(userId),
      getRecentMeals(userId),
      getRecentBodyMetrics(userId),
    ])

  return buildSystemPrompt({ profile, goals, recentWorkouts, recentMeals, recentMetrics })
}

async function getProfile(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('display_name, date_of_birth, gender, height, height_unit, weight_unit')
    .eq('user_id', userId)
    .single()
  return data
}

async function getActiveGoals(userId) {
  const { data } = await supabase
    .from('goals')
    .select('goal_type, title, description, target_value, target_unit, start_value, current_value, target_date')
    .eq('user_id', userId)
    .eq('status', 'active')
  return data || []
}

async function getRecentWorkouts(userId) {
  const { data } = await supabase
    .from('workouts')
    .select('title, workout_type, logged_at, duration_minutes, calories_burned, exercises, notes')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(7)
  return data || []
}

async function getRecentMeals(userId) {
  const { data } = await supabase
    .from('meals')
    .select('meal_name, logged_at, total_calories, total_protein_g, total_carbs_g, total_fat_g, items')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(14)
  return data || []
}

async function getRecentBodyMetrics(userId) {
  const { data } = await supabase
    .from('body_metrics')
    .select('logged_at, weight, weight_unit, body_fat_pct')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(10)
  return data || []
}

function buildSystemPrompt({ profile, goals, recentWorkouts, recentMeals, recentMetrics }) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  // Compute today's nutrition totals
  const todayStr = new Date().toISOString().split('T')[0]
  const todaysMeals = recentMeals.filter(m => m.logged_at?.startsWith(todayStr))
  const todaysCalories = todaysMeals.reduce((sum, m) => sum + (m.total_calories || 0), 0)
  const todaysProtein = todaysMeals.reduce((sum, m) => sum + (m.total_protein_g || 0), 0)

  // Most recent weight
  const latestWeight = recentMetrics[0]
    ? `${recentMetrics[0].weight} ${recentMetrics[0].weight_unit}`
    : 'not logged'

  return `You are a personal trainer and nutrition coach. You have a warm, encouraging tone — like a knowledgeable friend who genuinely wants to help the user reach their goals. You are direct, specific, and never give generic advice. Everything you say is tailored to this specific person.

Today is ${today}.

== USER PROFILE ==
Name: ${profile?.display_name || 'User'}
Gender: ${profile?.gender || 'not specified'}
Height: ${profile?.height ? `${profile.height} ${profile?.height_unit || 'cm'}` : 'not logged'}
Current weight: ${latestWeight}

== ACTIVE GOALS ==
${goals.length === 0
  ? 'No goals set yet. Encourage the user to set one.'
  : goals.map(g => `- ${g.title}: ${g.description || ''} (target: ${g.target_value} ${g.target_unit || ''} by ${g.target_date || 'no date set'})`).join('\n')
}

== TODAY'S NUTRITION ==
Calories so far: ${todaysCalories} kcal
Protein so far: ${todaysProtein}g
Meals logged today: ${todaysMeals.length}

== RECENT WORKOUTS (last 7 days) ==
${recentWorkouts.length === 0
  ? 'No workouts logged recently.'
  : recentWorkouts.map(w =>
      `- ${new Date(w.logged_at).toLocaleDateString()}: ${w.title || w.workout_type} (${w.duration_minutes || '?'} min, ${w.calories_burned || '?'} cal burned)`
    ).join('\n')
}

== RECENT MEALS (last 14 days) ==
${recentMeals.length === 0
  ? 'No meals logged recently.'
  : recentMeals.slice(0, 5).map(m =>
      `- ${new Date(m.logged_at).toLocaleDateString()}: ${m.meal_name || 'Meal'} — ${m.total_calories || '?'} kcal (P: ${m.total_protein_g || '?'}g, C: ${m.total_carbs_g || '?'}g, F: ${m.total_fat_g || '?'}g)`
    ).join('\n')
}

== INSTRUCTIONS ==
When the user logs a workout, meal, or body metric in conversation:
1. Respond naturally and encouragingly first
2. At the END of your response, include a structured log block so the app can save it automatically
3. Use this exact format for the log block — do not deviate:

For a workout:
<LOG_WORKOUT>
{
  "title": "...",
  "workout_type": "strength|cardio|hiit|yoga|sports|other",
  "duration_minutes": 0,
  "calories_burned": 0,
  "exercises": [
    { "name": "...", "sets": 0, "reps": 0, "weight": 0, "weight_unit": "lbs|kg" }
  ],
  "notes": "..."
}
</LOG_WORKOUT>

For a meal:
<LOG_MEAL>
{
  "meal_name": "...",
  "total_calories": 0,
  "total_protein_g": 0,
  "total_carbs_g": 0,
  "total_fat_g": 0,
  "items": [
    { "name": "...", "calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "quantity": 0, "unit": "g|oz|cup|piece" }
  ]
}
</LOG_MEAL>

For a body metric (weight, body fat):
<LOG_METRIC>
{
  "weight": 0,
  "weight_unit": "lbs|kg",
  "body_fat_pct": 0,
  "notes": "..."
}
</LOG_METRIC>

Only include a log block when the user is clearly logging something. Do not include it for questions, general conversation, or workout/meal planning.

Keep responses concise and conversational. Use plain text — no markdown headers or bullet walls. When generating workout or meal plans, keep them practical and achievable.`
}

module.exports = { buildUserContext }
