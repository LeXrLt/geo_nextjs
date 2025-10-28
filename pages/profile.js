import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  async function onLogout() {
    try {
      await fetch('/api/v1/logout', { method: 'POST', credentials: 'include' })
    } catch (_) {}
    router.replace('/login')
  }

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const res = await fetch('/api/v1/profile', { credentials: 'include' })
        if (res.status === 401) {
          router.replace('/login')
          return
        }
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data.ok) {
          if (mounted) setError(data.error || '加载失败')
        } else {
          if (mounted) setUser(data.user)
        }
      } catch (err) {
        if (mounted) setError(String(err))
      } finally {
        if (mounted) setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [router])

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif', maxWidth: 640, margin: '0 auto' }}>
      <h1>个人主页</h1>
      {loading ? (
        <p>加载中…</p>
      ) : error ? (
        <p style={{ color: 'crimson' }}>{error}</p>
      ) : user ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <div>用户ID：{user.id}</div>
          <div>邮箱：{user.email}</div>
          {user.name ? <div>姓名：{user.name}</div> : null}
          {user.created_at ? <div>创建时间：{new Date(user.created_at).toLocaleString()}</div> : null}
          {user.updated_at ? <div>更新时间：{new Date(user.updated_at).toLocaleString()}</div> : null}
        </div>
      ) : null}
      {user ? (
        <p style={{ marginTop: 16 }}>
          <button onClick={onLogout}>退出登录</button>
        </p>
      ) : (
        <p style={{ marginTop: 16 }}>
          <Link href="/login">登录</Link> · <Link href="/register">注册</Link>
        </p>
      )}
    </main>
  )
}
