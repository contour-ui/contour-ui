import { describe, expect, it } from 'vite-plus/test';

import { drawIcon } from './draw-icon.ts';
import type { DrawIconOptions, IconContext } from './draw-icon.ts';
import { PathCommand } from './icon-data.ts';
import type { IconData } from './icon-data.ts';
import { githubIcon, searchIcon } from './index.ts';

const { M, L, C, Q, Z } = PathCommand;

interface Paint {
  readonly operation: 'stroke' | 'fill';
  /** The painted path in device coordinates, as path data. */
  readonly path: string;
  readonly style: unknown;
  /** Line width in device pixels: `lineWidth` times the current scale. */
  readonly lineWidth: number;
  readonly lineCap: string;
  readonly lineJoin: string;
}

interface State {
  readonly transform: Transform;
  readonly lineWidth: number;
  readonly lineCap: string;
  readonly lineJoin: string;
  readonly strokeStyle: unknown;
  readonly fillStyle: unknown;
}

/** Scale, then translation: device = user * scale + offset. */
interface Transform {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

const format = (value: number): string => String(Number(value.toFixed(3)));

/**
 * Canvas 2D stand-in: keeps the transform and the styles with save / restore, like
 * a canvas, and records every stroke and fill with its path in device coordinates.
 * Only uniform scaling is tracked (drawIcon scales both axes alike).
 */
class RecordingContext implements IconContext {
  lineWidth = 1;
  lineCap = 'butt';
  lineJoin = 'miter';
  strokeStyle: unknown = '#000';
  fillStyle: unknown = '#000';
  readonly paints: Paint[] = [];
  #transform: Transform = { scale: 1, x: 0, y: 0 };
  readonly #saved: State[] = [];
  #path = '';

  /** Number of `save()` calls not restored yet. */
  get depth(): number {
    return this.#saved.length;
  }

  #point(x: number, y: number): string {
    const { scale, x: offsetX, y: offsetY } = this.#transform;
    return `${format(x * scale + offsetX)} ${format(y * scale + offsetY)}`;
  }

  #paint(operation: Paint['operation'], style: unknown): void {
    const { lineWidth, lineCap, lineJoin } = this;
    const width = lineWidth * this.#transform.scale;
    this.paints.push({ operation, path: this.#path, style, lineWidth: width, lineCap, lineJoin });
  }

  beginPath(): void {
    this.#path = '';
  }

  moveTo(x: number, y: number): void {
    this.#path += `M${this.#point(x, y)}`;
  }

  lineTo(x: number, y: number): void {
    this.#path += `L${this.#point(x, y)}`;
  }

  bezierCurveTo(
    cp1x: number,
    cp1y: number,
    cp2x: number,
    cp2y: number,
    x: number,
    y: number,
  ): void {
    this.#path += `C${this.#point(cp1x, cp1y)} ${this.#point(cp2x, cp2y)} ${this.#point(x, y)}`;
  }

  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void {
    this.#path += `Q${this.#point(cpx, cpy)} ${this.#point(x, y)}`;
  }

  closePath(): void {
    this.#path += 'Z';
  }

  stroke(): void {
    this.#paint('stroke', this.strokeStyle);
  }

  fill(): void {
    this.#paint('fill', this.fillStyle);
  }

  save(): void {
    const { lineWidth, lineCap, lineJoin, strokeStyle, fillStyle } = this;
    this.#saved.push({
      transform: this.#transform,
      lineWidth,
      lineCap,
      lineJoin,
      strokeStyle,
      fillStyle,
    });
  }

  restore(): void {
    const state = this.#saved.pop();
    if (state === undefined) {
      return;
    }
    this.#transform = state.transform;
    this.lineWidth = state.lineWidth;
    this.lineCap = state.lineCap;
    this.lineJoin = state.lineJoin;
    this.strokeStyle = state.strokeStyle;
    this.fillStyle = state.fillStyle;
  }

  translate(x: number, y: number): void {
    const { scale, x: offsetX, y: offsetY } = this.#transform;
    this.#transform = { scale, x: offsetX + x * scale, y: offsetY + y * scale };
  }

  scale(x: number, y: number): void {
    if (x !== y) {
      throw new Error('RecordingContext tracks uniform scaling only.');
    }
    this.#transform = { ...this.#transform, scale: this.#transform.scale * x };
  }
}

const icon = (...paths: Array<{ commands: number[]; fill?: boolean }>): IconData => ({
  name: 'test',
  size: 24,
  strokeWidth: 2,
  paths: paths.map(({ commands, fill = false }) => ({ d: '', commands, fill })),
});

const diagonal = icon({ commands: [M, 0, 0, L, 24, 24] });

