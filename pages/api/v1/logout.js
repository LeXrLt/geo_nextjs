import { clearAuthCookie } from '../../../lib/auth'

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
    clearAuthCookie(res)
    res.status(200).json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
}
