import { useRouter } from 'fumadocs-core/framework';
import type { Router } from 'fumadocs-core/framework';
import type { Folder, Root } from 'fumadocs-core/page-tree';
import { createRef, useImperativeHandle } from 'react';
import type { ReactElement, Ref } from 'react';
import { afterEach, describe, expect, it } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';

import { DocsLayout, DocsPage } from '../index.ts';
import { renderDocs } from '../test-utils/render.tsx';
import { PageTree } from './page-tree.tsx';

import '@contour-ui/tokens/tokens.css';
import '../styles.css';
import '@contour-ui/react/styles.css';

/** The folder Forms of the Kit section, without its index page: two pages. */
const FORMS_PAGES: Folder = {
  $id: 'kit/forms',
  type: 'folder',
  name: 'Forms',
  children: [
    {
      $id: 'kit/forms/checkbox.mdx',
      type: 'page',
      name: 'Checkbox',
      url: '/docs/kit/forms/checkbox',
    },
    { $id: 'kit/forms/select.mdx', type: 'page', name: 'Select', url: '/docs/kit/forms/select' },
  ],
};

/** The folder Forms, with its index page. */
const FORMS: Folder = {
  ...FORMS_PAGES,
  index: { $id: 'kit/forms/index.mdx', type: 'page', name: 'Forms', url: '/docs/kit/forms' },
};

/** The section Kit: a page, then the folder `forms`. */
function kit(forms: Folder = FORMS): Folder {
  return {
    $id: 'kit',
    type: 'folder',
    name: 'Kit',
    root: true,
    children: [
      { $id: 'kit/button.mdx', type: 'page', name: 'Button', url: '/docs/kit/button' },
      forms,
    ],
  };
}

/** The page tree of the section Kit. */
const tree: Root = { $id: 'root', type: 'root', name: 'Docs', children: [kit()] };

const docs = page.getByRole('navigation', { name: 'Docs' });
const toggle = docs.getByRole('button', { name: 'Forms pages' });

afterEach(async () => {
  localStorage.clear();
  // The default viewport of the browser tests.
  await page.viewport(414, 896);
});

describe('a folder of the page tree', () => {
  it('is closed unless it holds the page: its name links to its index page, its toggle opens it', async () => {
    await renderDocs(<PageTree root={kit()} url="/docs/kit/button" />);

    await expect
      .element(docs.getByRole('link', { name: 'Forms' }))
      .toHaveAttribute('href', '/docs/kit/forms');
    await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect.element(docs.getByRole('link', { name: 'Checkbox' })).not.toBeInTheDocument();

    await userEvent.click(toggle);
    await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');
    const forms = docs.getByRole('list', { name: 'Forms' });
    await expect.element(forms.getByRole('link', { name: 'Checkbox' })).toBeVisible();
    await expect.element(forms.getByRole('link', { name: 'Select' })).toBeVisible();

    await userEvent.click(toggle);
    await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect.element(docs.getByRole('link', { name: 'Checkbox' })).not.toBeInTheDocument();
  });

  it('starts open on a page of it, its index page marked there', async () => {
    await renderDocs(<PageTree root={kit()} url="/docs/kit/forms" />);

    await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect
      .element(docs.getByRole('link', { name: 'Forms' }))
      .toHaveAttribute('aria-current', 'page');
    await expect.element(docs.getByRole('link', { name: 'Checkbox' })).toBeVisible();
  });

  it('starts open with defaultOpen', async () => {
    await renderDocs(
      <PageTree root={kit({ ...FORMS, defaultOpen: true })} url="/docs/kit/button" />,
    );

    await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect.element(docs.getByRole('link', { name: 'Select' })).toBeVisible();
  });

  it('makes the whole row its toggle without an index page', async () => {
    await renderDocs(<PageTree root={kit(FORMS_PAGES)} url="/docs/kit/button" />);
    const row = docs.getByRole('button', { name: 'Forms', exact: true });

    await expect.element(row).toHaveAttribute('aria-expanded', 'false');
    await expect.element(docs.getByRole('link', { name: 'Forms' })).not.toBeInTheDocument();
    await userEvent.click(row);
    await expect
      .element(docs.getByRole('list', { name: 'Forms' }).getByRole('link', { name: 'Checkbox' }))
      .toBeVisible();
  });

  it('stays open under its name with "collapsible": false, its index page first', async () => {
    await renderDocs(
      <PageTree root={kit({ ...FORMS, collapsible: false })} url="/docs/kit/button" />,
    );
    const forms = docs.getByRole('list', { name: 'Forms' });

    await expect.element(forms.getByRole('link', { name: 'Forms' })).toBeVisible();
    await expect.element(forms.getByRole('link', { name: 'Checkbox' })).toBeVisible();
    await expect.element(docs.getByRole('button')).not.toBeInTheDocument();
  });
});

/** The layout of `tree`, and the router of the framework in `router`. */
function Docs({ router }: { readonly router: Ref<Router> }): ReactElement {
  const framework = useRouter();
  useImperativeHandle(router, () => framework, [framework]);
  return (
    <DocsLayout tree={tree}>
      <DocsPage title="Page" toc={[]}>
        <p>Content</p>
      </DocsPage>
    </DocsLayout>
  );
}

describe('a folder in the sidebar', () => {
  it('opens as the reader goes to one of its pages, and stays as they left it otherwise', async () => {
    await page.viewport(1280, 800);
    const router = createRef<Router>();
    await renderDocs(<Docs router={router} />, { pathname: '/docs/kit/button' });
    await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');

    await router.current?.push('/docs/kit/forms/checkbox');
    await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect
      .element(docs.getByRole('link', { name: 'Checkbox' }))
      .toHaveAttribute('aria-current', 'page');

    // Closed by the reader, it stays closed on another page of it, and outside it.
    await userEvent.click(toggle);
    await router.current?.push('/docs/kit/forms/select');
    await expect.element(docs.getByRole('link', { name: 'Forms' })).toBeVisible();
    await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');
    await router.current?.push('/docs/kit/button');
    await expect
      .element(docs.getByRole('link', { name: 'Button' }))
      .toHaveAttribute('aria-current', 'page');
    await expect.element(toggle).toHaveAttribute('aria-expanded', 'false');

    // Back into it from elsewhere, it opens.
    await router.current?.push('/docs/kit/forms');
    await expect.element(toggle).toHaveAttribute('aria-expanded', 'true');
  });
});
