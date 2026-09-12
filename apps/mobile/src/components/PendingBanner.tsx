/**
 * "N captures waiting to send."
 *
 * Queued work that is invisible is indistinguishable from lost work, and a
 * factory owner who thinks a reading was lost will enter it again. So the
 * pending count is always on screen while anything is waiting, with a manual
 * retry for when auto-sync has not fired.
 */

import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import * as queue from '../storage/queue';
import { drain } from '../storage/sync';
import { colour, radius, space, type as typeScale } from '../theme/tokens';

export default function PendingBanner() {
  const [items, setItems] = useState<queue.QueuedItem[]>([]);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => queue.subscribe(setItems), []);

  if (items.length === 0 && !note) return null;

  async function retry() {
    setSending(true);
    setNote(null);
    const result = await drain();
    setSending(false);
    if (result.rejected.length) {
      setNote(`${result.rejected.length} could not be saved: ${result.rejected[0].reason}`);
    } else if (result.succeeded > 0 && result.stillQueued === 0) {
      setNote(`${result.succeeded} capture(s) sent.`);
      setTimeout(() => setNote(null), 4000);
    } else if (result.stillQueued > 0) {
      setNote('Still no connection. They are saved on this phone and will send later.');
    }
  }

  const waiting = items.length;
  return (
    <View
      style={{
        backgroundColor: colour.surfaceRaised,
        borderRadius: radius.md,
        borderLeftWidth: 3,
        borderLeftColor: waiting ? colour.high : colour.ok,
        padding: space.md,
        marginBottom: space.md,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={{ ...typeScale.bodyStrong, color: colour.text, flex: 1 }}>
          {waiting
            ? `${waiting} capture${waiting === 1 ? '' : 's'} waiting to send`
            : 'All captures sent'}
        </Text>
        {waiting ? (
          <Pressable onPress={retry} disabled={sending} hitSlop={8}>
            <Text style={{ ...typeScale.bodyStrong, color: colour.primary }}>
              {sending ? 'Sending…' : 'Retry'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {waiting ? (
        <Text style={{ ...typeScale.caption, color: colour.textMuted, marginTop: space.xs }}>
          Saved on this phone. They will send on their own when you have a signal.
        </Text>
      ) : null}

      {items.slice(0, 3).map((item) => (
        <Text
          key={item.id}
          style={{ ...typeScale.caption, color: colour.textFaint, marginTop: 4 }}
        >
          • {item.label} — {item.factoryName}
          {item.attempts > 0 ? ` (${item.attempts} attempt${item.attempts === 1 ? '' : 's'})` : ''}
        </Text>
      ))}
      {items.length > 3 ? (
        <Text style={{ ...typeScale.caption, color: colour.textFaint, marginTop: 4 }}>
          • and {items.length - 3} more
        </Text>
      ) : null}

      {note ? (
        <Text style={{ ...typeScale.caption, color: colour.textMuted, marginTop: space.sm }}>
          {note}
        </Text>
      ) : null}
    </View>
  );
}
