// src/api/tasks.ts

import { Hono } from 'hono'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { authMiddleware } from '../middleware/auth'

const app = new Hono()

// --- Create an absolute path to the data directory ---
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
// This navigates from /src/api up to the project root, then into /data
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data')

// Apply the auth middleware to all routes in this file
app.use('*', authMiddleware)

// Helper to get the user's task file path
const getUserTasksPath = (username: string) => {
    return path.join(DATA_DIR, username, 'tasks.json')
}

// GET all tasks for the logged-in user
app.get('/', async (c) => {
    const user = c.get('user')
    const tasksPath = getUserTasksPath(user.username)
    try {
        const data = await fs.readFile(tasksPath, 'utf-8')
        return c.json(JSON.parse(data))
    } catch (error) {
        console.error(`Error reading tasks for user ${user.username}:`, error)
        return c.json({ error: 'Could not retrieve tasks.' }, 500)
    }
})

// POST a new task
app.post('/', async (c) => {
    const user = c.get('user')
    const { title } = await c.req.json()
    
    const tasksPath = getUserTasksPath(user.username)
    try {
        const data = await fs.readFile(tasksPath, 'utf-8')
        const taskList = JSON.parse(data)
        
        const newTask = { id: `task_${Date.now()}`, title, completed: false }
        taskList.tasks.push(newTask)
        
        await fs.writeFile(tasksPath, JSON.stringify(taskList, null, 2))
        return c.json(newTask, 201)
    } catch (error) {
        console.error(`Error adding task for user ${user.username}:`, error)
        return c.json({ error: 'Could not add task.' }, 500)
    }
})

// PATCH a task (to toggle completion)
app.patch('/:id/toggle', async (c) => {
    const user = c.get('user')
    const taskId = c.req.param('id')
    
    const tasksPath = getUserTasksPath(user.username)
    try {
        const data = await fs.readFile(tasksPath, 'utf-8')
        const taskList = JSON.parse(data)

        const task = taskList.tasks.find(t => t.id === taskId)
        if (task) {
            task.completed = !task.completed
            await fs.writeFile(tasksPath, JSON.stringify(taskList, null, 2))
            return c.json(task)
        }
        return c.json({ error: 'Task not found' }, 404)
    } catch (error) {
        console.error(`Error toggling task for user ${user.username}:`, error)
        return c.json({ error: 'Could not update task.' }, 500)
    }
})

// DELETE a task
app.delete('/:id', async (c) => {
    const user = c.get('user')
    const taskId = c.req.param('id')

    const tasksPath = getUserTasksPath(user.username)
    try {
        const data = await fs.readFile(tasksPath, 'utf-8')
        const taskList = JSON.parse(data)

        const originalLength = taskList.tasks.length
        taskList.tasks = taskList.tasks.filter(t => t.id !== taskId)
        
        if (taskList.tasks.length === originalLength) {
            return c.json({ error: 'Task not found' }, 404)
        }
        
        await fs.writeFile(tasksPath, JSON.stringify(taskList, null, 2))
        return c.json({ message: 'Task deleted' })
    } catch (error) {
        console.error(`Error deleting task for user ${user.username}:`, error)
        return c.json({ error: 'Could not delete task.' }, 500)
    }
})

export default app
