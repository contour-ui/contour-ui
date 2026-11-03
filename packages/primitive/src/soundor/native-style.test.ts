import type { Style, StyleProp } from '@soundor/react';
import { describe, expectTypeOf, it } from 'vite-plus/test';

import type { NativeStyle } from '../shared/native-style.ts';

/*
 * Platform-free code (the native looks of the styled package) types its style objects as
 * `NativeStyle`, and the Soundor build passes them to its components as they are. These checks
 * run in the type check of the Soundor build (`tsc -p tsconfig.soundor.json`, `vp run
 * typecheck:platforms`): a property Soundor renames, drops or narrows fails them.
 */
describe('NativeStyle on Soundor', () => {
  it('is a style Soundor takes', () => {
    expectTypeOf<NativeStyle>().toExtend<Style>();
    expectTypeOf<NativeStyle>().toExtend<StyleProp>();
    expectTypeOf<readonly NativeStyle[]>().toExtend<StyleProp>();
  });

  it('names only properties of Soundor', () => {
    expectTypeOf<Exclude<keyof NativeStyle, keyof Style>>().toEqualTypeOf<never>();
  });
});
