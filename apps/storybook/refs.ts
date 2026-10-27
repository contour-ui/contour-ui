/**
 * Package Storybooks composed by this host. `port` must match the package's
 * `storybook` script; `name` is the subpath of its static build in the
 * deployed site (`/tokens`, `/headless`, …).
 */
export interface PackageStorybook {
  readonly name: string;
  readonly title: string;
  readonly port: number;
}

export const PACKAGE_STORYBOOKS: readonly PackageStorybook[] = [
  { name: 'tokens', title: 'Tokens', port: 6101 },
  { name: 'headless', title: 'Headless', port: 6102 },
  { name: 'kit', title: 'Kit', port: 6103 },
  { name: 'audio', title: 'Audio', port: 6104 },
  { name: 'fumadocs', title: 'Fumadocs', port: 6105 },
];
