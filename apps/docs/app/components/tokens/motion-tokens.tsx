import { defaultTheme } from '@contour-ui/tokens';
import type { ReactElement } from 'react';

import { tokensIn } from './token-data.ts';
import type { TokenDoc } from './token-data.ts';
import { TokenTable, VALUE_COLUMN } from './token-parts.tsx';

/** The control points of a transition's curve, from its DTCG value in `docs.json`. */
function curveOf(transition: unknown): readonly number[] {
  const curve: unknown =
    typeof transition === 'object' && transition !== null && 'timingFunction' in transition
      ? transition.timingFunction
      : undefined;
  return Array.isArray(curve) ? curve.filter((point) => typeof point === 'number') : [];
}

/** The curve of a transition, from its start (bottom left) to its end. */
function EasingCurve({ transition }: { readonly transition: unknown }): ReactElement | null {
  const [x1, y1, x2, y2] = curveOf(transition);
  if (x1 === undefined || y1 === undefined || x2 === undefined || y2 === undefined) {
    return null;
  }
  return (
    <svg className="docs-token-curve" viewBox="-0.1 -0.1 1.2 1.2">
      <path d={`M0 1C${x1} ${1 - y1} ${x2} ${1 - y2} 1 0`} />
    </svg>
  );
}

/**
 * The transition at work: a dot that crosses its track while the row is hovered or holds the
 * focus (its copy button), and comes back after. Under reduced motion it only changes color.
 */
function MotionDemo({ doc }: { readonly doc: TokenDoc }): ReactElement {
  return (
    <span className="docs-token-motion" aria-hidden="true">
      <EasingCurve transition={doc.themes[defaultTheme].dtcg} />
      <span className="docs-token-motion__track">
        <span
          className="docs-token-motion__dot"
          style={{ transition: `translate var(${doc.name}), background-color var(${doc.name})` }}
        />
      </span>
    </span>
  );
}

/** Transitions: `transition: <property> var(--ct-motion-<name>)`. */
export function MotionTokens(): ReactElement {
  return (
    <TokenTable
      rows={tokensIn('motion.')}
      columns={[{ title: 'Demo', render: (doc) => <MotionDemo doc={doc} /> }, VALUE_COLUMN]}
    />
  );
}
