import { describe, expect, it } from 'vite-plus/test';
import { render } from 'vitest-browser-react';

import { Callout } from './callout.tsx';
import type { CalloutProps } from './callout.tsx';

describe('Callout', () => {
  it("renders Kit's alert with the title, then the content", async () => {
    const screen = await render(
      <Callout title="Pre-release" className="custom" data-testid="callout">
        <p>The packages are not on npm yet.</p>
        <p>More arrive section by section.</p>
      </Callout>,
    );
    const root = screen.getByTestId('callout');
    const title = screen.getByText('Pre-release').element();
    const description = screen
      .getByText('The packages are not on npm yet.')
      .element().parentElement;

    await expect.element(root).toHaveClass('contour-alert custom', { exact: true });
    await expect.element(root).toHaveAttribute('data-status', 'info');
    expect(title).toHaveClass('contour-alert__title');
    expect(description).toHaveClass('contour-alert__description');
    expect(description?.querySelectorAll('p')).toHaveLength(2);
    // The status icon comes first, in the indicator.
    expect(root.element().firstElementChild).toHaveClass('contour-alert__indicator');
    expect(root.element().firstElementChild?.querySelector('svg')).not.toBeNull();
  });

  it("maps the types of Fumadocs' callout to the alert statuses", async () => {
    const statuses: ReadonlyArray<readonly [NonNullable<CalloutProps['type']>, string]> = [
      ['info', 'info'],
      ['warn', 'warning'],
      ['warning', 'warning'],
      ['error', 'danger'],
      ['success', 'success'],
      ['idea', 'neutral'],
    ];
    const screen = await render(
      <>
        {statuses.map(([type]) => (
          <Callout key={type} type={type} data-testid={type}>
            {type}
          </Callout>
        ))}
      </>,
    );

    for (const [type, status] of statuses) {
      expect(screen.getByTestId(type).element()).toHaveAttribute('data-status', status);
    }
  });

  it("falls back to the alert's default for an unknown type", async () => {
    // MDX passes whatever the page says.
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    const type = 'tip' as CalloutProps['type'];
    const screen = await render(
      <Callout type={type} data-testid="callout">
        Text
      </Callout>,
    );

    await expect.element(screen.getByTestId('callout')).toHaveAttribute('data-status', 'info');
  });

  it('has no title element without a title, and takes an icon in place of the status one', async () => {
    const screen = await render(
      <Callout icon={<span data-testid="icon">★</span>} data-testid="callout">
        Text
      </Callout>,
    );
    const root = screen.getByTestId('callout');
    await expect.element(root).toBeInTheDocument();
    const indicator = root.element().querySelector('.contour-alert__indicator');

    expect(root.element().querySelector('.contour-alert__title')).toBeNull();
    expect(indicator?.querySelector('[data-testid="icon"]')).not.toBeNull();
    expect(indicator?.querySelector('svg')).toBeNull();
  });
});
