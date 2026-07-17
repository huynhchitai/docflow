// Gọi Gemini qua Vertex AI (service account) hoặc AI Studio (API key) — tự chọn theo env.

type ServiceAccount = {
  client_email: string
  private_key: string
  project_id: string
}

export type GeminiEnv = {
  GEMINI_PROXY_URL?: string // Cloud Run proxy → Vertex AI qua ADC (ưu tiên nhất)
  GEMINI_PROXY_KEY?: string
  GCP_SERVICE_ACCOUNT_KEY?: string // full JSON của service account (role: Vertex AI User)
  GCP_LOCATION?: string // mặc định "global"
  GEMINI_API_KEY?: string // fallback AI Studio
}

let cachedToken: { token: string; exp: number } | null = null

function b64url(data: string | ArrayBuffer): string {
  const bytes =
    typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function pemToBuf(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s/g, '')
  const bin = atob(b64)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
}

async function vertexAccessToken(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && now < cachedToken.exp - 120) return cachedToken.token

  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  )
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToBuf(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  )
  const jwt = `${header}.${claims}.${b64url(sig)}`

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}`,
  })
  if (!resp.ok) throw new Error(`OAuth token exchange failed: ${resp.status} ${await resp.text()}`)
  const data = (await resp.json()) as { access_token: string; expires_in: number }
  cachedToken = { token: data.access_token, exp: now + data.expires_in }
  return data.access_token
}

export type GenerateArgs = {
  model: string // vd "gemini-2.5-flash"
  mimeType: string
  dataB64: string
  prompt: string
}

/** Trả về text JSON từ Gemini. Ném lỗi kèm chi tiết nếu API fail. */
export async function generateContent(env: GeminiEnv, args: GenerateArgs): Promise<string> {
  // Đường 1: Cloud Run proxy (Vertex AI, ADC — không SA key, IP Google nên không bị chặn location)
  if (env.GEMINI_PROXY_URL && env.GEMINI_PROXY_KEY) {
    const resp = await fetch(`${env.GEMINI_PROXY_URL}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-proxy-key': env.GEMINI_PROXY_KEY },
      body: JSON.stringify({
        model: args.model,
        mimeType: args.mimeType,
        dataB64: args.dataB64,
        prompt: args.prompt,
      }),
    })
    if (!resp.ok) throw new Error(`Proxy ${resp.status}: ${(await resp.text()).slice(0, 500)}`)
    const data = (await resp.json()) as { text: string }
    return data.text
  }
  return generateDirect(env, args)
}

async function generateDirect(env: GeminiEnv, args: GenerateArgs): Promise<string> {
  const body = JSON.stringify({
    contents: [
      {
        role: 'user',
        parts: [
          { inline_data: { mime_type: args.mimeType, data: args.dataB64 } },
          { text: args.prompt },
        ],
      },
    ],
    generationConfig: { response_mime_type: 'application/json', temperature: 0.1 },
  })

  let url: string
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (env.GCP_SERVICE_ACCOUNT_KEY) {
    const sa = JSON.parse(env.GCP_SERVICE_ACCOUNT_KEY) as ServiceAccount
    const loc = env.GCP_LOCATION || 'global'
    const host = loc === 'global' ? 'aiplatform.googleapis.com' : `${loc}-aiplatform.googleapis.com`
    url = `https://${host}/v1/projects/${sa.project_id}/locations/${loc}/publishers/google/models/${args.model}:generateContent`
    headers.Authorization = `Bearer ${await vertexAccessToken(sa)}`
  } else if (env.GEMINI_API_KEY) {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${args.model}:generateContent`
    headers['x-goog-api-key'] = env.GEMINI_API_KEY
  } else {
    throw new Error('NO_CREDENTIALS')
  }

  const resp = await fetch(url, { method: 'POST', headers, body })
  if (!resp.ok) {
    throw new Error(`Gemini ${resp.status}: ${(await resp.text()).slice(0, 500)}`)
  }
  const data = (await resp.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
}