describe('drawIcon', () => {
  it('scales the 24 grid to size and moves it to x, y', () => {
    const ctx = new RecordingContext();
    drawIcon(ctx, diagonal, { x: 10, y: 20, size: 48 });
    expect(ctx.paints.map((paint) => paint.path)).toStrictEqual(['M10 20L58 68']);
  });

  it('draws at 0, 0 on the 24 grid by default', () => {
    const ctx = new RecordingContext();
    drawIcon(ctx, diagonal);
    expect(ctx.paints.map((paint) => paint.path)).toStrictEqual(['M0 0L24 24']);
  });

  it('traces every command', () => {
    const ctx = new RecordingContext();
    drawIcon(
      ctx,
      icon({ commands: [M, 1, 2, L, 3, 4, C, 5, 6, 7, 8, 9, 10, Q, 11, 12, 13, 14, Z] }),
    );
    expect(ctx.paints.map((paint) => paint.path)).toStrictEqual([
      'M1 2L3 4C5 6 7 8 9 10Q11 12 13 14Z',
    ]);
  });

  it('strokes outlines and fills filled paths, in order, each as its own path', () => {
    const ctx = new RecordingContext();
    drawIcon(
      ctx,
      icon({ commands: [M, 0, 0, L, 1, 1] }, { commands: [M, 2, 2, L, 3, 3, Z], fill: true }),
      { color: '#ff0000' },
    );
    expect(
      ctx.paints.map(({ operation, path, style }) => ({ operation, path, style })),
    ).toStrictEqual([
      { operation: 'stroke', path: 'M0 0L1 1', style: '#ff0000' },
      { operation: 'fill', path: 'M2 2L3 3Z', style: '#ff0000' },
    ]);
  });

  it('strokes with round caps and joins', () => {
    const ctx = new RecordingContext();
    drawIcon(ctx, diagonal);
    expect(ctx.paints[0]).toMatchObject({ lineCap: 'round', lineJoin: 'round' });
  });

  it.each<[DrawIconOptions, number]>([
    [{}, 2],
    [{ size: 48 }, 4],
    [{ size: 12 }, 1],
    [{ strokeWidth: 1.5 }, 1.5],
    [{ size: 48, strokeWidth: 1 }, 2],
  ])('scales the stroke width with the size: %o -> %d px', (options, width) => {
    const ctx = new RecordingContext();
    drawIcon(ctx, diagonal, options);
    expect(ctx.paints[0]?.lineWidth).toBe(width);
  });

  it("paints with the context's styles when no color is given", () => {
    const ctx = new RecordingContext();
    ctx.strokeStyle = 'tomato';
    ctx.fillStyle = 'teal';
    drawIcon(
      ctx,
      icon({ commands: [M, 0, 0, L, 1, 1] }, { commands: [M, 0, 0, L, 1, 1], fill: true }),
    );
    expect(ctx.paints.map((paint) => paint.style)).toStrictEqual(['tomato', 'teal']);
  });

  it("restores the context's transform and styles", () => {
    const ctx = new RecordingContext();
    drawIcon(ctx, diagonal, { x: 5, y: 5, size: 12, color: '#fff', strokeWidth: 3 });
    expect(ctx.depth).toBe(0);
    expect(ctx).toMatchObject({
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      strokeStyle: '#000',
      fillStyle: '#000',
    });
    ctx.beginPath();
    ctx.moveTo(1, 1);
    ctx.lineTo(2, 2);
    ctx.stroke();
    expect(ctx.paints.at(-1)).toMatchObject({ path: 'M1 1L2 2', lineWidth: 1 });
  });

  it('throws on malformed commands, after restoring the context', () => {
    const ctx = new RecordingContext();
    expect(() => {
      drawIcon(ctx, icon({ commands: [M, 0, 0, 9, 1] }));
    }).toThrow('unknown path command 9 at index 3');
    expect(() => {
      drawIcon(ctx, icon({ commands: [M, 0, 0, L, 1] }));
    }).toThrow('end inside a command');
    expect(ctx.depth).toBe(0);
  });

  it('draws a generated icon', () => {
    const ctx = new RecordingContext();
    drawIcon(ctx, searchIcon, { size: 16, color: '#fff' });
    expect(ctx.paints.map(({ operation }) => operation)).toStrictEqual(['stroke', 'stroke']);
    expect(ctx.paints[0]).toMatchObject({ path: 'M14 14L11.107 11.107', style: '#fff' });
    expect(ctx.paints[0]?.lineWidth).toBeCloseTo(4 / 3);

    const logo = new RecordingContext();
    drawIcon(logo, githubIcon, { size: 16, color: '#fff' });
    expect(logo.paints.map(({ operation }) => operation)).toStrictEqual(['fill']);
  });
});
