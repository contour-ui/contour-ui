/*
 * Collections: immutable lists of items that list components navigate (Listbox, later Select,
 * Combobox, Menu). Plain data and pure functions; states/ and interactions/ may both use them.
 */
export { createListCollection } from './list-collection.ts';
export type {
  ListCollection,
  ListCollectionGroup,
  ListCollectionOptions,
  ListSearchOptions,
  ListStepOptions,
} from './list-collection.ts';
