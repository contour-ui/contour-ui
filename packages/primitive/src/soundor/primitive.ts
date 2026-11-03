/*
 * The elements of the Soundor build: `@soundor/react` components, with the web vocabulary
 * translated into their own props (`../native/translate.ts`), the text of boxes wrapped into
 * text nodes (`./box.ts`), and what the DOM does by itself and Soundor does not: id references,
 * the focus fixup, toggled props given every time (`./native-element.ts`).
 */
import { Pressable, Text, View } from '@soundor/react';
import type { PressableProps, TextProps, ViewProps } from '@soundor/react';
import { Line, Path, Svg } from '@soundor/react/svg';
import type { LineProps, PathProps, SvgProps } from '@soundor/react/svg';
import { createElement, use } from 'react';
import type { ReactElement } from 'react';

import { focusableOf, shapeProps } from '../native/translate.ts';
import { warnOnce } from '../native/warnings.ts';
import { useBox } from './box.ts';
import type { BoxHost } from './box.ts';
import { useNativeElement } from './native-element.ts';
import { mergeTextStyles, TextStyleContext } from './text-style.ts';
import type {
  PrimitiveButtonProps,
  PrimitiveComponents,
  PrimitiveDivProps,
  PrimitiveFormValueProps,
  PrimitiveLineProps,
  PrimitivePathProps,
  PrimitiveSpanProps,
  PrimitiveSvgProps,
  PrimitiveTextProps,
} from './types.ts';

// The translated props are what each Soundor component takes: asserted once per host, here.
/* oxlint-disable typescript/no-unsafe-type-assertion */
const view: BoxHost = (props, children) => createElement(View, props as ViewProps, ...children);
const pressable: BoxHost = (props, children) =>
  createElement(Pressable, props as PressableProps, ...children);

function PrimitiveDiv(props: PrimitiveDivProps): ReactElement {
  const focusable = focusableOf('div', props.tabIndex, false);
  // `focusable` every time: Soundor leaves a prop that goes away as it was.
  return useBox(useNativeElement('div', props, focusable, { focusable }), props, view);
}

function PrimitiveSpan(props: PrimitiveSpanProps): ReactElement {
  const focusable = focusableOf('span', props.tabIndex, false);
  return useBox(useNativeElement('span', props, focusable, { focusable }), props, view);
}

function PrimitiveText(props: PrimitiveTextProps): ReactElement {
  const focusable = focusableOf('text', props.tabIndex, false);
  // The ambient text style first, the text's own over it.
  const style = mergeTextStyles(use(TextStyleContext), props.style);
  const native = useNativeElement('text', props, focusable, {
    focusable,
    style,
    children: props.children,
  });
  return createElement(Text, native.props as TextProps);
}

function PrimitiveButton(props: PrimitiveButtonProps): ReactElement {
  const disabled = props.disabled ?? false;
  if (props.tabIndex !== undefined && props.tabIndex < 0) {
    warnOnce(
      'button',
      'tabIndex',
      'below 0 has no twin on Soundor: a Pressable takes focus while it is enabled.',
    );
  }
  // Pressable gives `focusable` itself, from `disabled`, which it gets every time.
  return useBox(useNativeElement('button', props, !disabled, { disabled }), props, pressable);
}

function PrimitiveSvg(props: PrimitiveSvgProps): ReactElement {
  const focusable = focusableOf('svg', props.tabIndex, false);
  const native = useNativeElement('svg', props, focusable, {
    focusable,
    children: props.children,
  });
  return createElement(Svg, native.props as SvgProps);
}

function PrimitivePath(props: PrimitivePathProps): ReactElement {
  return createElement(Path, shapeProps('path', props) as PathProps);
}

function PrimitiveLine(props: PrimitiveLineProps): ReactElement {
  return createElement(Line, shapeProps('line', props) as LineProps);
}
/* oxlint-enable typescript/no-unsafe-type-assertion */

/** Soundor has no forms: the value of a form renders nothing. */
function PrimitiveFormValue(_props: PrimitiveFormValueProps): null {
  return null;
}

PrimitiveDiv.displayName = 'Primitive.div';
PrimitiveSpan.displayName = 'Primitive.span';
PrimitiveText.displayName = 'Primitive.text';
PrimitiveButton.displayName = 'Primitive.button';
PrimitiveSvg.displayName = 'Primitive.svg';
PrimitivePath.displayName = 'Primitive.path';
PrimitiveLine.displayName = 'Primitive.line';
PrimitiveFormValue.displayName = 'Primitive.formValue';

/**
 * The elements of the Soundor build, written in web words and rendered by `@soundor/react`:
 * `div` and `span` are `View`s, `text` a `Text`, `button` a `Pressable` (`onPress`), `svg`,
 * `path` and `line` the vector shapes of `@soundor/react/svg`, and `formValue` nothing.
 *
 * - `role` → `accessibilityRole` (`slider` → `adjustable`; a role without a twin throws), `aria-*`
 *   → `accessibilityLabel`, `accessibilityHint`, `accessibilityState` and `accessibilityValue`,
 *   `aria-labelledby` and `aria-describedby` → the text of the elements they name; `data-*` and
 *   the attributes without a twin are left out.
 * - `tabIndex` → `focusable`, given every time (`button`: focusable while enabled); an element
 *   that stops taking focus while it has it gives it up.
 * - Strings and numbers in a box or the pressable go into a `Text`, one per run, in the ambient
 *   text style (`textStyle`); `Primitive.text` takes that style too.
 * - Shapes take their presentation props only.
 *
 * @example
 * <Primitive.svg role="slider" tabIndex={0} aria-valuenow={50} viewBox="0 0 100 100">
 *   <Primitive.path d={track} stroke="currentColor" />
 * </Primitive.svg>
 * // <Svg focusable accessibilityRole="adjustable" accessibilityValue={{ now: 50 }} …>
 */
export const Primitive: PrimitiveComponents = {
  div: PrimitiveDiv,
  span: PrimitiveSpan,
  text: PrimitiveText,
  button: PrimitiveButton,
  svg: PrimitiveSvg,
  path: PrimitivePath,
  line: PrimitiveLine,
  formValue: PrimitiveFormValue,
};
