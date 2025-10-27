import crypto from 'crypto'

const DEFAULT_EXP_SECONDS = 60 * 60 * 24 * 7
const AUTH_SECRET = process.env.AUTH_SECRET || 'dev-secret-please-change'

function b64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

function b64urlJson(obj) {
  return b64url(JSON.stringify(obj))
}

export function signToken(payload, { expiresIn = DEFAULT_EXP_SECONDS } = {}) {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const body = { ...payload, iat: now, exp: now + expiresIn }
  const headerPart = b64urlJson(header)
  const payloadPart = b64urlJson(body)
  const data = `${headerPart}.${payloadPart}`
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  return `${data}.${signature}`
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string' || token.split('.').length !== 3) return null
  const [headerPart, payloadPart, sig] = token.split('.')
  const data = `${headerPart}.${payloadPart}`
  const expected = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  const payloadJson = Buffer.from(payloadPart.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
  const payload = JSON.parse(payloadJson)
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp && now > payload.exp) return null
  return payload
}

export function hashPassword(password) {
  const iterations = 100000
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex')
  return `${iterations}:${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  const [iterStr, salt, hash] = String(stored).split(':')
  const iterations = parseInt(iterStr, 10) || 100000
  const derived = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex')
  const a = Buffer.from(hash, 'hex')
  const b = Buffer.from(derived, 'hex')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export function setAuthCookie(res, token, { maxAge = DEFAULT_EXP_SECONDS } = {}) {
  const parts = [
    `auth_token=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ]
  if (process.env.NODE_ENV === 'production') parts.push('Secure')
  const cookie = parts.join('; ')
  const prev = res.getHeader('Set-Cookie')
  if (!prev) {
    res.setHeader('Set-Cookie', cookie)
  } else if (Array.isArray(prev)) {
    res.setHeader('Set-Cookie', [...prev, cookie])
  } else {
    res.setHeader('Set-Cookie', [prev, cookie])
  }
}

export function clearAuthCookie(res) {
  const parts = [
    'auth_token=deleted',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ]
  if (process.env.NODE_ENV === 'production') parts.push('Secure')
  const cookie = parts.join('; ')
  res.setHeader('Set-Cookie', cookie)
}

export function getTokenFromReq(req) {
  const raw = req.headers.cookie
  if (!raw) return null
  const map = Object.fromEntries(
    raw.split(';').map((p) => {
      const [k, ...v] = p.trim().split('=')
      return [k, v.join('=')]
    })
  )
  return map['auth_token'] || null
}
