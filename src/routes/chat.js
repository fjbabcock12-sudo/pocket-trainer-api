const express = require('express')
const router = express.Router()
const anthropic = require('../lib/anthropic')
const supabase = require('../lib/supabase')
const { buildUserContext } = require('../lib/contextBuilder')
const { parseAndSaveLogs } = require('../lib/logParser')
const { requireAuth } = require('../middleware/auth')

// ── Conversations ──────────────────────────────────────────

// GET /api/chat/conversations
router.get('/conversations', requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from('conversations')
    .select('id, title, created_at, updated_at')
    .eq('user_id', req.userId)
    .order('updated_at', { ascending: false })
    .limit(30)

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ conversations: data || [] })
})

// POST /api/chat/conversations
router.post('/conversations', requireAuth, async (req, res) => {
  const { title } = req.body
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: req.userId, title: title || 'New chat' })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  return res.status(201).json({ conversation: data })
})

// GET /api/chat/conversations/:id
router.get('/conversations/:id', requireAuth, async (req, res) => {
  const { data: conversation, error: convErr } = await supabase
    .from('conversations')
    .select('id, title, created_at')
    .eq('id', req.params.id)
    .eq('user_id', req.userId)
    .single()

  if (convErr) return res.status(404).json({ error: 'Conversation not found' })

  const { data: messages, error: msgErr } = await supabase
    .from('chat_history')
    .select('id, role, content, triggered_log, triggered_id, created_at')
    .eq('conversation_id', req.params.id)
    .order('created_at', { ascending: true })

  if (msgErr) return res.status(500).json({ error: msgErr.message })
  return res.json({ conversation, messages: messages || [] })
})

// DELETE /api/chat/conversations/:id
router.delete('/conversations/:id', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.userId)

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ success: true })
})

// ── Messaging ─────────────────────────────────────────────

// POST /api/chat
// Body: { message, conversationId? }
// If conversationId is omitted, creates a new conversation automatically.
router.post('/', requireAuth, async (req, res) => {
  const { message, conversationId } = req.body
  const userId = req.userId

  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Message is required' })
  }

  try {
    // 1. Resolve or create conversation
    let convId = conversationId
    let isFirstMessage = false

    if (!convId) {
      // Auto-create a new conversation titled from the first message
      const title = message.trim().slice(0, 60) + (message.trim().length > 60 ? '…' : '')
      const { data: newConv, error: createErr } = await supabase
        .from('conversations')
        .insert({ user_id: userId, title })
        .select()
        .single()

      if (createErr) throw createErr
      convId = newConv.id
      isFirstMessage = true
    } else {
      // Check if this is the first message in the conversation (for title update)
      const { count } = await supabase
        .from('chat_history')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', convId)
      isFirstMessage = count === 0
    }

    // Update title from first user message if needed
    if (isFirstMessage && conversationId) {
      const title = message.trim().slice(0, 60) + (message.trim().length > 60 ? '…' : '')
      await supabase
        .from('conversations')
        .update({ title })
        .eq('id', convId)
        .eq('user_id', userId)
    }

    // 2. Build system prompt
    const systemPrompt = await buildUserContext(userId)

    // 3. Fetch recent messages from this conversation for context
    const { data: history } = await supabase
      .from('chat_history')
      .select('role, content')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: false })
      .limit(20)

    const messages = [
      ...(history || []).reverse(),
      { role: 'user', content: message },
    ]

    // 4. Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })

    const rawResponse = response.content[0].text

    // 5. Parse response for log blocks
    const { cleanResponse, loggedType, loggedId } = await parseAndSaveLogs(userId, rawResponse)

    // 6. Save both sides of the conversation
    await supabase.from('chat_history').insert([
      { user_id: userId, conversation_id: convId, role: 'user', content: message },
      {
        user_id: userId,
        conversation_id: convId,
        role: 'assistant',
        content: cleanResponse,
        triggered_log: loggedType,
        triggered_id: loggedId,
      },
    ])

    // 7. Bump conversation updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', convId)

    return res.json({
      message: cleanResponse,
      conversationId: convId,
      logged: loggedType ? { type: loggedType, id: loggedId } : null,
    })
  } catch (err) {
    console.error('Chat error:', err.message)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
})

// ── Legacy endpoints (kept for compat) ────────────────────

router.get('/history', requireAuth, async (req, res) => {
  const limit = parseInt(req.query.limit) || 50
  const offset = parseInt(req.query.offset) || 0

  const { data, error } = await supabase
    .from('chat_history')
    .select('id, role, content, triggered_log, triggered_id, created_at')
    .eq('user_id', req.userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ messages: (data || []).reverse() })
})

router.delete('/history', requireAuth, async (req, res) => {
  const { error } = await supabase
    .from('chat_history')
    .delete()
    .eq('user_id', req.userId)

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ success: true })
})

module.exports = router
