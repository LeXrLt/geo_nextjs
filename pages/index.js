import Link from 'next/link'

export default function Home() {
  return (
    <main style={{padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'}}>
      <h1>用户系统示例</h1>
      <p>包含登录、注册与个人主页的基础流程。</p>
      <ul>
        <li><Link href="/login">登录</Link></li>
        <li><Link href="/register">注册</Link></li>
        <li><Link href="/profile">个人主页</Link></li>
      </ul>
    </main>
  )
}
