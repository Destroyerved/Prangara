/**
 * Every call the mobile app makes, in one file.
 *
 * Screens call these, never `api.get` directly, so a path change is a one-line
 * edit and nothing in the UI knows what a URL looks like.
 */

import { api } from './client';
import type {
  Action,
  ActivityRecord,
  ActivityRecordIn,
  Assessment,
  ConversationExtractResponse,
  DocumentExtractResponse,
  EquipmentExtractResponse,
  Evidence,
  Factory,
  Health,
  Me,
  Notification,
  Sector,
  TokenResponse,
} from './types';

export const auth = {
  register: (body: {
    email: string;
    password: string;
    full_name?: string;
    organization_name?: string;
    organization_kind?: string;
    phone?: string;
  }) => api.post<TokenResponse>('/api/auth/register', body, false),

  login: (email: string, password: string, device?: string) =>
    api.post<TokenResponse>('/api/auth/login', { email, password, device }, false),

  logout: (refresh_token: string) =>
    api.post<{ ok: boolean }>('/api/auth/logout', { refresh_token }, false),

  me: () => api.get<Me>('/api/auth/me'),
};

export const system = {
  health: () => api.get<Health>('/api/health', undefined, false),
  sectors: () =>
    api.get<{ sectors: Sector[] }>('/api/sectors', undefined, false).then((r) => r.sectors),
};

export const factories = {
  list: () => api.get<Factory[]>('/api/factories'),
  get: (id: string) => api.get<Factory>(`/api/factories/${id}`),
  create: (body: {
    name: string;
    sector: string;
    state?: string;
    district?: string;
    latitude?: number;
    longitude?: number;
  }) => api.post<Factory>('/api/factories', body),

  activity: (id: string) => api.get<ActivityRecord[]>(`/api/factories/${id}/activity`),
  addActivity: (id: string, body: ActivityRecordIn) =>
    api.post<ActivityRecord>(`/api/factories/${id}/activity`, body),

  addAsset: (
    id: string,
    body: {
      asset_type: string;
      name: string;
      manufacturer?: string | null;
      model?: string | null;
      rated_power_kw?: number | null;
      efficiency_pct?: number | null;
      year_installed?: number | null;
      energy_type?: string | null;
      operating_hours_per_year?: number | null;
      load_factor?: number | null;
    },
  ) => api.post<{ id: string; estimate_basis?: string | null; confidence: string }>(
    `/api/factories/${id}/assets`,
    body,
  ),
};

export const intake = {
  extractConversation: (body: {
    message: string;
    factory_id?: string;
    sector?: string;
    known?: Record<string, unknown>;
  }) => api.post<ConversationExtractResponse>('/api/intake/conversation/extract', body),

  confirm: (
    factoryId: string,
    body: {
      profile_updates?: Record<string, unknown>;
      activity_records?: ActivityRecordIn[];
      evidence_id?: string | null;
      source_kind?: 'conversation' | 'document_ocr' | 'equipment_scan' | 'manual' | 'vlm';
    },
  ) =>
    api.post<{
      profile_id: string;
      created_activity_record_ids: string[];
      updated_profile_fields: string[];
    }>(`/api/intake/factories/${factoryId}/confirm`, body),

  scanDocument: (form: FormData) =>
    api.upload<DocumentExtractResponse>('/api/intake/document/extract', form),

  scanEquipment: (form: FormData) =>
    api.upload<EquipmentExtractResponse>('/api/intake/equipment/extract', form),
};

export const assessments = {
  run: (factoryId: string, label?: string) =>
    api.post<Assessment>(`/api/factories/${factoryId}/assessments`, { label }),
  list: (factoryId: string) =>
    api.get<Assessment[]>(`/api/factories/${factoryId}/assessments`),
  get: (assessmentId: string) => api.get<Assessment>(`/api/assessments/${assessmentId}`),
};

export const actions = {
  list: (factoryId: string) => api.get<Action[]>(`/api/factories/${factoryId}/actions`),
  update: (
    actionId: string,
    body: { status?: string; notes?: string; actual_capex_inr?: number },
  ) => api.patch<Action>(`/api/actions/${actionId}`, body),
};

export const evidence = {
  upload: (form: FormData) => api.upload<Evidence>('/api/evidence', form),
  list: (factoryId?: string) =>
    api.get<Evidence[]>('/api/evidence', factoryId ? { factory_id: factoryId } : undefined),
  link: (evidenceId: string, target_type: string, target_id: string, role?: string) =>
    api.post<Evidence>(`/api/evidence/${evidenceId}/links`, {
      target_type,
      target_id,
      role,
    }),
};

export const notifications = {
  list: (unreadOnly = false) =>
    api.get<Notification[]>('/api/notifications', { unread_only: unreadOnly }),
  markRead: (id: string) => api.post<Notification>(`/api/notifications/${id}/read`),
  markAllRead: () => api.post<{ marked: number }>('/api/notifications/read-all'),
};
