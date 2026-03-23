const express = require('express')
const router = express.Router()
const anthropic = require('../lib/anthropic')
const supabase = require('../lib/supabase')
const { buildUserContext } = require('../lib/contextBuilder')
const { parseAndSaveLogs } = require('../lib/logParser')
const { requireAuth } = require('../middleware/auth')

// POST /api/chat
// Sends a message to Claude with full user context, saves to history,
// parses any log blocks, returns the clean response
router.post('/', requireAuth, async (req, res) => {
  const { message } = req.body
  const userId = req.userId

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message is required' })
  }

  try {
    // 1. Build system prompt with user context
    const systemPrompt = await buildUserContext(userId)

    // 2. Fetch recent chat history (last 20 messages for context window)
    const { data: history } = await supabase
      .from('chat_history')
      .select('role, content')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    const messages = [
      ...(history || []).reverse(),
      { role: 'user', content: message },
    ]

    // 3. Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    const rawResponse = response.content[0].text

    // 4. Parse response for any log blocks and save them
    const { cleanResponse, loggedType, loggedId } = await parseAndSaveLogs(userId, rawResponse)

    // 5. Save both sides of the conversation to chat_history
    await supabase.from('chat_history').insert([
      {
        user_id: userId,
        role: 'user',
        content: message,
      },
      {
        user_id: userId,
        role: 'assistant',
        content: cleanResponse,
        triggered_log: loggedType,
        triggered_id: loggedId,
      },
    ])

    // 6. Return response to app
    return res.json({
      message: cleanResponse,
      logged: loggedType
        ? { type: loggedType, id: loggedId }
        : null,
    })
  } catch (err) {
    console.error('Chat error:', err.message)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
})

// GET /api/chat/history
// Returns paginated chat history for the app to display
router.get('/history', requireAuth, async (req, res) => {
  const userId = req.userId
  const limit = parseInt(req.query.limit) || 50
  const offset = parseInt(req.query.offset) || 0

  const { data, error } = await supabase
    .from('chat_history')
    .select('id, role, content, triggered_log, triggered_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ messages: (data || []).reverse() })
})

// DELETE /api/chat/history
// Clears all chat history for the user
router.delete('/history', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('chat_history')
    .delete()
    .eq('user_id', req.userId)

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ success: true })
})

module.exports = router
