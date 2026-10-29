import { Popover as Headless } from '@contour-ui/headless-react';
import type { ReactElement } from 'react';

export type PopoverRootProps = Headless.RootProps;

/**
 * Popover root: renders no element. It runs the popover of `@contour-ui/headless-react` and gives its
 * parts the state. Put the positioner in a `Portal`.
 *
 * @example
 * <Popover.Root>
 *   <Popover.Trigger asChild>
 *     <Button variant="outline">Share</Button>
 *   </Popover.Trigger>
 *   <Portal>
 *     <Popover.Positioner>
 *       <Popover.Content>
 *         <Popover.Title>Share this page</Popover.Title>
 *         <Popover.Description>Anyone with the link can view it.</Popover.Description>
 *         <Popover.CloseTrigger />
 *       </Popover.Content>
 *     </Popover.Positioner>
 *   </Portal>
 * </Popover.Root>
 */
export function PopoverRoot(props: PopoverRootProps): ReactElement {
  return <Headless.Root {...props} />;
}
