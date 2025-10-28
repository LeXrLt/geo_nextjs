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

    const userId = payload.sub

    const { rows } = await pool.query(
      `SELECT st.id AS sub_task_id, st.prompt_text AS prompt
       FROM sub_tasks st
       JOIN tasks t ON t.id = st.task_id
       WHERE t.user_id = $1
         AND t.status NOT IN ('completed', 'failed')
         AND st.status NOT IN ('completed', 'failed')
         AND (t.expires_at IS NULL OR t.expires_at > NOW())
       ORDER BY st.id ASC`,
      [userId]
    )

    res.status(200).json(rows)
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
}
