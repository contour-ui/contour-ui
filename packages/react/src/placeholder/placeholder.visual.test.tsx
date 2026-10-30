import { Placeholder } from '../index.ts';
import { visualStates } from '../test-utils/visual.ts';

visualStates({
  default: {
    render: () => <Placeholder.Root>Styled placeholder</Placeholder.Root>,
  },
});
