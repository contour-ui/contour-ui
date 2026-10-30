import { loader } from 'fumadocs-core/source';
import type { Folder, Node, Root } from 'fumadocs-core/page-tree';
import { defineDocs } from 'fumadocs-mdx/macro';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: { async: true },
});

/** A component with headless parts is a folder (`components/dialog/`): its page and `headless`. */
const COMPONENT_FOLDER = /^components\/[^/]+$/u;

/**
 * Shows a component folder as its index page alone: the sidebar lists Dialog once, and its
 * other pages (`/docs/components/dialog/headless`) are tabs of that page.
 */
function collapseComponents(nodes: Node[]): Node[] {
  return nodes.map((node) => {
    if (node.type !== 'folder') {
      return node;
    }
    if (node.index !== undefined && COMPONENT_FOLDER.test(node.$ref?.folder ?? '')) {
      return node.index;
    }
    return { ...node, children: collapseComponents(node.children) } satisfies Folder;
  });
}

/**
 * Lists the index page of each section as "Overview": its title is the section's name, which the
 * section switcher already shows above the tree.
 */
function nameOverviews(nodes: Node[]): Node[] {
  return nodes.map((node) => {
    if (node.type !== 'folder' || node.root !== true) {
      return node;
    }
    // A section lists its index page among its children (`"pages": ["index", …]`).
    const url = `/docs/${node.$ref?.folder ?? ''}`;
    const children = node.children.map((child) =>
      child.type === 'page' && child.url === url ? { ...child, name: 'Overview' } : child,
    );
    return { ...node, children } satisfies Folder;
  });
}

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: '/docs',
  pageTree: {
    transformers: [
      {
        root: (node: Root): Root => ({
          ...node,
          children: nameOverviews(collapseComponents(node.children)),
        }),
      },
    ],
  },
});
