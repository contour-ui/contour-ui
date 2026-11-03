/*
 * The web vocabulary in the words of native platforms (Soundor now, React Native later): ARIA and
 * roles into the accessibility props of React Native, driven by the compatibility table of
 * `../shared/compat.ts`. Plain functions of the props, no renderer: each native host passes their
 * result to its own components.
 */
import { ARIA_ATTRIBUTES, ROLES } from '../shared/compat.ts';
import type {
  AriaAttribute,
  NativeRole,
  SharedAriaAttribute,
  SharedRole,
} from '../shared/compat.ts';
import type { ShapeElement, SharedElement } from '../shared/elements.ts';
import { warnOnce } from './warnings.ts';

/**
 * What the id references of an element resolve to: the text of the elements it points at
 * (`aria-labelledby`, `aria-describedby`), and whether another element points at it.
 */
export interface IdTexts {
  /** The text of the elements `aria-labelledby` names, in its order; `undefined` for none. */
  readonly label: string | undefined;
  /** The text of the elements `aria-describedby` names; `undefined` for none. */
  readonly hint: string | undefined;
  /** Another element is named or described by this one's text. */
  readonly referenced: boolean;
}

/** The id texts of an element that points at nothing and that nothing points at. */
export const NO_ID_TEXTS: IdTexts = Object.freeze({
  label: undefined,
  hint: undefined,
  referenced: false,
});

/**
 * Props a host component reads itself, never passed on as they are: the children, the ref, the
 * id (the registry's), the role and the tab index (translated by the host with its defaults),
 * and the ambient text style of a box.
 */
const OWN_PROPS: ReadonlySet<string> = new Set([
  'children',
  'ref',
  'id',
  'role',
  'tabIndex',
  'textStyle',
]);

/** Props of the web alone, dropped with a warning: why each has no twin. */
const WEB_ONLY_PROPS: ReadonlyMap<string, string> = new Map([
  ['className', 'is web-only and was dropped: a native element takes its look from `style`.'],
  ['asChild', 'is web-only and was dropped: a native element always renders its own node.'],
]);

/** Whether `role` is one of the roles shared code may write. */
const isSharedRole = (role: string): role is SharedRole => Object.hasOwn(ROLES, role);

/** Whether `key` is an ARIA attribute of the table. */
const isSharedAria = (key: string): key is SharedAriaAttribute =>
  Object.hasOwn(ARIA_ATTRIBUTES, key);

/** An ARIA boolean (`true`, `'true'`, `false`, `'false'`), or `undefined` for anything else. */
function booleanOf(value: unknown): boolean | undefined {
  if (value === true || value === 'true') {
    return true;
  }
  return value === false || value === 'false' ? false : undefined;
}

/** An ARIA number, as a finite number, or `undefined`. */
function numberOf(value: unknown): number | undefined {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) ? number : undefined;
}

/** An ARIA text: a string, or a number as text; `undefined` for anything else. */
function textOf(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  return typeof value === 'number' ? String(value) : undefined;
}

/**
 * A field of a native state or value: a flag (`checked` may be `'mixed'`), a number or a text.
 */
type NativeField = boolean | number | string;

/** The value of an ARIA attribute of the state or the value, in the type its native field takes. */
function nativeValueOf(attribute: AriaAttribute, value: unknown): NativeField | undefined {
  if (attribute.value === 'boolean') {
    return booleanOf(value);
  }
  if (attribute.value === 'tristate') {
    return value === 'mixed' ? 'mixed' : booleanOf(value);
  }
  return attribute.value === 'number' ? numberOf(value) : textOf(value);
}

/**
 * The props of an element as a record of its keys. A props object is a plain object of its own
 * props, which the translation reads one by one and passes on as they are.
 */
function recordOf(props: object): Readonly<Record<string, unknown>> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return props as Readonly<Record<string, unknown>>;
}

/** The length of `aria-` and of `aria-value`: the native field is the rest of the name. */
const ARIA_PREFIX = 'aria-'.length;
const ARIA_VALUE_PREFIX = 'aria-value'.length;

/**
 * The native role of `role` on `element`: a {@link NativeRole}, or `'group'` for an accessible
 * node without a role. Throws a readable error for a role without a twin, which a native runtime
 * would reject with an error of its own (Soundor's names neither the element nor the role).
 *
 * @example
 * nativeRoleOf('svg', 'slider'); // 'adjustable'
 * nativeRoleOf('div', 'listbox'); // throws: Primitive.div: role="listbox" has no twin…
 */
export function nativeRoleOf(
  element: SharedElement,
  role: unknown,
): NativeRole | 'group' | undefined {
  if (role === undefined) {
    return undefined;
  }
  if (typeof role === 'string' && isSharedRole(role)) {
    return ROLES[role];
  }
  const written = typeof role === 'string' ? `"${role}"` : `{${typeof role}}`;
  throw new Error(
    `Primitive.${element}: role=${written} has no twin on native platforms, which reject a role they do not know. Write one of the roles of ROLES (@contour-ui/primitive), or none.`,
  );
}

/** Set `key` of `out` to `value`, unless a prop of the host itself set it already. */
function translated(out: Record<string, unknown>, key: string, value: unknown): void {
  if (out[key] === undefined) {
    out[key] = value;
  }
}

