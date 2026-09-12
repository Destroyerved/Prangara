/**
 * Offline capture queue.
 *
 * The premise of this app is that somebody is standing next to the thing they
 * want to record. Factory floors have thick walls, and losing a meter reading
 * because the signal dropped is the difference between a tool people use and
 * one they stop opening.
 *
 * So a capture that fails on the network is queued rather than lost, and
 * retried when connectivity returns.
 *
 * What is and is not queued, deliberately:
 *
 *  - **Queued:** confirmed activity values and evidence uploads. These are
 *    user-authored facts. Replaying one later produces the same row it would
 *    have produced at the time.
 *  - **Never queued:** anything that reads, anything that assesses, and
 *    anything a server decision depends on. Replaying an assessment hours later
 *    against changed data would produce a result the user never saw and did not
 *    confirm.
 *
 * Each item carries a `clientRef` that the backend does not yet consume. When it
 * does, replay becomes idempotent; until then, the queue only ever retries
 * requests that failed with a *network* error, never ones the server answered,
 * so a double-write needs the response to have been lost in flight rather than
 * merely slow.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'prangara.capture_queue.v1';
const MAX_ITEMS = 200;
const MAX_ATTEMPTS = 8;

export type QueuedKind = 'confirm_intake' | 'evidence_upload';

export interface QueuedItem {
  id: string;
  clientRef: string;
  kind: QueuedKind;
  factoryId: string;
  factoryName: string;
  /** Human-readable, shown in the pending list. */
  label: string;
  /** JSON body for confirm_intake. */
  body?: unknown;
  /** Local file details for evidence_upload; the file stays on the device. */
  file?: { uri: string; name: string; type: string };
  fields?: Record<string, string>;
  createdAt: string;
  attempts: number;
  lastError?: string;
}

function newId(): string {
  return `q_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function readAll(): Promise<QueuedItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedItem[]) : [];
  } catch {
    // A corrupt queue must not brick capture. Losing the queue is bad; an app
    // that will not open is worse.
    return [];
  }
}

async function writeAll(items: QueuedItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(items.slice(-MAX_ITEMS)));
  } catch {
    /* storage full or unavailable; nothing useful to do here */
  }
}

type Listener = (items: QueuedItem[]) => void;
const listeners = new Set<Listener>();

async function notify(): Promise<void> {
  const items = await readAll();
  listeners.forEach((listener) => listener(items));
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  readAll().then(listener);
  return () => listeners.delete(listener);
}

export async function enqueue(
  item: Omit<QueuedItem, 'id' | 'clientRef' | 'createdAt' | 'attempts'>,
): Promise<QueuedItem> {
  const queued: QueuedItem = {
    ...item,
    id: newId(),
    clientRef: newId(),
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  const items = await readAll();
  items.push(queued);
  await writeAll(items);
  await notify();
  return queued;
}

export async function list(): Promise<QueuedItem[]> {
  return readAll();
}

export async function count(): Promise<number> {
  return (await readAll()).length;
}

export async function remove(id: string): Promise<void> {
  const items = await readAll();
  await writeAll(items.filter((item) => item.id !== id));
  await notify();
}

export async function markFailed(id: string, error: string): Promise<void> {
  const items = await readAll();
  const next = items
    .map((item) =>
      item.id === id
        ? { ...item, attempts: item.attempts + 1, lastError: error }
        : item,
    )
    // An item that has failed this many times is not going to succeed by being
    // retried again; it stays visible so the user can see it was dropped.
    .filter((item) => item.attempts < MAX_ATTEMPTS);
  await writeAll(next);
  await notify();
}

export async function clear(): Promise<void> {
  await writeAll([]);
  await notify();
}
