/**
 * Regenerate the generated DTCG sources: the base palette and the semantic
 * color roles of both themes. Edit `palette.ts` / `semantic-colors.ts`, then run
 *
 *   vp run --filter @contour-ui/tokens generate
 *
 * (which also rebuilds the CSS/TS outputs). Never edit the generated JSON by hand.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';

import { generatePalette } from './palette.ts';
import { PACKAGE_DIR, PALETTE_FILE, semanticColorFile } from './paths.ts';
import { semanticColors } from './semantic-colors.ts';

const toJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

const outputs: Array<readonly [string, unknown]> = [
  [PALETTE_FILE, generatePalette()],
  [semanticColorFile('dark'), semanticColors('dark')],
  [semanticColorFile('light'), semanticColors('light')],
];

for (const [file, document] of outputs) {
  writeFileSync(file, toJson(document));
  console.log(`wrote ${path.relative(PACKAGE_DIR, file)}`);
}
