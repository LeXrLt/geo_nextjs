'use strict'

const fs = require('fs')
const path = require('path')
const { Pool } = require('pg')

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres'
const migrationsDir = path.join(__dirname, '..', 'migrations')

async function ensureMigrationsTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

async function getApplied(pool) {
  const { rows } = await pool.query('SELECT name FROM _migrations ORDER BY name')
  return new Set(rows.map((r) => r.name))
}

async function applyMigration(pool, name, sql) {
  await pool.query('BEGIN')
  try {
    await pool.query(sql)
    await pool.query('INSERT INTO _migrations(name) VALUES ($1)', [name])
    await pool.query('COMMIT')
  } catch (err) {
    await pool.query('ROLLBACK')
    throw err
  }
}

async function main() {
  if (!fs.existsSync(migrationsDir)) {
    console.log('No migrations directory found, nothing to do.')
    return
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  const pool = new Pool({ connectionString, max: 5 })
  try {
    await ensureMigrationsTable(pool)
    const applied = await getApplied(pool)

    for (const f of files) {
      if (applied.has(f)) {
        console.log(`Skipping already applied migration: ${f}`)
        continue
      }
      const sql = fs.readFileSync(path.join(migrationsDir, f), 'utf8')
      process.stdout.write(`Applying migration: ${f} ... `)
      await applyMigration(pool, f, sql)
      console.log('done')
    }

    console.log('Migrations complete.')
  } finally {
    await pool.end()
  }
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
