const BASE = `${import.meta.env.BASE_URL}api/v1`.replace(/\/{2,}/g, '/');

let csrfToken = null;

export class ApiError extends Error {
  constructor(status, payload) {
    super(payload?.error?.message || 'Cererea a eșuat.');
    this.status = status;
    this.code = payload?.error?.code;
    this.details = payload?.error?.details || [];
  }
}

async function ensureCsrf(force = false) {
  if (!csrfToken || force) {
    const res = await fetch(`${BASE}/csrf`, { credentials: 'include' });
    if (!res.ok) throw new ApiError(res.status, await res.json().catch(() => ({})));
    csrfToken = (await res.json()).csrfToken;
  }
  return csrfToken;
}

export async function api(path, { method = 'GET', body, formData, retry = true } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && method !== 'HEAD') headers['X-CSRF-Token'] = await ensureCsrf();

  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers,
    body: formData ? formData : body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 403 && retry && method !== 'GET') {
    await ensureCsrf(true);
    return api(path, { method, body, formData, retry: false });
  }

  const payload = res.status === 204 ? {} : await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, payload);
  return payload;
}

export const assetUrl = (path) => (path ? `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}` : null);
export const resetCsrf = () => { csrfToken = null; };
