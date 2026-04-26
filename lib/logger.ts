/**
 * Lightweight structured logger for server (Node.js) and client (browser).
 * - Server: writes to stdout/stderr with ISO timestamps
 * - Client: wraps console.* (filtered by LOG_LEVEL env in dev)
 *
 * Usage:
 *   import { createLogger } from '@/lib/logger'
 *   const log = createLogger('api:services')
 *   log.info('GET', { count: 5 })
 *   log.error('failed to read file', err)
 */

type Level = 'debug' | 'info' | 'warn' | 'error'

const LEVELS: Record<Level, number> = { debug: 0, info: 1, warn: 2, error: 3 }

function activeLevel(): number {
  if (typeof process !== 'undefined') {
    const env = process.env.LOG_LEVEL?.toLowerCase() as Level | undefined
    if (env && LEVELS[env] !== undefined) return LEVELS[env]
  }
  return LEVELS['info']
}

function fmt(level: Level, tag: string, msg: string, extra?: unknown): string {
  const ts = new Date().toISOString()
  const base = `${ts} [${level.toUpperCase()}] [${tag}] ${msg}`
  if (extra === undefined) return base
  if (extra instanceof Error) return `${base} — ${extra.message}`
  if (typeof extra === 'object') {
    try { return `${base} ${JSON.stringify(extra)}` } catch { /* ignore */ }
  }
  return `${base} ${String(extra)}`
}

export interface Logger {
  debug(msg: string, extra?: unknown): void
  info(msg: string, extra?: unknown): void
  warn(msg: string, extra?: unknown): void
  error(msg: string, extra?: unknown): void
}

export function createLogger(tag: string): Logger {
  const minLevel = activeLevel()

  function log(level: Level, msg: string, extra?: unknown) {
    if (LEVELS[level] < minLevel) return
    const line = fmt(level, tag, msg, extra)
    if (level === 'error') console.error(line)
    else if (level === 'warn') console.warn(line)
    else console.log(line)
  }

  return {
    debug: (msg, extra) => log('debug', msg, extra),
    info:  (msg, extra) => log('info',  msg, extra),
    warn:  (msg, extra) => log('warn',  msg, extra),
    error: (msg, extra) => log('error', msg, extra),
  }
}
