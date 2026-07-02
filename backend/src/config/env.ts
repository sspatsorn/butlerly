import { z } from 'zod'

const envSchema = z.object({
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().default(3001),
  PUBLIC_HOST: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LINE_CHANNEL_SECRET: z.string().min(1),
  LINE_CHANNEL_ACCESS_TOKEN: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  FRONTEND_URL: z.preprocess(
    (val) => (typeof val === 'string' && val.trim() === '' ? undefined : val),
    z.string().url().default('http://localhost:3000'),
  ),
})

export type Env = z.infer<typeof envSchema>

let cached: Env | null = null

export function getEnv(): Env {
  if (cached) return cached
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const missing = result.error.issues.map((i) => i.path.join('.')).join(', ')
    throw new Error(`Missing or invalid environment variables: ${missing}`)
  }
  const data = result.data
  cached = {
    ...data,
    PUBLIC_HOST: data.PUBLIC_HOST ?? process.env.RENDER_EXTERNAL_URL?.replace(/^https?:\/\//, '') ?? 'localhost',
  }
  return cached
}

export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return getEnv()[prop as keyof Env]
  },
})
