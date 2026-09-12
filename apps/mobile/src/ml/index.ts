/**
 * On-device intelligence.
 *
 * Three pieces, all running on the phone with nothing leaving it:
 *
 *   ocr        ML Kit text recognition, bundled in the APK
 *   vision     ML Kit image labelling, to check the photo is of what the
 *              reader thinks it is
 *   documents / nameplate
 *              deterministic field extraction from the recognised text, with
 *              a confidence and the exact line each value was read from
 *
 * The composed entry points below are what the screens call: one function per
 * kind of photograph, returning fields in the same shape the backend extractor
 * returns, so a screen renders both identically and only has to say which one
 * ran.
 */

import { isOcrAvailable, recogniseText, type OcrResult } from './ocr';
import { guessScene, isVisionAvailable, type SceneGuess } from './vision';
import { readDocument, type DocumentKind, type DocumentReading } from './documents';
import { readNameplate, type NameplateReading } from './nameplate';

export { isOcrAvailable, recogniseText } from './ocr';
export { guessScene, isVisionAvailable, labelImage } from './vision';
export { guessDocumentKind, guessPeriod, readDocument } from './documents';
export { guessAssetType, readNameplate } from './nameplate';
export type { OcrResult } from './ocr';
export type { SceneGuess, VisionLabel } from './vision';
export type { DocumentKind, DocumentReading, PeriodGuess } from './documents';
export type { AssetType, NameplateReading } from './nameplate';

export type OnDeviceStatus = {
  ocr: boolean;
  vision: boolean;
  /** One sentence for the UI, so a missing capability is never silent. */
  summary: string;
};

export function onDeviceStatus(): OnDeviceStatus {
  const ocr = isOcrAvailable();
  const vision = isVisionAvailable();
  const summary = ocr
    ? vision
      ? 'Text recognition and image labelling run on this phone. Nothing is uploaded to read a photo.'
      : 'Text recognition runs on this phone. Image labelling is unavailable in this build.'
    : 'On-device reading is unavailable in this build. A photo can still be filed and read by the server.';
  return { ocr, vision, summary };
}

export type ScanOutcome<T> = {
  /** Which extractor produced the fields, for the screen to display. */
  extractor: 'device_ocr' | 'unavailable';
  extractorDetail: string;
  ocr: OcrResult | null;
  scene: SceneGuess | null;
  reading: T | null;
};

/** Read a bill or invoice, entirely on the phone. */
export async function scanDocumentOnDevice(
  uri: string,
  kind?: DocumentKind,
): Promise<ScanOutcome<DocumentReading>> {
  if (!isOcrAvailable()) {
    return {
      extractor: 'unavailable',
      extractorDetail: 'This build has no on-device text recognition.',
      ocr: null,
      scene: null,
      reading: null,
    };
  }

  // Labelling first: it is fast, and a mis-framed photo is worth catching
  // before the reader is shown fields read from it.
  const scene = await guessScene(uri);
  const ocr = await recogniseText(uri);

  if (!ocr || !ocr.lines.length) {
    return {
      extractor: 'device_ocr',
      extractorDetail:
        'This phone read the photo but found no text on it. Move closer, hold steady, and keep the whole bill in frame.',
      ocr,
      scene,
      reading: null,
    };
  }

  const reading = readDocument(ocr.rows.length ? ocr.rows : ocr.lines, kind);
  const found = reading.fields.length;
  return {
    extractor: 'device_ocr',
    extractorDetail: found
      ? `Read on this phone in ${(ocr.durationMs / 1000).toFixed(1)}s: ${found} field${
          found === 1 ? '' : 's'
        } found. Check each one against the bill before saving.`
      : `Read on this phone in ${(ocr.durationMs / 1000).toFixed(1)}s, but no figure matched a known bill layout. Enter the reading by hand.`,
    ocr,
    scene,
    reading,
  };
}

/** Read an equipment nameplate, entirely on the phone. */
export async function scanNameplateOnDevice(uri: string): Promise<ScanOutcome<NameplateReading>> {
  if (!isOcrAvailable()) {
    return {
      extractor: 'unavailable',
      extractorDetail: 'This build has no on-device text recognition.',
      ocr: null,
      scene: null,
      reading: null,
    };
  }

  const scene = await guessScene(uri);
  const ocr = await recogniseText(uri);

  if (!ocr || !ocr.lines.length) {
    return {
      extractor: 'device_ocr',
      extractorDetail:
        'This phone read the photo but found no text on it. Nameplates are small and often oily - get close, and avoid the flash reflecting off the plate.',
      ocr,
      scene,
      reading: null,
    };
  }

  const reading = readNameplate(ocr.rows.length ? ocr.rows : ocr.lines);
  const found = reading.fields.length;
  return {
    extractor: 'device_ocr',
    extractorDetail: found
      ? `Read on this phone in ${(ocr.durationMs / 1000).toFixed(1)}s: ${found} field${
          found === 1 ? '' : 's'
        } found. Confirm the rating before saving.`
      : `Read on this phone in ${(ocr.durationMs / 1000).toFixed(1)}s, but nothing on the plate matched a known rating format. Enter it by hand.`,
    ocr,
    scene,
    reading,
  };
}
