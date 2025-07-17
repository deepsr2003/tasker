import { Hono } from 'hono'
import { serveStatic } from 'hono/bun'
import authApi from './api/auth'
import tasksApi from './api/tasks'

const app = new Hono()

// Serve the frontend UI from the /public folder
app.use('/*', serveStatic({ root: './public' }))
app.use('/app', serveStatic({ root: './public' })) // Serve for /app route too

// API routes
app.route('/api/auth', authApi)
app.route('/api/tasks', tasksApi)

console.log("Server is running on http://localhost:3000")

export default app
