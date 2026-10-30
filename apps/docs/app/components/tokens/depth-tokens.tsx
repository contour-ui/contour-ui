import type { Theme } from '@contour-ui/tokens';
import type { ReactElement } from 'react';

import { tokensIn } from './token-data.ts';
import type { TokenDoc } from './token-data.ts';
import {
  ThemePanels,
  TokenDescription,
  TokenName,
  TokenTable,
  VALUE_COLUMN,
} from './token-parts.tsx';

/** A `box-shadow` value in `theme`, a layer per line: commas outside parentheses separate them. */
function ShadowLayers({
  doc,
  theme,
}: {
  readonly doc: TokenDoc;
  readonly theme: Theme;
}): ReactElement {
  const { value, alias } = doc.themes[theme];
  return (
    <span className="docs-token-value">
      {value.split(/,\s*(?![^()]*\))/u).map((layer) => (
        <code key={layer}>{layer}</code>
      ))}
      {alias === null ? null : <code className="docs-token-value__alias">{alias}</code>}
    </span>
  );
}

/** Each shadow cast by a raised card, in a panel per theme: the dark theme's are stronger. */
export function ShadowTokens(): ReactElement {
  const shadows = tokensIn('shadow.');
  return (
    <div className="docs-token-groups contour-docs-not-prose">
      <ThemePanels label="Shadows">
        {(theme) => (
          <ul className="docs-token-shadows">
            {shadows.map((doc) => (
              <li
                key={doc.name}
                className="docs-token-shadow"
                style={{ boxShadow: `var(${doc.name})` }}
              >
                <TokenName name={doc.name} />
                <TokenDescription doc={doc} />
                <ShadowLayers doc={doc} theme={theme} />
              </li>
            ))}
          </ul>
        )}
      </ThemePanels>
    </div>
  );
}

/** The stacking order, `z-index` values. */
export function LayerTokens(): ReactElement {
  return <TokenTable rows={tokensIn('layer.')} columns={[VALUE_COLUMN]} />;
}
