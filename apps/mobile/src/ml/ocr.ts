/**
 * On-device text recognition.
 *
 * ML Kit's Latin text recogniser, bundled into the APK rather than downloaded,
 * so a bill or a nameplate can be read standing next to the machine with no
 * signal and nothing leaving the phone. The backend extractor stays as a
 * second opinion when there is a network; it is no longer the only way to get
 * a number off a photograph.
 *
 * Everything here is wrapped so a missing native module degrades to "OCR
 * unavailable" instead of crashing the screen - the app has to survive being
 * built without it.
 */

import * as ImageManipulator from 'expo-image-manipulator';

import { rowsFromGeometry, type PositionedLine } from './text';

export type OcrResult = {
  /** Everything the recogniser read, in its own order. */
  text: string;
  /** One entry per recognised line, top to bottom. */
  lines: string[];
  /**
   * Lines regrouped into printed rows using their positions. A two-column
   * nameplate or a bill's label/value columns come back from the recogniser as
   * separate lines; these are the rows a human sees.
   */
  rows: string[];
  /** Milliseconds the recognition itself took. Shown so slowness is visible. */
  durationMs: number;
};

type BoundingBox = { x: number; y: number; width: number; height: number };
type RecognisedLine = { text: string; boundingBox?: BoundingBox };
type RecognisedBlock = {
  text: string;
  boundingBox?: BoundingBox;
  lines?: RecognisedLine[];
};
type Recognition = { text: string; blocks?: RecognisedBlock[] };

type OcrModule = {
  recognizeText: (uri: string) => Promise<Recognition>;
  isSupported?: () => boolean;
};

let cached: OcrModule | null | undefined;

/**
 * Loaded lazily and defensively: an APK built without the native module must
 * still run, with scanning falling back to the server or to manual entry.
 */
function load(): OcrModule | null {
  if (cached !== undefined) return cached;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const module = require('expo-mlkit-ocr') as OcrModule;
    cached = typeof module?.recognizeText === 'function' ? module : null;
  } catch {
    cached = null;
  }
  return cached;
}

export function isOcrAvailable(): boolean {
  const module = load();
  if (!module) return false;
  try {
    return module.isSupported ? module.isSupported() : true;
  } catch {
    return false;
  }
}

/**
 * ML Kit reads small print poorly below about 1000px on the long edge, and
 * wastes time above about 2000px. A phone camera hands us 3000-4000px, so
 * every photo is normalised before recognition.
 */
async function prepare(uri: string): Promise<string> {
  try {
    const context = ImageManipulator.ImageManipulator.manipulate(uri);
    const image = await context.resize({ width: 1600 }).renderAsync();
    const saved = await image.saveAsync({
      format: ImageManipulator.SaveFormat.JPEG,
      compress: 0.9,
    });
    return saved.uri;
  } catch {
    // A resize failure is not a reason to refuse to read the original.
    return uri;
  }
}

export async function recogniseText(uri: string): Promise<OcrResult | null> {
  const module = load();
  if (!module) return null;

  const started = Date.now();
  const prepared = await prepare(uri);
  let recognition: Recognition;
  try {
    recognition = await module.recognizeText(prepared);
  } catch {
    return null;
  }

  // Per-line geometry, because a document's meaning is in its layout: a label
  // and its value share a row even when the recogniser reports them as two
  // unrelated lines in different blocks.
  const positioned: PositionedLine[] = [];
  (recognition.blocks ?? []).forEach((block) => {
    const blockLines = block.lines?.length ? block.lines : [{ text: block.text, boundingBox: block.boundingBox }];
    blockLines.forEach((line) => {
      const text = line.text?.trim();
      if (!text) return;
      positioned.push({
        text,
        x: line.boundingBox?.x ?? block.boundingBox?.x ?? 0,
        y: line.boundingBox?.y ?? block.boundingBox?.y ?? 0,
        height: line.boundingBox?.height ?? block.boundingBox?.height ?? 0,
      });
    });
  });

  const lines = positioned.length
    ? [...positioned].sort((a, b) => a.y - b.y || a.x - b.x).map((line) => line.text)
    : (recognition.text ?? '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);

  return {
    text: recognition.text ?? lines.join('\n'),
    lines,
    rows: rowsFromGeometry(positioned),
    durationMs: Date.now() - started,
  };
}
