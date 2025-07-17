import { createMiddleware } from 'hono/factory'
import { verify } from 'hono/jwt'

const JWT_SECRET = process.env.JWT_SECRET || 'a-secure-secret-for-development'

export const authMiddleware = createMiddleware(async (c, next) => {
    const authHeader = c.req.header('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401)
    }

    const token = authHeader.split(' ')[1]
    
    try {
        const decodedPayload = await verify(token, JWT_SECRET)
        c.set('user', decodedPayload) // Add user payload to the context
        await next()
    } catch (error) {
        return c.json({ error: 'Invalid token' }, 401)
    }
})
