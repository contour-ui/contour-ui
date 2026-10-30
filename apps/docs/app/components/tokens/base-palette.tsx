import { Collapsible, Table } from '@contour-ui/react';
import { defaultTheme } from '@contour-ui/tokens';
import type { ReactElement } from 'react';

import { groupBy, tokensIn } from './token-data.ts';
import type { TokenDoc } from './token-data.ts';

/** `base.color.<hue>.<stop>` */
const hueOf = (doc: TokenDoc): string => doc.token.split('.')[2] ?? '';
const stopOf = (doc: TokenDoc): string => doc.token.split('.')[3] ?? '';

/**
 * The base palette behind the color roles: a row per hue, a column per stop, closed until asked
 * for. It is not API: it is here for tuning the roles. A swatch names its value, and its custom
 * property on hover.
 */
export function BasePalette(): ReactElement {
  const colors = tokensIn('base.color.');
  const hues = groupBy(colors, hueOf);
  const stops = [...new Set(colors.map((doc) => stopOf(doc)))].toSorted(
    (a, b) => Number(a) - Number(b),
  );
  return (
    <Collapsible.Root lazyMount className="docs-token-palette contour-docs-not-prose">
      <Collapsible.Trigger>
        <Collapsible.Indicator />
        {`Palette: ${colors.length} colors in ${hues.size} hues`}
      </Collapsible.Trigger>
      <Collapsible.Content>
        <div className="docs-token-palette__content">
          <Table.ScrollArea className="docs-token-table">
            <Table.Root variant="outline" size="sm">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Hue</Table.ColumnHeader>
                  {stops.map((stop) => (
                    <Table.ColumnHeader key={stop}>{stop}</Table.ColumnHeader>
                  ))}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {[...hues].map(([hue, row]) => (
                  <Table.Row key={hue}>
                    <Table.ColumnHeader scope="row">{hue}</Table.ColumnHeader>
                    {stops.map((stop) => {
                      const doc = row.find((color) => stopOf(color) === stop);
                      const value = doc?.themes[defaultTheme].value;
                      return doc === undefined || value === undefined ? (
                        <Table.Cell key={stop} />
                      ) : (
                        <Table.Cell key={stop} title={`${doc.name}: ${value}`}>
                          <span
                            aria-hidden="true"
                            className="docs-token-palette__swatch"
                            style={{ backgroundColor: `var(${doc.name})` }}
                          />
                          <span className="docs-token-visually-hidden">{value}</span>
                        </Table.Cell>
                      );
                    })}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Table.ScrollArea>
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
