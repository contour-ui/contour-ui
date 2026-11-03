/*
 * Id references on platforms without ids (spike S3 of D30). Native nodes have no `id`, and their
 * accessibility no "labelled by": an element that points at others by id (`aria-labelledby`,
 * `aria-describedby`) takes their text as its label or hint, and an element pointed at is read
 * with the one that points, not again on its own.
 *
 * Elements with an `id` publish their text after every render of theirs; elements that point
 * subscribe to the ids they name, each id on its own, so a change reaches only who reads it. The
 * order of mounting does not matter: an id nobody has published yet reads as no text, and fills
 * in when its element mounts.
 *
 * Known limits: a text that changes inside a component that does not render the element with
 * the id again is not seen (no native runtime reports a change of text); texts of several nodes
 * join with a space, where the web joins inline elements without one; and the registry is one per
 * runtime, so ids must be unique across its React roots (`useId` is, within one root).
 */
import { useCallback, useLayoutEffect, useMemo, useSyncExternalStore } from 'react';

import type { IdTexts } from './translate.ts';
import { NO_ID_TEXTS } from './translate.ts';

type Listener = () => void;

/** The texts of the elements with an id, and who points at them. */
export interface IdRegistry {
  /** Publish the text of the element `owner` renders with `id`. */
  readonly publish: (id: string, owner: object, text: string) => void;
  /** Take the text of `id` back, if `owner` published it. */
  readonly unpublish: (id: string, owner: object) => void;
  /** Count a reference to each of `ids` until the returned function is called. */
  readonly reference: (ids: readonly string[]) => () => void;
  /** The texts of `ids` in their order, joined with spaces, as accname does; `''` for none. */
  readonly textOf: (ids: readonly string[]) => string;
  /** Whether an element points at `id`. */
  readonly isReferenced: (id: string) => boolean;
  /** Call `listener` when the text of one of `ids`, or whether one is pointed at, changes. */
  readonly subscribe: (ids: readonly string[], listener: Listener) => () => void;
}

/** The ids of a space-separated list, as ARIA writes them. */
export function idsOf(list: string | undefined): readonly string[] {
  return list === undefined ? [] : list.split(/[ \t\n\r\f]+/u).filter((id) => id !== '');
}

/**
 * A registry of id references: the texts published by id, the references counted by id, and the
 * listeners of each id.
 */
export function createIdRegistry(): IdRegistry {
  const texts = new Map<string, { readonly owner: object; readonly text: string }>();
  const references = new Map<string, number>();
  const listeners = new Map<string, Set<Listener>>();

  const emit = (id: string): void => {
    const set = listeners.get(id);
    if (set === undefined) {
      return;
    }
    // The listeners as they are now: one may subscribe or leave while the others are called.
    const current = [...set];
    for (const listener of current) {
      listener();
    }
  };

  return {
    publish: (id, owner, text) => {
      const current = texts.get(id);
      if (current?.owner === owner && current.text === text) {
        return;
      }
      texts.set(id, { owner, text });
      emit(id);
    },
    unpublish: (id, owner) => {
      if (texts.get(id)?.owner === owner) {
        texts.delete(id);
        emit(id);
      }
    },
    reference: (ids) => {
      for (const id of ids) {
        const count = references.get(id) ?? 0;
        references.set(id, count + 1);
        if (count === 0) {
          emit(id);
        }
      }
      return () => {
        for (const id of ids) {
          const count = (references.get(id) ?? 1) - 1;
          if (count === 0) {
            references.delete(id);
            emit(id);
          } else {
            references.set(id, count);
          }
        }
      };
    },
    textOf: (ids) =>
      ids
        .map((id) => texts.get(id)?.text.trim() ?? '')
        .filter((text) => text !== '')
        .join(' '),
    isReferenced: (id) => (references.get(id) ?? 0) > 0,
    subscribe: (ids, listener) => {
      for (const id of ids) {
        let set = listeners.get(id);
        if (set === undefined) {
          set = new Set();
          listeners.set(id, set);
        }
        set.add(listener);
      }
      return () => {
        for (const id of ids) {
          const set = listeners.get(id);
          set?.delete(listener);
          if (set?.size === 0) {
            listeners.delete(id);
          }
        }
      };
    },
  };
}

/** What an element of the registry is: its id, and the ids it points at. */
export interface IdReferences {
  readonly id: string | undefined;
  readonly labelledBy: string | undefined;
  readonly describedBy: string | undefined;
}

const NO_SUBSCRIPTION = (): (() => void) => () => undefined;
/** The snapshot of an element of no ids: not pointed at, no label, no hint. */
const NO_SNAPSHOT = '0';
/** Separates the fields of a snapshot: a character no text of a label holds. */
const SEPARATOR = '\u0000';

/**
 * The id references of an element, live: the text of the elements it points at as they mount,
 * change and unmount, and whether another element points at it; and its own text published under
 * its id after every render (`readText`, read once the host has its node), by `owner`, an object
 * of the element's own for as long as it is mounted (its node ref). An element without ids pays
 * for no subscription.
 */
export function useIdTexts(
  registry: IdRegistry,
  owner: object,
  { id, labelledBy, describedBy }: IdReferences,
  readText: () => string,
): IdTexts {
  const labelIds = useMemo(() => idsOf(labelledBy), [labelledBy]);
  const hintIds = useMemo(() => idsOf(describedBy), [describedBy]);
  const watched = useMemo(
    () => (id === undefined ? [...labelIds, ...hintIds] : [id, ...labelIds, ...hintIds]),
    [id, labelIds, hintIds],
  );
  const subscribe = useCallback(
    (listener: Listener) =>
      watched.length === 0 ? NO_SUBSCRIPTION() : registry.subscribe(watched, listener),
    [registry, watched],
  );
  // One string, so that a snapshot compares by value: whether it is pointed at, the label, the
  // hint.
  const read = (): string =>
    watched.length === 0
      ? NO_SNAPSHOT
      : `${id !== undefined && registry.isReferenced(id) ? '1' : '0'}${registry.textOf(labelIds)}${SEPARATOR}${registry.textOf(hintIds)}`;
  const snapshot = useSyncExternalStore(subscribe, read, read);

  // After every render: the text may change with the children, under the same id.
  useLayoutEffect(() => {
    if (id !== undefined) {
      registry.publish(id, owner, readText());
    }
  });
  useLayoutEffect(
    () =>
      id === undefined
        ? undefined
        : () => {
            registry.unpublish(id, owner);
          },
    [registry, id, owner],
  );
  useLayoutEffect(() => {
    const ids = [...labelIds, ...hintIds];
    return ids.length === 0 ? undefined : registry.reference(ids);
  }, [registry, labelIds, hintIds]);

  if (snapshot === NO_SNAPSHOT) {
    return NO_ID_TEXTS;
  }
  const separator = snapshot.indexOf(SEPARATOR);
  const label = snapshot.slice(1, separator);
  const hint = snapshot.slice(separator + 1);
  return {
    label: label === '' ? undefined : label,
    hint: hint === '' ? undefined : hint,
    referenced: snapshot.startsWith('1'),
  };
}
