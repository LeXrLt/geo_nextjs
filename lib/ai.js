import { appConfig } from '../config/app'

function buildURL(base, path) {
  const b = String(base || '').replace(/\/$/, '')
  const p = String(path || '').replace(/^\//, '')
  return `${b}/${p}`
}

export async function chatCompletion({ messages, model, baseURL, apiKey, temperature = 0.7, max_tokens }) {
  const url = buildURL(baseURL || appConfig.ai.baseURL, '/v1/chat/completions')
  const key = apiKey || appConfig.ai.apiKey
  const body = {
    model: model || appConfig.ai.model,
    messages,
    temperature,
  }
  if (typeof max_tokens === 'number') body.max_tokens = max_tokens

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || `HTTP ${res.status}`
    throw new Error(`AI request failed: ${msg}`)
  }

  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new Error('AI response missing content')
  return { content, raw: data }
}
