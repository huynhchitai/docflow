// PostgREST + Storage helpers — Worker nói chuyện với Supabase bằng service_role key.
export type DbEnv = {
  SUPABASE_URL?: string
  SUPABASE_SECRET_KEY?: string
}

function headers(env: DbEnv, extra: Record<string, string> = {}) {
  const key = env.SUPABASE_SECRET_KEY!
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

export async function insert<T>(env: DbEnv, table: string, rows: object | object[]): Promise<T[]> {
  const resp = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: headers(env, { Prefer: 'return=representation' }),
    body: JSON.stringify(rows),
  })
  if (!resp.ok) throw new Error(`DB insert ${table}: ${resp.status} ${await resp.text()}`)
  return resp.json()
}

export async function select<T>(env: DbEnv, table: string, query: string): Promise<T[]> {
  const resp = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: headers(env),
  })
  if (!resp.ok) throw new Error(`DB select ${table}: ${resp.status} ${await resp.text()}`)
  return resp.json()
}

export async function update<T>(env: DbEnv, table: string, filter: string, patch: object): Promise<T[]> {
  const resp = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}?${filter}`, {
    method: 'PATCH',
    headers: headers(env, { Prefer: 'return=representation' }),
    body: JSON.stringify(patch),
  })
  if (!resp.ok) throw new Error(`DB update ${table}: ${resp.status} ${await resp.text()}`)
  return resp.json()
}

export async function storageUpload(
  env: DbEnv,
  path: string,
  body: ArrayBuffer,
  contentType: string,
): Promise<void> {
  const resp = await fetch(`${env.SUPABASE_URL}/storage/v1/object/scans/${path}`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SECRET_KEY!,
      Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
      'Content-Type': contentType,
    },
    body,
  })
  if (!resp.ok) throw new Error(`Storage upload: ${resp.status} ${await resp.text()}`)
}

export async function storageDownload(env: DbEnv, path: string): Promise<Response> {
  return fetch(`${env.SUPABASE_URL}/storage/v1/object/scans/${path}`, {
    headers: {
      apikey: env.SUPABASE_SECRET_KEY!,
      Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`,
    },
  })
}
