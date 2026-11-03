import type { CSSProperties } from 'react';

/**
 * The props that set custom properties on an element: none on Soundor, which has no CSS. Generic
 * as the web build's (`{ style }` there), so shared code names the same type on both.
 */
// oxlint-disable-next-line typescript/no-generated-empty-object-type -- no props, on purpose.
export type CustomPropertiesProps<P extends CSSProperties> = Readonly<Record<never, P>>;

/** The props of no custom properties: one object, frozen, for every call. */
const NO_PROPS = Object.freeze({});

/**
 * CSS custom properties of an element (`--knob-angle`), for styles of one's own, as props to
 * merge into it (`mergeProps`): on the web, its inline `style`, which the page's CSS reads; on
 * Soundor nothing, since native platforms have no CSS: the values reach native styles through the
 * part's context. A plain function.
 *
 * @example
 * interface DialStyle extends CSSProperties {
 *   readonly '--dial-angle': string;
 * }
 * const own = mergeProps(api.getRootProps(), customProperties<DialStyle>({ '--dial-angle': '45deg' }));
 * <Primitive.div {...mergeProps(own, props)} />
 */
export function customProperties<P extends CSSProperties>(
  _properties: P,
  // oxlint-disable-next-line typescript/no-generated-empty-object-type -- no props, on purpose.
): CustomPropertiesProps<P> {
  return NO_PROPS;
}
