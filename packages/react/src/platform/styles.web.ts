/*
 * The web build of the styles platform module: a look gives each part its class and its data
 * attributes, and the stylesheet of the package does the rest (`:hover`, `:focus-visible`, the
 * variants). A pure function without hooks and without `'use client'`, so a component styled
 * through it, such as `Button`, stays a server component. Internal: public types never name it.
 */
import type { Look, WebLook } from '../utils/look.ts';

/** What {@link useStyles} gives each part: on the web, its class and its data attributes. */
export type Styles<Part extends string> = WebLook<Part>;

/**
 * The look of the parts of a component: on the web, the classes and data attributes of the web
 * half of `look`. A pure function, though named as a hook for the build of native platforms,
 * where it reads the token values of the theme: call it where a hook may be called.
 *
 * @example
 * const look = useStyles(buttonLook, { variant, size, disabled }, state);
 * return <Primitive.button {...mergeProps(look.root, props)} />;
 */
export function useStyles<Part extends string, Options, State>(
  look: Look<Part, Options, State>,
  options: Options,
  state: State,
): Styles<Part> {
  return look.web(options, state);
}
