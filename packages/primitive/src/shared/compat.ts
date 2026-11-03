/*
 * The compatibility table of the element layer: what shared code may write, and what the native
 * backends make of it. Data, not code: the types of the elements, the diagnostics of the native
 * backends, the attribute check of the shared sources (`vp run boundaries`) and the docs read the
 * same table, so they cannot drift apart. The web backend passes everything through as it is.
 */
import type { SharedElement } from './elements.ts';

/**
 * The roles of React Native's and Soundor's accessibility (`accessibilityRole`), as Soundor 0.15
 * knows them. Soundor throws on any other.
 */
export type NativeRole =
  | 'none'
  | 'text'
  | 'image'
  | 'button'
  | 'link'
  | 'adjustable'
  | 'checkbox'
  | 'switch'
  | 'togglebutton'
  | 'radio'
  | 'radiogroup'
  | 'progressbar'
  | 'search'
  | 'combobox'
  | 'menu'
  | 'menubar'
  | 'menuitem'
  | 'scrollbar'
  | 'spinbutton'
  | 'tab'
  | 'tablist'
  | 'header'
  | 'summary'
  | 'keyboardkey'
  | 'timer'
  | 'toolbar'
  | 'alert'
  | 'dialog';

/**
 * The ARIA roles shared code may write, each with its twin on native platforms: a
 * {@link NativeRole}, or `group`, an accessible node without a role, which native platforms read
 * as a group. A role without a twin (`listbox`, `option`, `tabpanel`…) is left out, so shared code
 * cannot write it: Soundor would throw on it.
 */
export interface RoleTwins {
  readonly alert: 'alert';
  readonly button: 'button';
  readonly checkbox: 'checkbox';
  readonly combobox: 'combobox';
  readonly dialog: 'dialog';
  readonly group: 'group';
  readonly heading: 'header';
  readonly img: 'image';
  readonly link: 'link';
  readonly menu: 'menu';
  readonly menubar: 'menubar';
  readonly menuitem: 'menuitem';
  readonly none: 'none';
  readonly presentation: 'none';
  readonly progressbar: 'progressbar';
  readonly radio: 'radio';
  readonly radiogroup: 'radiogroup';
  readonly scrollbar: 'scrollbar';
  readonly search: 'search';
  readonly slider: 'adjustable';
  readonly spinbutton: 'spinbutton';
  readonly switch: 'switch';
  readonly tab: 'tab';
  readonly tablist: 'tablist';
  readonly timer: 'timer';
  readonly toolbar: 'toolbar';
}

/** {@link RoleTwins} as data, for the native backends and the checks. */
export const ROLES: RoleTwins = {
  alert: 'alert',
  button: 'button',
  checkbox: 'checkbox',
  combobox: 'combobox',
  dialog: 'dialog',
  group: 'group',
  heading: 'header',
  img: 'image',
  link: 'link',
  menu: 'menu',
  menubar: 'menubar',
  menuitem: 'menuitem',
  none: 'none',
  presentation: 'none',
  progressbar: 'progressbar',
  radio: 'radio',
  radiogroup: 'radiogroup',
  scrollbar: 'scrollbar',
  search: 'search',
  slider: 'adjustable',
  spinbutton: 'spinbutton',
  switch: 'switch',
  tab: 'tab',
  tablist: 'tablist',
  timer: 'timer',
  toolbar: 'toolbar',
};

/** An ARIA role shared code may write: a key of {@link ROLES}. */
export type SharedRole = keyof RoleTwins;

/**
 * The roles each element may take: the pairs (element, role) that mean the same on every
 * platform. Boxes take the roles of containers and of widgets drawn from boxes, the pressable
 * those of things that are pressed, the `svg` of a dial those of an image or a range, a text leaf
 * that of a heading. Shapes and the form value take none. Shared code is held to these by the
 * type check of every platform build; the native backends check `role` against {@link ROLES}.
 */
export interface ElementRoles {
  readonly div:
    | 'alert'
    | 'dialog'
    | 'group'
    | 'img'
    | 'menu'
    | 'menubar'
    | 'none'
    | 'presentation'
    | 'progressbar'
    | 'radiogroup'
    | 'search'
    | 'slider'
    | 'spinbutton'
    | 'tablist'
    | 'timer'
    | 'toolbar';
  readonly span: 'group' | 'img' | 'none' | 'presentation';
  readonly text: 'heading' | 'none' | 'presentation';
  readonly button: 'button' | 'checkbox' | 'link' | 'menuitem' | 'radio' | 'switch' | 'tab';
  readonly svg: 'img' | 'none' | 'presentation' | 'progressbar' | 'slider' | 'spinbutton';
  readonly path: never;
  readonly line: never;
  readonly formValue: never;
}

/** The roles `Primitive.<element>` takes in shared code. */
export type ElementRole<E extends SharedElement> = ElementRoles[E];

/**
 * What the value of an ARIA attribute is: text, a number, a boolean (`true` or `'true'`), a
 * tristate (a boolean or `'mixed'`), ids separated by spaces, or an orientation.
 */
export type AriaValueKind = 'string' | 'number' | 'boolean' | 'tristate' | 'idrefs' | 'orientation';