/**
 * Translate the props of `Primitive.<element>` into the props of its native host, written into
 * `out`, and return whether the element is hidden from assistive technology.
 *
 * - `role` → `accessibilityRole` through `ROLES` (`group`: `accessible` without a role);
 * - `aria-label` → `accessibilityLabel`; the text `aria-labelledby` names (`ids.label`) wins
 *   over it, as in accname; `aria-describedby` → `accessibilityHint` (`ids.hint`);
 * - the attributes of the table's `state` → `accessibilityState`, of its `value` →
 *   `accessibilityValue`, only the fields given;
 * - `aria-hidden`, or text another element is named or described by (`ids.referenced`, an
 *   element without a role of its own), → `accessible={false}`: it is read with that element,
 *   not again on its own;
 * - the table's `dropped` attributes, `data-*` and `undefined` values are left out; an `aria-*`
 *   outside the table and the web-only `className` and `asChild` too, with a warning;
 * - anything else is the host's own prop and passes as it is, winning over a translated one.
 *
 * `children`, `ref`, `id`, `tabIndex` and `textStyle` are the host component's to handle.
 */
export function translateProps(
  element: SharedElement,
  props: object,
  ids: IdTexts,
  out: Record<string, unknown>,
): boolean {
  const input = recordOf(props);
  let label: string | undefined;
  let ariaHidden = false;
  let state: Record<string, NativeField> | undefined;
  let value: Record<string, NativeField> | undefined;

  for (const key in input) {
    const entry = input[key];
    if (entry === undefined || OWN_PROPS.has(key)) {
      continue;
    }
    if (key.startsWith('aria-')) {
      if (!isSharedAria(key)) {
        warnOnce(
          element,
          key,
          'has no twin on native platforms and was dropped (ARIA_ATTRIBUTES).',
        );
        continue;
      }
      const attribute: AriaAttribute = ARIA_ATTRIBUTES[key];
      if (attribute.native === 'label') {
        label = textOf(entry);
      } else if (attribute.native === 'hidden') {
        ariaHidden = booleanOf(entry) === true;
      } else if (attribute.native === 'state') {
        const field = nativeValueOf(attribute, entry);
        if (field !== undefined) {
          state ??= {};
          state[key.slice(ARIA_PREFIX)] = field;
        }
      } else if (attribute.native === 'value') {
        const field = nativeValueOf(attribute, entry);
        if (field !== undefined) {
          value ??= {};
          value[key.slice(ARIA_VALUE_PREFIX)] = field;
        }
      }
      // `labelledby` and `describedby` come through `ids`; `dropped` has no twin.
      continue;
    }
    if (key.startsWith('data-')) {
      continue;
    }
    const webOnly = WEB_ONLY_PROPS.get(key);
    if (webOnly !== undefined) {
      warnOnce(element, key, webOnly);
      continue;
    }
    out[key] = entry;
  }

  const role = nativeRoleOf(element, input['role']);
  if (role !== undefined && role !== 'group') {
    translated(out, 'accessibilityRole', role);
  }
  // accname: the text `aria-labelledby` names first, then `aria-label`.
  const name = ids.label ?? label;
  if (name !== undefined) {
    translated(out, 'accessibilityLabel', name);
  }
  if (ids.hint !== undefined) {
    translated(out, 'accessibilityHint', ids.hint);
  }
  if (state !== undefined) {
    translated(out, 'accessibilityState', state);
  }
  if (value !== undefined) {
    translated(out, 'accessibilityValue', value);
  }
  // Text another element is named or described by is read with it, not again on its own; an
  // element with a role of its own (a heading that titles a dialog) stays.
  const hidden = ariaHidden || (ids.referenced && role === undefined);
  if (hidden) {
    translated(out, 'accessible', false);
  } else if (role === 'group') {
    translated(out, 'accessible', true);
  }
  return hidden;
}

/**
 * Whether an element with `tabIndex` takes focus: `>= 0` takes it, a negative one does not (native
 * platforms have no focus "from code only"), none takes the element's default. Always a boolean:
 * a native host leaves a prop that goes away as it was, so a `tabIndex` taken off would leave the
 * node focusable.
 */
export function focusableOf(
  element: SharedElement,
  tabIndex: unknown,
  byDefault: boolean,
): boolean {
  if (typeof tabIndex !== 'number') {
    return byDefault;
  }
  if (tabIndex < 0) {
    warnOnce(
      element,
      'tabIndex',
      'below 0 (focus from code only) has no twin on native platforms: the element takes no focus.',
    );
  }
  return tabIndex >= 0;
}

/** What every vector shape draws with, on native platforms its only props. */
const PRESENTATION_PROPS = [
  'fill',
  'stroke',
  'color',
  'strokeWidth',
  'strokeLinecap',
  'strokeLinejoin',
  'strokeMiterlimit',
  'strokeDasharray',
  'strokeDashoffset',
  'fillRule',
  'opacity',
  'fillOpacity',
  'strokeOpacity',
  'transform',
] as const;

/** The props each shape takes on native platforms: its geometry and its presentation. */
const SHAPE_PROPS: { readonly [S in ShapeElement]: ReadonlySet<string> } = {
  path: new Set(['d', ...PRESENTATION_PROPS]),
  line: new Set(['x1', 'y1', 'x2', 'y2', ...PRESENTATION_PROPS]),
};

/**
 * The props of a vector shape its native host takes: its geometry and presentation props. A
 * shape has no node there, so no ref, events or accessibility: everything else is left out,
 * the web-only `className` and `asChild` with a warning.
 */
export function shapeProps(element: ShapeElement, props: object): Record<string, unknown> {
  const input = recordOf(props);
  const allowed = SHAPE_PROPS[element];
  const out: Record<string, unknown> = {};
  for (const key in input) {
    const entry = input[key];
    if (entry === undefined) {
      continue;
    }
    if (allowed.has(key)) {
      out[key] = entry;
      continue;
    }
    const webOnly = WEB_ONLY_PROPS.get(key);
    if (webOnly !== undefined) {
      warnOnce(element, key, webOnly);
    }
  }
  return out;
}
