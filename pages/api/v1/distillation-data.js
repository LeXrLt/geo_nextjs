import { pool } from '../../../lib/db'
import { getTokenFromReq, verifyToken } from '../../../lib/auth'

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

  try {
    const token = getTokenFromReq(req)
    const payload = verifyToken(token)
    if (!payload || !payload.sub) {
      res.status(401).json({ ok: false, error: 'unauthorized' })
      return
    }

    const { sub_task_id, prompt, inference_process, model_output } = req.body || {}
    const subTaskId = Number.parseInt(sub_task_id, 10)

    if (!Number.isInteger(subTaskId)) {
      res.status(400).json({ ok: false, error: 'sub_task_id must be an integer' })
      return
    }
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      res.status(400).json({ ok: false, error: 'prompt required' })
      return
    }
    if (inference_process != null && typeof inference_process !== 'string') {
      res.status(400).json({ ok: false, error: 'inference_process must be a string if provided' })
      return
    }
    if (!model_output || typeof model_output !== 'string' || !model_output.trim()) {
      res.status(400).json({ ok: false, error: 'model_output required' })
      return
    }

    const userId = payload.sub

    await pool.query('BEGIN')
    try {
      const subTaskRes = await pool.query(
        `SELECT st.id, st.task_id, t.user_id
         FROM sub_tasks st
         JOIN tasks t ON t.id = st.task_id
         WHERE st.id = $1
         FOR UPDATE`,
        [subTaskId]
      )
      if (subTaskRes.rowCount === 0) {
        await pool.query('ROLLBACK')
        res.status(404).json({ ok: false, error: 'sub_task not found' })
        return
      }
      const { task_id: taskId, user_id: ownerId } = subTaskRes.rows[0]
      if (String(ownerId) !== String(userId)) {
        await pool.query('ROLLBACK')
        res.status(403).json({ ok: false, error: 'forbidden' })
        return
      }

      const upsertRes = await pool.query(
        `INSERT INTO distillation_data (sub_task_id, prompt, inference_process, model_output)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (sub_task_id)
         DO UPDATE SET
           prompt = EXCLUDED.prompt,
           inference_process = EXCLUDED.inference_process,
           model_output = EXCLUDED.model_output,
           updated_at = NOW()
         RETURNING id`,
        [subTaskId, prompt, inference_process ?? null, model_output]
      )

      await pool.query(
        `UPDATE sub_tasks SET status = 'completed', updated_at = NOW() WHERE id = $1 AND status <> 'completed'`,
        [subTaskId]
      )

      const pendingRes = await pool.query(
        `SELECT COUNT(*)::int AS pending FROM sub_tasks WHERE task_id = $1 AND status <> 'completed'`,
        [taskId]
      )
      const taskCompleted = pendingRes.rows[0].pending === 0
      if (taskCompleted) {
        await pool.query(
          `UPDATE tasks SET status = 'completed', updated_at = NOW() WHERE id = $1 AND status <> 'completed'`,
          [taskId]
        )
      }

      await pool.query('COMMIT')

      res.status(201).json({ ok: true, id: upsertRes.rows[0].id, sub_task_id: subTaskId, task_id: taskId, task_completed: taskCompleted })
    } catch (dbErr) {
      await pool.query('ROLLBACK')
      throw dbErr
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
}
