import { ThemeToggle } from '../index.ts';
import { visualStates } from '../test-utils/visual.tsx';

visualStates({
  // The button that switches between the light and the dark theme: the icon of the other one.
  default: { render: () => <ThemeToggle /> },
  // `mode="light-dark-system"`: the light, the dark and the system theme, the choice checked.
  'light-dark-system': { render: () => <ThemeToggle mode="light-dark-system" /> },
});
