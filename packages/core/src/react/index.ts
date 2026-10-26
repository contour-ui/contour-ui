/*
 * `@contour-ui/core/react`: the only React-aware entry of core (React is an
 * optional peer). Hooks only, without `react-dom`: every renderer adapter shares them.
 */

export { useControllableState } from './use-controllable-state.ts';
export type {
  UseControllableStateProps,
  UseControllableStateReturn,
  ValueChangeDetails,
} from './use-controllable-state.ts';
export { useMachine } from './use-machine.ts';
