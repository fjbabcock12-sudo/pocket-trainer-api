require('dotenv').config()
const express = require('express')
const cors = require('cors')

const chatRoutes     = require('./routes/chat')
const profileRoutes  = require('./routes/profile')
const goalsRoutes    = require('./routes/goals')
const trainingRoutes = require('./routes/training')
const nutritionRoutes = require('./routes/nutrition')

const app = express()

app.use(cors())
app.use(express.json({ limit: '10mb' })) // 10mb for photo uploads

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }))

// Routes
app.use('/api/chat',      chatRoutes)
app.use('/api/profile',   profileRoutes)
app.use('/api/goals',     goalsRoutes)
app.use('/api/training',  trainingRoutes)
app.use('/api/nutrition', nutritionRoutes)

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }))

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Pocket Trainer API running on port ${PORT}`)
})
