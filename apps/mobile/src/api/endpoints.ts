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
  AskResponse,
  AuditEntry,
  ComplianceCase,
  ComplianceReadiness,
  MaterialListing,
  PoolingMatch,
  Provider,
  ProviderMatch,
  QuoteComparison,
  Quote,
  RFQ,
  ReferencePayload,
  RoutePlan,
  Scenario,
  ScenarioComparison,
  ScenarioModification,
  Shipment,
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

export const scenarios = {
  list: (factoryId: string) => api.get<Scenario[]>(`/api/factories/${factoryId}/scenarios`),
  create: (
    factoryId: string,
    body: {
      name: string;
      description?: string;
      baseline_assessment_id?: string | null;
      modifications: ScenarioModification[];
    },
  ) => api.post<Scenario>(`/api/factories/${factoryId}/scenarios`, body),
  run: (scenarioId: string) =>
    api.post<ScenarioComparison>(`/api/scenarios/${scenarioId}/run`),
};

export const compliance = {
  readiness: (factoryId: string) =>
    api.get<ComplianceReadiness>(`/api/factories/${factoryId}/compliance`),
  evaluate: (factoryId: string, assessmentId?: string | null) =>
    api.post<{ created: number; updated: number; rule_packs: string[] }>(
      '/api/compliance/evaluate',
      { factory_id: factoryId, assessment_id: assessmentId ?? null },
    ),
  cases: (factoryId?: string) =>
    api.get<ComplianceCase[]>(
      '/api/compliance/cases',
      factoryId ? { factory_id: factoryId } : undefined,
    ),
  case: (caseId: string) => api.get<ComplianceCase>(`/api/compliance/cases/${caseId}`),
  addCorrectiveAction: (caseId: string, body: { title: string; description?: string }) =>
    api.post<ComplianceCase>(`/api/compliance/cases/${caseId}/corrective-actions`, body),
  close: (caseId: string, reason: string, evidence_ids: string[] = []) =>
    api.post<ComplianceCase>(`/api/compliance/cases/${caseId}/close`, { reason, evidence_ids }),
};

export const marketplace = {
  providers: (params?: Record<string, string | number | boolean>) =>
    api.get<Provider[]>('/api/providers', params),
  match: (factoryId: string, interventionId: string) =>
    api.get<ProviderMatch[]>('/api/providers/match', {
      factory_id: factoryId,
      intervention_id: interventionId,
    }),
  rfqs: (factoryId?: string) =>
    api.get<RFQ[]>('/api/rfqs', factoryId ? { factory_id: factoryId } : undefined),
  createRfq: (body: {
    factory_id: string;
    intervention_id: string;
    title: string;
    scope_of_work?: string;
    action_id?: string | null;
    provider_ids?: string[];
  }) => api.post<RFQ>('/api/rfqs', body),
  compare: (rfqId: string) => api.get<QuoteComparison>(`/api/rfqs/${rfqId}/compare`),
  acceptQuote: (quoteId: string) => api.post<Quote>(`/api/quotes/${quoteId}/accept`),
  materials: (params?: Record<string, string | number | boolean>) =>
    api.get<MaterialListing[]>('/api/materials', params),
};

export const logistics = {
  plan: (body: {
    origin_gps: number[];
    destination_gps: number[];
    payload_tonnes: number;
    cargo_type?: string;
  }) => api.post<RoutePlan>('/api/logistics/routes', body),
  shipments: (factoryId?: string) =>
    api.get<Shipment[]>('/api/shipments', factoryId ? { factory_id: factoryId } : undefined),
  createShipment: (body: {
    factory_id?: string | null;
    origin_name: string;
    origin_lat: number;
    origin_lon: number;
    destination_name: string;
    dest_lat: number;
    dest_lon: number;
    payload_tonnes: number;
    cargo_type?: string;
    selected_route_preset?: string | null;
  }) => api.post<Shipment>('/api/shipments', body),
  pool: (shipment_ids?: string[]) =>
    api.post<PoolingMatch>('/api/logistics/pool', shipment_ids ? { shipment_ids } : {}),
};

export const assistant = {
  ask: (question: string, factoryId?: string | null, topic?: string) =>
    api.post<AskResponse>('/api/assistant/ask', {
      question,
      factory_id: factoryId ?? null,
      topic: topic ?? null,
    }),
  sources: () => api.get<Record<string, unknown>[]>('/api/sources'),
};

export const governance = {
  audit: (factoryId: string) => api.get<AuditEntry[]>(`/api/factories/${factoryId}/audit`),
};

export const reference = {
  all: () => api.get<ReferencePayload>('/api/reference', undefined, false),
  interventions: () =>
    api.get<{ interventions: Record<string, unknown>[]; meta?: Record<string, unknown> }>(
      '/api/reference/interventions',
      undefined,
      false,
    ),
  provenance: () => api.get<Record<string, unknown>>('/api/reference/provenance', undefined, false),
};
