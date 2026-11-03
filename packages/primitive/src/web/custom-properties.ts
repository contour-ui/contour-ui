import type { CSSProperties } from 'react';

/** The props that set custom properties on an element: on the web, its inline `style`. */
export interface CustomPropertiesProps<P extends CSSProperties> {
  readonly style: Readonly<P>;
}

/**
 * CSS custom properties of an element (`--knob-angle`), for styles of one's own, as props to
 * merge into it (`mergeProps`): on the web, its inline `style`, which the page's CSS reads
 * (`var(--knob-angle)`); native platforms have no CSS and leave them out. Name the properties in
 * a type of their own that extends `CSSProperties`. A plain function, so a server may run it.
 *
 * @example
 * interface DialStyle extends CSSProperties {
 *   readonly '--dial-angle': string;
 * }
 * const own = mergeProps(api.getRootProps(), customProperties<DialStyle>({ '--dial-angle': '45deg' }));
 * <Primitive.div {...mergeProps(own, props)} />
 */
export function customProperties<P extends CSSProperties>(properties: P): CustomPropertiesProps<P> {
  return { style: properties };
}
