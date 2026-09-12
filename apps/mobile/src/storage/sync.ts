/**
 * Draining the offline capture queue.
 *
 * The rule that makes this safe: **only network failures are retried.** If the
 * server answered — 400, 409, 422, anything — the request reached it and the
 * outcome is known, so replaying it would either duplicate a write or repeat a
 * refusal. Those items are dropped from the queue with their reason recorded,
 * not retried forever.
 *
 * Draining is single-flight. Two screens regaining connectivity at once must
 * produce one drain, not two racing ones writing the same rows twice.
 */

import NetInfo from '@react-native-community/netinfo';

import { ApiError, NetworkError, api, describeError } from '../api/client';
import { intake } from '../api/endpoints';
import * as queue from './queue';
import type { QueuedItem } from './queue';

export interface SyncResult {
  attempted: number;
  succeeded: number;
  failed: number;
  stillQueued: number;
  /** Items the server rejected outright; these are dropped, not retried. */
  rejected: { label: string; reason: string }[];
}

let draining: Promise<SyncResult> | null = null;

async function send(item: QueuedItem): Promise<void> {
  if (item.kind === 'confirm_intake') {
    await intake.confirm(item.factoryId, item.body as never);
    return;
  }

  const form = new FormData();
  if (item.file) {
    form.append('file', {
      uri: item.file.uri,
      name: item.file.name,
      type: item.file.type,
    } as unknown as Blob);
  }
  Object.entries(item.fields ?? {}).forEach(([key, value]) => form.append(key, value));
  await api.upload('/api/evidence', form);
}

export async function drain(): Promise<SyncResult> {
  if (draining) return draining;

  draining = (async (): Promise<SyncResult> => {
    const items = await queue.list();
    const result: SyncResult = {
      attempted: 0,
      succeeded: 0,
      failed: 0,
      stillQueued: items.length,
      rejected: [],
    };
    if (items.length === 0) return result;

    for (const item of items) {
      result.attempted += 1;
      try {
        await send(item);
        await queue.remove(item.id);
        result.succeeded += 1;
      } catch (error) {
        if (error instanceof NetworkError) {
          // Still offline. Stop here rather than burning attempts on the rest
          // of the queue; they will all fail the same way.
          await queue.markFailed(item.id, describeError(error));
          result.failed += 1;
          break;
        }
        if (error instanceof ApiError && !error.isTransient) {
          // The server answered and said no. Retrying will not change that.
          await queue.remove(item.id);
          result.rejected.push({ label: item.label, reason: error.message });
          result.failed += 1;
          continue;
        }
        await queue.markFailed(item.id, describeError(error));
        result.failed += 1;
      }
    }

    result.stillQueued = await queue.count();
    return result;
  })();

  try {
    return await draining;
  } finally {
    draining = null;
  }
}

/** Drain whenever the device comes back online. Returns an unsubscribe. */
export function startAutoSync(onResult?: (result: SyncResult) => void): () => void {
  let wasOnline: boolean | null = null;

  const unsubscribe = NetInfo.addEventListener((state) => {
    const online = Boolean(state.isConnected && state.isInternetReachable !== false);
    // Only on the transition into connectivity. Reacting to every NetInfo event
    // would drain repeatedly while the radio flaps, which is exactly when the
    // network is least reliable.
    if (online && wasOnline === false) {
      drain().then((result) => {
        if (result.attempted > 0) onResult?.(result);
      });
    }
    wasOnline = online;
  });

  return unsubscribe;
}

export async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return Boolean(state.isConnected && state.isInternetReachable !== false);
  } catch {
    // If the device cannot tell us, assume it is online and let the request
    // itself decide. Guessing offline would queue work that would have sent.
    return true;
  }
}
