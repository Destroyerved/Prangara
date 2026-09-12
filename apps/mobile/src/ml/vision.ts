/**
 * On-device image labelling.
 *
 * ML Kit's base image labeller, bundled with the app. It exists for one
 * practical reason: to tell the difference between a photograph of a document
 * and a photograph of a machine — or of neither — *before* the reader is shown
 * fields extracted from it.
 *
 * A mis-framed photo is the most common failure on a factory floor: somebody
 * photographs the floor, their hand, or the wrong side of the bill. Without
 * this check, the OCR returns almost nothing and the screen looks broken. With
 * it, the app can say "this does not look like a bill" and offer a retake.
 *
 * It is a hint, never a gate. The labeller is wrong often enough that refusing
 * to read a photo on its word would be worse than reading it.
 */

export type VisionLabel = { text: string; confidence: number };

export type SceneKind = 'document' | 'equipment' | 'unclear';

export type SceneGuess = {
  kind: SceneKind;
  confidence: number;
  labels: VisionLabel[];
  /** Plain sentence for the UI. Never a number on its own. */
  summary: string;
};

type LabelModule = { label: (uri: string) => Promise<VisionLabel[]> };

let cached: LabelModule | null | undefined;

function load(): LabelModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const imported = require('@react-native-ml-kit/image-labeling');
    const module = (imported?.default ?? imported) as LabelModule;
    // The package throws from a Proxy when the native side is missing, so the
    // presence of `label` is checked rather than assumed.
    cached = typeof module?.label === 'function' ? module : null;
  } catch {
    cached = null;
  }
  return cached;
}

export function isVisionAvailable(): boolean {
  return load() !== null;
}

/**
 * ML Kit's base label set is generic — "Paper", "Font", "Machine", "Metal".
 * These are the ones that separate a document from a machine in practice.
 */
const DOCUMENT_LABELS = new Set([
  'paper',
  'font',
  'text',
  'document',
  'screenshot',
  'receipt',
  'newspaper',
  'envelope',
  'book',
  'letter',
  'handwriting',
  'poster',
  'whiteboard',
  'business card',
]);

const EQUIPMENT_LABELS = new Set([
  'machine',
  'metal',
  'engine',
  'auto part',
  'motor',
  'vehicle',
  'wheel',
  'pipe',
  'gas',
  'tool',
  'factory',
  'industry',
  'steel',
  'iron',
  'cylinder',
  'fan',
  'electronics',
  'circuit component',
  'cable',
  'hardware',
  'nameplate',
]);

function score(labels: VisionLabel[], vocabulary: Set<string>): number {
  return labels
    .filter((label) => vocabulary.has(label.text.toLowerCase()))
    .reduce((total, label) => total + label.confidence, 0);
}

export async function labelImage(uri: string): Promise<VisionLabel[] | null> {
  const module = load();
  if (!module) return null;
  try {
    const labels = await module.label(uri);
    return Array.isArray(labels) ? labels : null;
  } catch {
    return null;
  }
}

/**
 * What the camera is pointing at, as far as the on-device model can tell.
 * Returns `null` when no labeller is available, which callers must treat as
 * "no opinion" rather than as a failure.
 */
export async function guessScene(uri: string): Promise<SceneGuess | null> {
  const labels = await labelImage(uri);
  if (!labels) return null;

  const documentScore = score(labels, DOCUMENT_LABELS);
  const equipmentScore = score(labels, EQUIPMENT_LABELS);
  const top = labels
    .slice()
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 4);
  const named = top.map((label) => label.text).join(', ');

  if (documentScore < 0.25 && equipmentScore < 0.25) {
    return {
      kind: 'unclear',
      confidence: Math.max(documentScore, equipmentScore),
      labels: top,
      summary: named
        ? `This phone sees ${named}. That may not be a document or a machine — check the framing before trusting what was read.`
        : 'This phone could not tell what is in the photo. Check the framing before trusting what was read.',
    };
  }

  const isDocument = documentScore >= equipmentScore;
  return {
    kind: isDocument ? 'document' : 'equipment',
    confidence: Math.min(1, isDocument ? documentScore : equipmentScore),
    labels: top,
    summary: `This phone sees ${named || (isDocument ? 'printed matter' : 'machinery')}.`,
  };
}
