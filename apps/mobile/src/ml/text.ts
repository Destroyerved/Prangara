/**
 * Shared text shaping for the on-device readers.
 *
 * Recognition does not return a document the way a person reads one. A
 * two-column nameplate comes back as separate lines - "kW", "VOLTS", "RPM" in
 * one block and "7.5", "415", "1440" in another - and a bill's label column is
 * frequently recognised apart from its value column. A reader that treats each
 * recognised line as a row finds almost nothing on those photographs, which
 * looks exactly like a broken scanner.
 *
 * Two repairs, in order of trustworthiness:
 *
 *  1. `rowsFromGeometry` rebuilds the printed rows from where the text
 *     actually sits on the page. This is the reliable one: it uses the
 *     recogniser's own bounding boxes.
 *  2. `expandLines` pairs each line with the one after it, for the case where
 *     no geometry is available. Weaker, so callers score it lower.
 */

export type PositionedLine = { text: string; x: number; y: number; height: number };

export type Candidate = { text: string; paired: boolean };

/**
 * Group recognised lines into the rows they were printed on.
 *
 * Two pieces of text belong to the same row when their vertical centres are
 * closer together than a fraction of the line height - the same judgement a
 * reader makes without thinking. Within a row, text is ordered left to right,
 * so "kW" + "7.5" + "HP" + "10" reassembles as the row the plate shows.
 */
export function rowsFromGeometry(lines: PositionedLine[]): string[] {
  const usable = lines.filter((line) => line.text.trim().length > 0);
  if (usable.length < 2) return usable.map((line) => line.text.trim());

  // Without heights there is nothing to scale the tolerance to, and guessing a
  // pixel value would fail on every unfamiliar image size.
  const heights = usable.map((line) => line.height).filter((height) => height > 0);
  if (!heights.length) return usable.map((line) => line.text.trim());
  const median = [...heights].sort((a, b) => a - b)[Math.floor(heights.length / 2)];
  const tolerance = Math.max(4, median * 0.6);

  const ordered = [...usable].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: PositionedLine[][] = [];
  ordered.forEach((line) => {
    const centre = line.y + line.height / 2;
    const row = rows.find((candidate) => {
      const first = candidate[0];
      const rowCentre = first.y + first.height / 2;
      return Math.abs(rowCentre - centre) <= tolerance;
    });
    if (row) row.push(line);
    else rows.push([line]);
  });

  return rows.map((row) =>
    row
      .sort((a, b) => a.x - b.x)
      .map((line) => line.text.trim())
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

/**
 * Offer every line twice: as printed, and joined to the line after it. The
 * joined form is marked so callers can score it lower - it is a weaker claim,
 * because the two lines might have nothing to do with each other.
 */
export function expandLines(lines: string[]): Candidate[] {
  const cleaned = lines.map((line) => line.trim()).filter(Boolean);
  const candidates: Candidate[] = cleaned.map((text) => ({ text, paired: false }));

  for (let index = 0; index < cleaned.length - 1; index += 1) {
    const current = cleaned[index];
    const next = cleaned[index + 1];
    // Only worth joining when the first line carries no number of its own:
    // that is the case where the value is on the following line.
    if (!/\d/.test(current) && /\d/.test(next)) {
      candidates.push({ text: `${current} ${next}`, paired: true });
    }
  }

  return candidates;
}

/** The penalty applied to a value read across two lines rather than one. */
export const PAIRED_PENALTY = 0.06;
