import { describe, expect, it } from 'vite-plus/test';
import { render } from 'vitest-browser-react';

import { MdxPre } from './pre.tsx';

import '@contour-ui/tokens/tokens.css';
import '../styles.css';
import '@contour-ui/react/styles.css';

/** Highlighted code as Shiki's css-variables theme renders a line of it. */
const CODE = (
  <code>
    <span className="line">
      <span style={{ color: 'var(--shiki-token-keyword)' }}>const</span> gain = 0.5;
    </span>
  </code>
);

describe('MdxPre', () => {
  it('renders a code block with the title and the copy button in the header', async () => {
    const screen = await render(
      <MdxPre title="gain.ts" className="shiki css-variables" style={{ color: 'red' }} tabIndex={0}>
        {CODE}
      </MdxPre>,
    );
    const figure = screen.getByRole('figure', { name: 'gain.ts' });
    // The title names the figure once it has registered, after the first render.
    await expect.element(figure).toHaveClass('contour-code-block', { exact: true });
    const header = figure.element().querySelector('figcaption');
    const pre = figure.element().querySelector('pre');

    expect(header).toHaveClass('contour-code-block__header');
    expect(header?.textContent).toContain('gain.ts');
    expect(header?.querySelector('button')).toHaveAccessibleName('Copy code');
    await expect.element(screen.getByText('gain.ts')).toBeVisible();
    await expect.element(screen.getByRole('button', { name: 'Copy code' })).toBeVisible();
    // The `pre` keeps Shiki's class and style and the other props, but not the title.
    expect(pre).toHaveClass('shiki css-variables', { exact: true });
    expect(pre).toHaveAttribute('style', 'color: red;');
    expect(pre).toHaveAttribute('tabindex', '0');
    expect(pre).not.toHaveAttribute('title');
    expect(pre?.parentElement).toHaveClass('contour-code-block__content');
    expect(pre?.textContent).toBe('const gain = 0.5;');
  });

  it('puts the copy button at the top of a block without a title', async () => {
    const screen = await render(<MdxPre title="">{CODE}</MdxPre>);
    const figure = screen.getByRole('figure').element();

    expect(figure.querySelector('figcaption')).toBeNull();
    expect(figure.querySelector(':scope > button')).toHaveAccessibleName('Copy code');
  });

  it('leaves the copy button out for `noCopy`', async () => {
    const screen = await render(
      <MdxPre title="gain.ts" allowCopy="false">
        {CODE}
      </MdxPre>,
    );
    const figure = screen.getByRole('figure', { name: 'gain.ts' });
    await expect.element(figure).toBeInTheDocument();

    expect(figure.element().querySelector('button')).toBeNull();
  });

  it('starts the line numbers where the meta says', async () => {
    const screen = await render(
      <MdxPre data-line-numbers data-line-numbers-start={12} style={{ color: 'red' }}>
        {CODE}
      </MdxPre>,
    );
    const pre = screen.getByRole('figure').element().querySelector('pre');

    expect(pre).toHaveAttribute('data-line-numbers', 'true');
    expect(pre).toHaveAttribute('data-line-numbers-start', '12');
    // The code block numbers the lines with this counter, so it starts one below the first number.
    expect(pre?.style.color).toBe('red');
    expect(pre?.style.counterReset).toBe('contour-code-block-line 11');
  });

  it('drops the language icon of `rehypeCode`: the header shows the title only', async () => {
    const screen = await render(
      <MdxPre title="gain.ts" icon={'<svg viewBox="0 0 32 32"><path d="M1 2L3 4" /></svg>'}>
        {CODE}
      </MdxPre>,
    );
    const figure = screen.getByRole('figure', { name: 'gain.ts' });
    await expect.element(figure).toBeInTheDocument();

    expect(figure.element().querySelector('pre')).not.toHaveAttribute('icon');
    expect(figure.element().innerHTML).not.toContain('M1 2L3 4');
  });

  it('leaves the counter alone without a first line number', async () => {
    const screen = await render(<MdxPre data-line-numbers>{CODE}</MdxPre>);
    const pre = screen.getByRole('figure').element().querySelector('pre');

    expect(pre?.style.counterReset).toBe('');
  });
});
