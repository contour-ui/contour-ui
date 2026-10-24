import { PathCommand } from './icon-data.ts';
import type { IconData } from './icon-data.ts';

/**
 * The part of the Canvas 2D API that {@link drawIcon} uses, as a structural type
 * (no DOM types needed). The browser's `CanvasRenderingContext2D` fits it. Paths
 * are traced command by command, so canvases without `Path2D` (Soundor) work too.
 */
export interface IconContext {
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  bezierCurveTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): void;
  quadraticCurveTo(cpx: number, cpy: number, x: number, y: number): void;
  closePath(): void;
  stroke(): void;
  fill(): void;
  save(): void;
  restore(): void;
  translate(x: number, y: number): void;
  scale(x: number, y: number): void;
  lineWidth: number;
  lineCap: string;
  lineJoin: string;
  /** `unknown`, so that any paint type fits (the DOM also takes gradients); `drawIcon` writes a color string. */
  strokeStyle: unknown;
  /** `unknown`, so that any paint type fits (the DOM also takes gradients); `drawIcon` writes a color string. */
  fillStyle: unknown;
}

export interface DrawIconOptions {
  /** Left edge of the icon box, in context units. Default `0`. */
  readonly x?: number;
  /** Top edge of the icon box, in context units. Default `0`. */
  readonly y?: number;
  /** Width and height of the icon box, in context units. Default: the grid size (`24`). */
  readonly size?: number;
  /**
   * Color of strokes and fills, in any format the context accepts. Default: the
   * context's current `strokeStyle` and `fillStyle`.
   */
  readonly color?: string;
  /**
   * Stroke width on the icon grid: it scales with `size`, like SVG `stroke-width`
   * inside a `viewBox`. Default: `icon.strokeWidth`.
   */
  readonly strokeWidth?: number;
}

/** Trace one path's commands into the context's current path. */
function tracePath(ctx: IconContext, commands: readonly number[]): void {
  const at = (index: number): number => {
    const value = commands[index];
    if (value === undefined) {
      throw new RangeError(`drawIcon: the path commands end inside a command (index ${index}).`);
    }
    return value;
  };
  let i = 0;
  while (i < commands.length) {
    const command = at(i);
    switch (command) {
      case PathCommand.M: {
        ctx.moveTo(at(i + 1), at(i + 2));
        i += 3;
        break;
      }
      case PathCommand.L: {
        ctx.lineTo(at(i + 1), at(i + 2));
        i += 3;
        break;
      }
      case PathCommand.C: {
        ctx.bezierCurveTo(at(i + 1), at(i + 2), at(i + 3), at(i + 4), at(i + 5), at(i + 6));
        i += 7;
        break;
      }
      case PathCommand.Q: {
        ctx.quadraticCurveTo(at(i + 1), at(i + 2), at(i + 3), at(i + 4));
        i += 5;
        break;
      }
      case PathCommand.Z: {
        ctx.closePath();
        i += 1;
        break;
      }
      default: {
        throw new RangeError(`drawIcon: unknown path command ${command} at index ${i}.`);
      }
    }
  }
}

/**
 * Draw an icon into a Canvas 2D context: the 24 x 24 grid is scaled to `size` and
 * placed at `x`, `y`. Strokes get round caps and joins, as in the SVG icons. The
 * context's transform and styles are restored afterwards.
 */
export function drawIcon(ctx: IconContext, icon: IconData, options: DrawIconOptions = {}): void {
  const { x = 0, y = 0, size = icon.size, color, strokeWidth = icon.strokeWidth } = options;
  const scale = size / icon.size;
  ctx.save();
  try {
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (color !== undefined) {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
    }
    for (const path of icon.paths) {
      ctx.beginPath();
      tracePath(ctx, path.commands);
      if (path.fill) {
        ctx.fill();
      } else {
        ctx.stroke();
      }
    }
  } finally {
    ctx.restore();
  }
}
