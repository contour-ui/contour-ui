/**
 * A platform without CSS takes the values themselves: the `values` output prints them as a typed
 * module, one object per theme.
 */
import type { ModelToken } from '../model/model.ts';

/** A value as a TypeScript literal prints it: a string, a number or an object of them. */
export type PlainValue = string | number | { readonly [key: string]: PlainValue };

export interface ValuesPlatform {
  readonly name: string;
  /** TypeScript declarations of the types the values use, line by line. */
  readonly declarations: readonly string[];
  /** The lines of the doc comment of the interface of all values. */
  readonly description: readonly string[];
  /** The TypeScript type of a token's value, or `undefined` for a token the platform leaves out. */
  type(token: ModelToken): string | undefined;
  /** The value of a token in a theme; throws when the platform cannot express it. */
  value(token: ModelToken, theme: string): PlainValue;
}
