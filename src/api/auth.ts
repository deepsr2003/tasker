// src/api/auth.ts

import { Hono } from 'hono'
import { sign } from 'hono/jwt'
import bcrypt from 'bcrypt'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const app = new Hono()

// --- Create an absolute path to the data directory ---
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// This navigates from /src/api up to the project root, then into /data
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data')

// Ensure the main data directory exists on server startup
fs.mkdir(DATA_DIR, { recursive: true })

const JWT_SECRET = process.env.JWT_SECRET || 'a-secure-secret-for-development'

// --- REGISTRATION ---
app.post('/register', async (c) => {
    const { username, password } = await c.req.json()

    if (!username || !password) {
        return c.json({ error: 'Username and password are required' }, 400)
    }

    const safeUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '')
    const userDir = path.join(DATA_DIR, safeUsername)

    try {
        await fs.mkdir(userDir)
    } catch (error) {
        if (error.code === 'EEXIST') {
            return c.json({ error: 'User already exists' }, 409)
        }
        console.error('Registration Error:', error)
        return c.json({ error: 'Server error during registration' }, 500)
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    
    const profile = { username: safeUsername, hashedPassword }
    await fs.writeFile(path.join(userDir, 'profile.json'), JSON.stringify(profile))

    const initialTasks = { tasks: [] }
    await fs.writeFile(path.join(userDir, 'tasks.json'), JSON.stringify(initialTasks))
    
    return c.json({ message: 'User registered successfully' }, 201)
})

// --- LOGIN ---
app.post('/login', async (c) => {
    const { username, password } = await c.req.json()
    const safeUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '')
    const profilePath = path.join(DATA_DIR, safeUsername, 'profile.json')

    try {
        const profileData = await fs.readFile(profilePath, 'utf-8')
        const profile = JSON.parse(profileData)

        const isPasswordValid = await bcrypt.compare(password, profile.hashedPassword)

        if (!isPasswordValid) {
            return c.json({ error: 'Invalid credentials' }, 401)
        }
        
        const payload = { username: safeUsername, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 } // Expires in 24 hours
        const token = await sign(payload, JWT_SECRET)
        
        return c.json({ token })

    } catch (error) {
        // This catch block handles both file not found and JSON parsing errors,
        // presenting them as a generic "Invalid credentials" for security.
        return c.json({ error: 'Invalid credentials' }, 401)
    }
})

export default app