/**
 * What an ARIA attribute becomes on native platforms:
 *
 * - `label`: the accessible name (`accessibilityLabel`); `aria-labelledby` wins over it, as in
 *   accname;
 * - `labelledby` and `describedby`: the text of the elements of those ids names or describes the
 *   element (`accessibilityLabel`, `accessibilityHint`), and those elements are not read again
 *   on their own;
 * - `hidden`: the element is not perceived on its own (`accessible={false}`);
 * - `state`: a field of `accessibilityState`;
 * - `value`: a field of `accessibilityValue`;
 * - `dropped`: no twin. The web reads it; native platforms leave it out.
 */
export type AriaNativeKind =
  | 'label'
  | 'labelledby'
  | 'describedby'
  | 'hidden'
  | 'state'
  | 'value'
  | 'dropped';

/**
 * The ARIA attributes shared code may write, with the kind of their value: the types of the
 * attributes, and the keys of {@link ARIA_ATTRIBUTES}.
 */
export interface AriaKinds {
  readonly 'aria-label': 'string';
  readonly 'aria-labelledby': 'idrefs';
  readonly 'aria-describedby': 'idrefs';
  readonly 'aria-hidden': 'boolean';
  readonly 'aria-disabled': 'boolean';
  readonly 'aria-checked': 'tristate';
  readonly 'aria-selected': 'boolean';
  readonly 'aria-expanded': 'boolean';
  readonly 'aria-busy': 'boolean';
  readonly 'aria-valuemin': 'number';
  readonly 'aria-valuemax': 'number';
  readonly 'aria-valuenow': 'number';
  readonly 'aria-valuetext': 'string';
  readonly 'aria-readonly': 'boolean';
  readonly 'aria-orientation': 'orientation';
  readonly 'aria-controls': 'idrefs';
  readonly 'aria-pressed': 'tristate';
}

/** An ARIA attribute shared code may write. */
export type SharedAriaAttribute = keyof AriaKinds;

/** An ARIA attribute of the table: the kind of its value and what native platforms make of it. */
export interface AriaAttribute<Kind extends AriaValueKind = AriaValueKind> {
  readonly value: Kind;
  readonly native: AriaNativeKind;
}

/**
 * The ARIA attributes shared code may write, as data: what native platforms make of each.
 * TypeScript checks no attribute with a dash in JSX (`aria-foo` compiles anywhere), so
 * `vp run boundaries` checks the shared sources against this table, and the native backends warn
 * in development about any other attribute.
 */
export const ARIA_ATTRIBUTES: { readonly [A in SharedAriaAttribute]: AriaAttribute<AriaKinds[A]> } =
  {
    'aria-label': { value: 'string', native: 'label' },
    'aria-labelledby': { value: 'idrefs', native: 'labelledby' },
    'aria-describedby': { value: 'idrefs', native: 'describedby' },
    'aria-hidden': { value: 'boolean', native: 'hidden' },
    'aria-disabled': { value: 'boolean', native: 'state' },
    'aria-checked': { value: 'tristate', native: 'state' },
    'aria-selected': { value: 'boolean', native: 'state' },
    'aria-expanded': { value: 'boolean', native: 'state' },
    'aria-busy': { value: 'boolean', native: 'state' },
    'aria-valuemin': { value: 'number', native: 'value' },
    'aria-valuemax': { value: 'number', native: 'value' },
    'aria-valuenow': { value: 'number', native: 'value' },
    'aria-valuetext': { value: 'string', native: 'value' },
    'aria-readonly': { value: 'boolean', native: 'dropped' },
    'aria-orientation': { value: 'orientation', native: 'dropped' },
    'aria-controls': { value: 'idrefs', native: 'dropped' },
    'aria-pressed': { value: 'tristate', native: 'dropped' },
  };

type Booleanish = boolean | 'true' | 'false';

/** The type of each kind of value. */
interface AriaValueTypes {
  readonly string: string;
  readonly number: number;
  readonly boolean: Booleanish;
  readonly tristate: Booleanish | 'mixed';
  readonly idrefs: string;
  readonly orientation: 'horizontal' | 'vertical';
}

/** The ARIA attributes of shared code, typed from the table. */
export type SharedAriaProps = {
  readonly [A in SharedAriaAttribute]?: AriaValueTypes[AriaKinds[A]] | undefined;
};

/**
 * The event props every node element takes on every backend, by name. Their event types are the
 * backend's (`PrimitivePointerEvent`…), and shared code reads only the fields both have.
 * Shapes take none; the pressable adds `onPress`.
 */
export type SharedEvent =
  | 'onPointerDown'
  | 'onPointerMove'
  | 'onPointerUp'
  | 'onPointerCancel'
  | 'onPointerEnter'
  | 'onPointerLeave'
  | 'onContextMenu'
  | 'onKeyDown'
  | 'onKeyUp'
  | 'onFocus'
  | 'onBlur';

/** {@link SharedEvent} as data. */
export const SHARED_EVENTS: readonly SharedEvent[] = [
  'onPointerDown',
  'onPointerMove',
  'onPointerUp',
  'onPointerCancel',
  'onPointerEnter',
  'onPointerLeave',
  'onContextMenu',
  'onKeyDown',
  'onKeyUp',
  'onFocus',
  'onBlur',
];
