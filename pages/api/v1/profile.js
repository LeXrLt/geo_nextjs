import { pool } from '../../../lib/db'
import { getTokenFromReq, verifyToken } from '../../../lib/auth'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ ok: false, error: 'Method Not Allowed' })
    return
  }

  try {
    const token = getTokenFromReq(req)
    const payload = verifyToken(token)
    if (!payload || !payload.sub) {
      res.status(401).json({ ok: false, error: 'unauthorized' })
      return
    }

    const result = await pool.query(
      'SELECT id, email, name, created_at, updated_at FROM users WHERE id = $1',
      [payload.sub]
    )
    if (result.rowCount === 0) {
      res.status(404).json({ ok: false, error: 'user not found' })
      return
    }

    res.status(200).json({ ok: true, user: result.rows[0] })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
}
