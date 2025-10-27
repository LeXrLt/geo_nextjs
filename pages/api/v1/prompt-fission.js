import { pool } from '../../../lib/db'
import { getTokenFromReq, verifyToken } from '../../../lib/auth'
import { appConfig } from '../../../config/app'
import { chatCompletion } from '../../../lib/ai'

function fillTemplate(tpl, vars) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => String(vars[k] ?? ''))
}

function parseJsonArray(text) {
  try {
    const arr = JSON.parse(text)
    if (Array.isArray(arr)) return arr
  } catch (_) {}
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start >= 0 && end > start) {
    const sub = text.slice(start, end + 1)
    const arr = JSON.parse(sub)
    if (Array.isArray(arr)) return arr
  }
  throw new Error('Invalid JSON array from AI')
}

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

    const { prompt } = req.body || {}
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      res.status(400).json({ ok: false, error: 'prompt required' })
      return
    }

    const userId = payload.sub

    // 1) create task (processing)
    const taskResult = await pool.query(
      `INSERT INTO tasks (user_id, original_prompt, status) VALUES ($1, $2, 'processing') RETURNING id`,
      [userId, prompt]
    )
    const taskId = taskResult.rows[0].id

    try {
      // 2) build template and call AI
      const count = appConfig.promptFission.count
      const tpl = appConfig.promptFission.template
      const filled = fillTemplate(tpl, { prompt, count })

      const { content } = await chatCompletion({
        messages: [
          { role: 'user', content: filled },
        ],
      })

      const arr = parseJsonArray(content).map((s) => String(s))

      // 3) insert sub_tasks and update task in a transaction
      await pool.query('BEGIN')
      try {
        const subIds = []
        for (const p of arr) {
          const r = await pool.query(
            `INSERT INTO sub_tasks (task_id, prompt_text, status) VALUES ($1, $2, 'processing') RETURNING id`,
            [taskId, p]
          )
          subIds.push(r.rows[0].id)
        }
        await pool.query('COMMIT')

        const prompts = arr.map((p, i) => ({ sub_task_id: subIds[i], prompt: p }))
        res.status(200).json({ ok: true, task_id: taskId, count: arr.length, prompts })
      } catch (dbErr) {
        await pool.query('ROLLBACK')
        throw dbErr
      }
    } catch (aiErr) {
      // mark task failed
      await pool.query(
        `UPDATE tasks SET status = 'failed', updated_at = NOW() WHERE id = $1`,
        [taskId]
      )
      throw aiErr
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
}
