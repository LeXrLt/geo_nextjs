import Link from 'next/link'

export default function Home() {
  return (
    <main style={{padding: 24, fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif'}}>
      <h1>Next.js + PostgreSQL Template</h1>
      <p>前后端一体的模板：Next.js 前端页面 + API 路由 + PostgreSQL 连接。</p>
      <ul>
        <li><Link href="/api/db-test">测试数据库接口 /api/db-test</Link></li>
      </ul>
      <p>在 docker-compose 中会自动启动 PostgreSQL 和本应用。</p>
    </main>
  )
}
