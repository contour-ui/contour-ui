import type { Meta, StoryObj } from '@storybook/react-vite';
import { useRef } from 'react';
import type { ReactElement } from 'react';
import { expect, screen } from 'storybook/test';

import { Portal } from '../index.ts';

const meta: Meta<typeof Portal> = {
  title: 'Headless/Portal',
  component: Portal,
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof meta>;

/** The children go to the end of `document.body`, outside the story's own element. */
export const Default: Story = {
  args: { children: <p>Rendered at the end of the body</p> },
  play: async ({ canvasElement }) => {
    const text = screen.getByText('Rendered at the end of the body');

    await expect(text.parentElement).toBe(document.body);
    await expect(canvasElement).not.toContainElement(text);
  },
};

/** A region, and a portal into it through a ref: the text comes after the region's own. */
function Layer(): ReactElement {
  const layerRef = useRef<HTMLElement>(null);
  return (
    <>
      <section ref={layerRef} aria-label="Layer" style={{ padding: 8, border: '1px dashed' }}>
        <p style={{ margin: 0 }}>The layer</p>
      </section>
      <p>Before the portal</p>
      <Portal container={layerRef}>
        <p style={{ margin: 0 }}>Rendered in the layer</p>
      </Portal>
      <p>After the portal</p>
    </>
  );
}

/** `container` takes an element, or a ref to one, even one rendered in the same commit. */
export const Container: Story = {
  render: () => <Layer />,
  play: async ({ canvas }) => {
    const layer = canvas.getByRole('region', { name: 'Layer' });

    await expect(canvas.getByText('Rendered in the layer').parentElement).toBe(layer);
  },
};

/** `disabled` renders the children in place, as if there were no portal. */
export const Disabled: Story = {
  args: { disabled: true, children: <p>Rendered in place</p> },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Rendered in place')).toBeInTheDocument();
  },
};
