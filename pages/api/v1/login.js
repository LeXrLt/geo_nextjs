import { pool } from '../../../lib/db'
import { verifyPassword, signToken, setAuthCookie } from '../../../lib/auth'

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

  const { email, password } = req.body || {}
  if (!email || !password) {
    res.status(400).json({ ok: false, error: 'email and password required' })
    return
  }

  try {
    const result = await pool.query(
      'SELECT id, email, hashed_password, name, created_at, updated_at FROM users WHERE email = $1',
      [email]
    )
    if (result.rowCount === 0) {
      res.status(401).json({ ok: false, error: 'invalid credentials' })
      return
    }

    const user = result.rows[0]
    const valid = verifyPassword(password, user.hashed_password)
    if (!valid) {
      res.status(401).json({ ok: false, error: 'invalid credentials' })
      return
    }

    const token = signToken({ sub: String(user.id), email: user.email })
    setAuthCookie(res, token)

    const { hashed_password, ...safeUser } = user
    res.status(200).json({ ok: true, user: safeUser, token })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
}
