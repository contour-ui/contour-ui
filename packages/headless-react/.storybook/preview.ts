import type { Preview } from '@storybook/react-vite';

const preview: Preview = {
  parameters: {
    // Accessibility violations fail story tests.
    a11y: { test: 'error' },
  },
};

export default preview;
