/*
 * The style vocabulary of native platforms (Soundor now, React Native later): flexbox as React
 * Native lays it out (a column by default, no shrinking unless asked) and text, in logical pixels
 * and CSS colors. Platform-free, so code written once (the native looks of the styled package)
 * types its style objects without importing a renderer; every native backend takes these objects
 * as its own `style`, and a type test of each keeps them assignable.
 */

/** Logical pixels, a percentage of the parent's, or `'auto'` (the content's). */
export type NativeDimension = number | `${number}%` | 'auto';

/** Logical pixels or a percentage of the parent's. */
export type NativeLength = number | `${number}%`;

/** How children or a node line up along an axis. */
export type NativeFlexAlign =
  | 'auto'
  | 'flex-start'
  | 'center'
  | 'flex-end'
  | 'stretch'
  | 'baseline'
  | 'space-between'
  | 'space-around'
  | 'space-evenly';

/** The pointer over a node: the cursors both Soundor and the web have. */
export type NativeCursor =
  | 'auto'
  | 'default'
  | 'none'
  | 'pointer'
  | 'text'
  | 'crosshair'
  | 'move'
  | 'ew-resize'
  | 'ns-resize'
  | 'nesw-resize'
  | 'nwse-resize';

/** A style object of a native element: the layout of its box, its paint and its text. */
export interface NativeStyle {
  readonly display?: 'flex' | 'none';
  readonly position?: 'relative' | 'absolute';
  readonly flexDirection?: 'column' | 'column-reverse' | 'row' | 'row-reverse';
  readonly flexWrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  readonly justifyContent?:
    | 'flex-start'
    | 'center'
    | 'flex-end'
    | 'space-between'
    | 'space-around'
    | 'space-evenly';
  readonly alignItems?: NativeFlexAlign;
  readonly alignSelf?: NativeFlexAlign;
  readonly alignContent?: NativeFlexAlign;
  readonly flex?: number;
  readonly flexGrow?: number;
  readonly flexShrink?: number;
  readonly flexBasis?: NativeDimension;

  readonly width?: NativeDimension;
  readonly height?: NativeDimension;
  readonly minWidth?: NativeLength;
  readonly minHeight?: NativeLength;
  readonly maxWidth?: NativeLength;
  readonly maxHeight?: NativeLength;
  readonly aspectRatio?: number;

  readonly margin?: NativeDimension;
  readonly marginHorizontal?: NativeDimension;
  readonly marginVertical?: NativeDimension;
  readonly marginTop?: NativeDimension;
  readonly marginRight?: NativeDimension;
  readonly marginBottom?: NativeDimension;
  readonly marginLeft?: NativeDimension;
  readonly padding?: NativeLength;
  readonly paddingHorizontal?: NativeLength;
  readonly paddingVertical?: NativeLength;
  readonly paddingTop?: NativeLength;
  readonly paddingRight?: NativeLength;
  readonly paddingBottom?: NativeLength;
  readonly paddingLeft?: NativeLength;
  readonly gap?: number;
  readonly rowGap?: number;
  readonly columnGap?: number;
  readonly top?: NativeDimension;
  readonly right?: NativeDimension;
  readonly bottom?: NativeDimension;
  readonly left?: NativeDimension;

  readonly borderWidth?: number;
  readonly borderTopWidth?: number;
  readonly borderRightWidth?: number;
  readonly borderBottomWidth?: number;
  readonly borderLeftWidth?: number;
  readonly borderColor?: string;
  readonly borderRadius?: number;
  readonly backgroundColor?: string;
  /** A line outside the border that follows its corners and takes no room: a focus ring. */
  readonly outlineWidth?: number;
  readonly outlineColor?: string;
  readonly outlineOffset?: number;
  readonly opacity?: number;
  readonly overflow?: 'visible' | 'hidden';
  readonly cursor?: NativeCursor;
  readonly zIndex?: number;

  readonly color?: string;
  /** One family, by name: a registered one, else one installed on the system. */
  readonly fontFamily?: string;
  readonly fontSize?: number;
  readonly fontWeight?: number | 'normal' | 'bold';
  readonly fontStyle?: 'normal' | 'italic';
  readonly lineHeight?: number;
  readonly letterSpacing?: number;
  readonly textAlign?: 'auto' | 'left' | 'center' | 'right';
}
