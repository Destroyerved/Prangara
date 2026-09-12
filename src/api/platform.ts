import type { MeResponse, TokenResponse } from './contracts';

const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const sessionKey = 'prangara-session-v2';
type Session = { tokens: TokenResponse; organization?: string };
let session: Session | null = readSession();
let generation = 0;
let refresh: Promise<void> | undefined;
const listeners = new Set<() => void>();
function readSession(): Session | null {
  try { const raw = JSON.parse(sessionStorage.getItem(sessionKey) || 'null'); return raw?.tokens?.access_token && raw?.tokens?.refresh_token ? raw : null; } catch { return null; }
}
export function subscribeSession(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export const sessionSnapshot = () => session;
export function setSession(next: Session | null) {
  generation++; session = next;
  try { if (next) sessionStorage.setItem(sessionKey, JSON.stringify(next)); else sessionStorage.removeItem(sessionKey); } catch { /* Memory session still works. */ }
  listeners.forEach(fn => fn());
}
export class ServiceError extends Error {
  constructor(message: string, public status?: number) { super(message); this.name = 'ServiceError'; }
}
async function errorFor(response: Response) {
  const payload = await response.json().catch(() => ({}));
  const detail = payload.detail ?? payload.error ?? payload;
  const validation = Array.isArray(detail) ? detail.map((x: {loc?: string[]; msg?: string}) => `${x.loc?.slice(1).join(' ')}: ${x.msg}`).join('; ') : undefined;
  return new ServiceError(validation || detail.message || (response.status === 401 ? 'Your session expired. Sign in again.' : response.status === 403 ? 'Your account does not have permission for this action.' : response.status === 404 ? 'This record is unavailable or you do not have access.' : response.status === 429 ? `Too many requests. Retry after ${response.headers.get('Retry-After') || 'a few'} seconds.` : 'The service could not complete this request.'), response.status);
}
async function renew() {
  if (!session) throw new ServiceError('Sign in to continue.', 401);
  const version = generation, organization = session.organization;
  const response = await fetch(base + '/auth/refresh', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({refresh_token:session.tokens.refresh_token}), signal:AbortSignal.timeout(15000)});
  if (!response.ok) { if (generation === version) setSession(null); throw await errorFor(response); }
  const tokens = await response.json() as TokenResponse;
  if (generation !== version) throw new ServiceError('The active session changed. Please retry.');
  setSession({tokens, organization});
}
export async function service<T>(path: string, options: RequestInit = {}, retried = false): Promise<T> {
  const version = generation;
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) headers.set('Content-Type','application/json');
  if (session) { headers.set('Authorization', 'Bearer '+session.tokens.access_token); if (session.organization) headers.set('X-Organization-Id', session.organization); }
  let response: Response;
  try { response = await fetch(base+path, {...options, headers, signal: options.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000)}); }
  catch (error) { if (options.signal?.aborted) throw error; throw new ServiceError('The service is unavailable. Check your connection and retry.'); }
  if (response.status === 401 && session && !retried && !path.startsWith('/auth/')) {
    if (!refresh) refresh = renew().finally(() => { refresh = undefined; });
    await refresh;
    return service<T>(path, options, true);
  }
  if (response.status === 401 && retried) setSession(null);
  if (!response.ok) throw await errorFor(response);
  if (version !== generation && !path.startsWith('/auth/')) throw new ServiceError('The active session changed. Please retry.');
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
export const send = <T>(path: string, body: unknown = {}, method = 'POST') => service<T>(path, {method, body:JSON.stringify(body)});
export async function signIn(body: unknown, register = false) {
  const tokens = await send<TokenResponse>('/auth/'+(register ? 'register':'login'), body);
  setSession({tokens});
  return service<MeResponse>('/auth/me');
}
export async function signOut() {
  const tokens = session?.tokens; setSession(null);
  if (tokens) await send('/auth/logout', {refresh_token: tokens.refresh_token});
}
export async function switchOrganization(id: string) {
  const me = await send<MeResponse>('/auth/switch-organization/'+encodeURIComponent(id));
  if (session) setSession({...session, organization: me.active_organization_id || undefined});
}
export async function downloadEvidence(id: string, filename: string) {
  // Fetch the private file with authorization; never put tokens in a link.
  if (!session) throw new ServiceError('Sign in to download evidence.',401);
  const response = await fetch(base+'/evidence/'+encodeURIComponent(id)+'/download', {headers:{Authorization:'Bearer '+session.tokens.access_token, ...(session.organization ? {'X-Organization-Id':session.organization} : {})}, signal:AbortSignal.timeout(20000)});
  if (!response.ok) throw await errorFor(response);
  const url = URL.createObjectURL(await response.blob()), a = document.createElement('a');
  a.href=url; a.download=filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
