import { describe, expect, it } from 'vite-plus/test';

import { lucideIcon, lucideNodes } from '../scripts/build-icons.ts';
import { normalizePath, shapeToPath } from '../scripts/path-data.ts';

/** Absolute `M`, `L`, `C`, `Q`, `Z` commands with their numbers, nothing else. */
const NORMALIZED = /^(?:[CLMQZ][\d .-]*)+$/u;

describe('shapeToPath', () => {
  it('starts a circle at its rightmost point, with four clockwise quarter arcs', () => {
    expect(shapeToPath('circle', { cx: '12', cy: '12', r: '10' }, 'test')).toBe(
      'M22 12A10 10 0 0 1 12 22A10 10 0 0 1 2 12A10 10 0 0 1 12 2A10 10 0 0 1 22 12Z',
    );
  });

  it('draws an ellipse with its own radii', () => {
    expect(shapeToPath('ellipse', { cx: '12', cy: '5', rx: '9', ry: '3' }, 'test')).toBe(
      'M21 5A9 3 0 0 1 12 8A9 3 0 0 1 3 5A9 3 0 0 1 12 2A9 3 0 0 1 21 5Z',
    );
  });

  it('rounds rect corners, taking a missing ry from rx', () => {
    expect(
      shapeToPath('rect', { x: '2', y: '3', width: '20', height: '14', rx: '2' }, 'test'),
    ).toBe('M4 3H20A2 2 0 0 1 22 5V15A2 2 0 0 1 20 17H4A2 2 0 0 1 2 15V5A2 2 0 0 1 4 3Z');
  });

  it('clamps rect corners to half the side and leaves out the empty sides', () => {
    expect(shapeToPath('rect', { width: '4', height: '10', rx: '5' }, 'test')).toBe(
      'M2 0A2 5 0 0 1 4 5A2 5 0 0 1 2 10A2 5 0 0 1 0 5A2 5 0 0 1 2 0Z',
    );
  });

  it('draws a rect without rx with square corners', () => {
    expect(shapeToPath('rect', { x: '1', y: '2', width: '3', height: '4' }, 'test')).toBe(
      'M1 2H4V6H1Z',
    );
  });

  it('turns line, polyline and polygon into straight segments', () => {
    expect(shapeToPath('line', { x1: '4', y1: '9', x2: '20', y2: '9' }, 'test')).toBe('M4 9L20 9');
    expect(shapeToPath('polyline', { points: '15,9 18,9 18,11' }, 'test')).toBe('M15 9L18 9L18 11');
    expect(shapeToPath('polygon', { points: '12 2 19 21 5 21' }, 'test')).toBe('M12 2L19 21L5 21Z');
  });

  it('passes path data through', () => {
    expect(shapeToPath('path', { d: 'm21 21-4.34-4.34' }, 'test')).toBe('m21 21-4.34-4.34');
  });

  it('fails on what it cannot convert instead of dropping it', () => {
    expect(() => shapeToPath('text', {}, 'test')).toThrow('<text> is not supported');
    expect(() => shapeToPath('circle', { r: '10', transform: 'scale(2)' }, 'test')).toThrow(
      'unsupported attribute transform',
    );
    expect(() => shapeToPath('circle', { r: '10px' }, 'test')).toThrow('unitless number');
    expect(() => shapeToPath('circle', { r: '0' }, 'test')).toThrow('r must be positive');
    expect(() => shapeToPath('polyline', { points: '1 2 3' }, 'test')).toThrow('x,y pairs');
  });
});

describe('normalizePath', () => {
  it('makes commands absolute and turns H and V into L', () => {
    expect(normalizePath('m4 16h10v-2H4z', 'test')).toStrictEqual({
      d: 'M4 16L14 16L14 14L4 14Z',
      commands: [0, 4, 16, 1, 14, 16, 1, 14, 14, 1, 4, 14, 4],
    });
  });

  it('expands S and T into full curves with reflected control points', () => {
    expect(normalizePath('M0 0C1 2 3 2 4 0S7-2 8 0', 'test').d).toBe(
      'M0 0C1 2 3 2 4 0C5 -2 7 -2 8 0',
    );
    expect(normalizePath('M0 0Q2 2 4 0T8 0', 'test').d).toBe('M0 0Q2 2 4 0Q6 -2 8 0');
  });

  it('replaces arcs with cubic curves, one per quarter turn', () => {
    expect(normalizePath('M10 0A10 10 0 0 1 0 10', 'test').d).toBe('M10 0C10 5.523 5.523 10 0 10');
    expect(normalizePath('M22 12A10 10 0 0 1 2 12', 'test').d).toBe(
      'M22 12C22 17.523 17.523 22 12 22C6.477 22 2 17.523 2 12',
    );
  });

  it('rounds coordinates to 3 decimals, without -0', () => {
    expect(normalizePath('M0.12345 1.00049L2.9996-0.0004', 'test')).toStrictEqual({
      d: 'M0.123 1L3 0',
      commands: [0, 0.123, 1, 1, 3, 0],
    });
  });

  it('fails on invalid path data', () => {
    expect(() => normalizePath('M0 0L1', 'test')).toThrow('test: SvgPath');
    expect(() => normalizePath('L1 2', 'test')).toThrow('test: SvgPath');
    expect(() => normalizePath('', 'test')).toThrow('empty path data');
  });
});

describe('Lucide', () => {
  // Any icon can be added to scripts/icon-list.ts: every shape in lucide-static converts.
  it('every icon in lucide-static normalizes to M, L, C, Q and Z', () => {
    const nodes = lucideNodes();
    const names = Object.keys(nodes);
    const failing = names.filter((name) =>
      lucideIcon(nodes, name).paths.some(
        (path, index) => !NORMALIZED.test(normalizePath(path.d, `${name} ${index}`).d),
      ),
    );
    expect(names.length).toBeGreaterThan(1000);
    expect(failing).toStrictEqual([]);
  });
});
