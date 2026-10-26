import { createContext, use, useRef } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { Portal } from '../index.ts';
import type { PortalProps } from '../index.ts';

const Theme = createContext('light');

/** Text from the context around the portal. */
function ThemeName(): ReactElement {
  return <p>{`Theme: ${use(Theme)}`}</p>;
}

/** A region, and a portal into it through a ref, rendered in the same commit. */
function Layer({ children }: { readonly children?: ReactNode }): ReactElement {
  const layerRef = useRef<HTMLElement>(null);
  return (
    <>
      <section aria-label="Layer" ref={layerRef} />
      <Portal container={layerRef}>{children}</Portal>
    </>
  );
}

/** A region shown on demand, and a portal into it through a ref that is empty until then. */
function LateLayer({ shown }: { readonly shown: boolean }): ReactElement {
  const layerRef = useRef<HTMLElement>(null);
  return (
    <>
      {shown ? <section aria-label="Late layer" ref={layerRef} /> : null}
      <Portal container={layerRef}>
        <p>In the late layer</p>
      </Portal>
    </>
  );
}

/** A portal with text, into the container a test gives. */
function Portalled({ container }: { readonly container: PortalProps['container'] }): ReactElement {
  return (
    <Portal container={container}>
      <p>In the container</p>
    </Portal>
  );
}

/** A container element of the test, outside the rendered tree. */
function containerElement(label: string): HTMLElement {
  const element = document.createElement('section');
  element.setAttribute('aria-label', label);
  document.body.append(element);
  return element;
}

const containers: HTMLElement[] = [];

afterEach(() => {
  for (const element of containers.splice(0)) {
    element.remove();
  }
  vi.restoreAllMocks();
});

/** Render the page of a test on the server, then hydrate its markup in the browser. */
function hydrate(page: ReactElement) {
  const html = renderToString(page);
  const container = document.createElement('div');
  container.innerHTML = html;
  document.body.append(container);
  containers.push(container);
  const errors: unknown[] = [];
  const root = hydrateRoot(container, page, {
    onRecoverableError: (error) => {
      errors.push(error);
    },
  });
  return { html, container, errors, root };
}

describe('Portal', () => {
  it('renders its children at the end of document.body, and removes them on unmount', async () => {
    const screen = await render(
      <div>
        <Portal>
          <p>Portalled</p>
        </Portal>
      </div>,
    );
    const text = screen.getByText('Portalled').element();

    expect(text.parentElement).toBe(document.body);
    expect(document.body.lastElementChild).toBe(text);
    expect(screen.container).not.toContainElement(text);
    expect(screen.container.innerHTML).toBe('<div></div>');

    await screen.unmount();
    expect(text.isConnected).toBe(false);
  });

  it('renders into a container element', async () => {
    const element = containerElement('Container');
    containers.push(element);
    const screen = await render(<Portalled container={element} />);

    expect(screen.getByText('In the container').element().parentElement).toBe(element);
  });

  it('renders into the element of a ref set in the same commit', async () => {
    const screen = await render(
      <Layer>
        <p>In the layer</p>
      </Layer>,
    );
    const layer = screen.getByRole('region', { name: 'Layer' });

    await expect.element(layer).toHaveTextContent('In the layer');
    expect(screen.getByText('In the layer').element().parentElement).toBe(layer.element());
  });

  it('renders nothing while the ref is empty, then into its element', async () => {
    const screen = await render(<LateLayer shown={false} />);
    expect(document.body).not.toHaveTextContent('In the late layer');

    await screen.rerender(<LateLayer shown />);
    await expect
      .element(screen.getByRole('region', { name: 'Late layer' }))
      .toHaveTextContent('In the late layer');
  });

  it('renders nothing while the container is null, then into the element', async () => {
    const element = containerElement('Container');
    containers.push(element);
    const screen = await render(<Portalled container={null} />);
    expect(document.body).not.toHaveTextContent('In the container');

    await screen.rerender(<Portalled container={element} />);
    expect(element).toHaveTextContent('In the container');
  });

  it('renders the children in place when disabled', async () => {
    const screen = await render(
      <section aria-label="Here">
        <Portal disabled>
          <p>In place</p>
        </Portal>
      </section>,
    );

    expect(screen.getByText('In place').element().parentElement).toBe(
      screen.getByRole('region', { name: 'Here' }).element(),
    );
  });

  it('passes context and React events through to the children', async () => {
    const onClick = vi.fn<() => void>();
    const screen = await render(
      <Theme value="dark">
        {/* oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- catches the click that bubbles up the React tree. */}
        <div onClick={onClick}>
          <Portal>
            <ThemeName />
            <button type="button">Inside</button>
          </Portal>
        </div>
      </Theme>,
    );

    await expect.element(screen.getByText('Theme: dark')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Inside' }));
    // In the DOM, the button is outside the `div`; in React, inside it.
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders nothing on the server, and its children once hydrated, without a mismatch', async () => {
    const consoleError = vi.spyOn(console, 'error');
    const page = (
      <main>
        <p>Page</p>
        <Portal>
          <p>Portalled</p>
        </Portal>
      </main>
    );
    const { html, container, errors, root } = hydrate(page);

    try {
      expect(html).toBe('<main><p>Page</p></main>');
      await expect
        .poll(() => [...document.body.children].some((child) => child.textContent === 'Portalled'))
        .toBe(true);
      expect(container.innerHTML).toBe('<main><p>Page</p></main>');
      expect(errors).toStrictEqual([]);
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      root.unmount();
    }
  });

  it('renders its children in place on the server when disabled, and hydrates them', async () => {
    const consoleError = vi.spyOn(console, 'error');
    const page = (
      <main>
        <Portal disabled>
          <p>In place</p>
        </Portal>
      </main>
    );
    const { html, container, errors, root } = hydrate(page);

    try {
      expect(html).toBe('<main><p>In place</p></main>');
      await expect.poll(() => container.querySelector('p')?.textContent).toBe('In place');
      expect(errors).toStrictEqual([]);
      expect(consoleError).not.toHaveBeenCalled();
    } finally {
      root.unmount();
    }
  });
});
