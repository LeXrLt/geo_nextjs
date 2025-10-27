import { pool } from '../../../lib/db'
import { hashPassword, signToken, setAuthCookie } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    res.status(405).json({ ok: false, error: 'Method Not Allowed' })
    return
  }

  const { email, password, name } = req.body || {}
  if (!email || !password) {
    res.status(400).json({ ok: false, error: 'email and password required' })
    return
  }

  try {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (exists.rowCount > 0) {
      res.status(409).json({ ok: false, error: 'email already registered' })
      return
    }

    const hashed = hashPassword(password)
    const insert = await pool.query(
      'INSERT INTO users (email, hashed_password, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at, updated_at',
      [email, hashed, name || null]
    )
    const user = insert.rows[0]

    const token = signToken({ sub: String(user.id), email: user.email })
    setAuthCookie(res, token)

    res.status(201).json({ ok: true, user })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
}
