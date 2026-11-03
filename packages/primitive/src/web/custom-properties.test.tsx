import type { CSSProperties } from 'react';
import { expect, it } from 'vite-plus/test';
import { render } from 'vitest-browser-react';

import { customProperties } from './custom-properties.ts';
import { mergeProps } from './merge-props.ts';
import { Primitive } from './primitive.ts';

/** The custom properties of a dial of one's own. */
interface DialStyle extends CSSProperties {
  readonly '--knob-position': string;
  readonly '--knob-angle': string;
}

it('sets custom properties in the inline style, merged with the rest of it', async () => {
  const own = mergeProps(
    { 'data-part': 'root' },
    customProperties<DialStyle>({ '--knob-position': '0.5', '--knob-angle': '0deg' }),
  );
  const screen = await render(
    <Primitive.div data-testid="root" {...mergeProps(own, { style: { color: 'red' } })} />,
  );
  const style = getComputedStyle(screen.getByTestId('root').element());
  const values = ['--knob-position', '--knob-angle', 'color'].map((name) =>
    style.getPropertyValue(name),
  );

  expect(values).toStrictEqual(['0.5', '0deg', 'rgb(255, 0, 0)']);
});
