import { render, screen } from '@soundor/testing-library/react';
import type { CSSProperties } from 'react';
import { describe, expect, it } from 'vite-plus/test';

import { customProperties } from './custom-properties.ts';
import { mergeProps } from './merge-props.ts';
import { Primitive } from './primitive.ts';

/** The custom properties of a dial of one's own, as a part names them. */
interface DialStyle extends CSSProperties {
  readonly '--dial-angle': string;
}

describe('customProperties on Soundor', () => {
  it('gives no props: native platforms have no CSS', async () => {
    const props = customProperties<DialStyle>({ '--dial-angle': '45deg' });
    expect(props).toEqual({});
    expect(Object.isFrozen(props)).toBe(true);
    await render(
      <Primitive.div {...mergeProps({ 'aria-label': 'Dial' }, props, { style: { width: 40 } })} />,
    );
    expect(screen.getByLabelText('Dial').style).toEqual({ width: 40 });
  });
});
