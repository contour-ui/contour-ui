import { computePosition as computeFloatingPosition } from '@floating-ui/core';
import { describe, expect, it } from 'vite-plus/test';

import { computePosition } from './compute-position.ts';
import type {
  ComputePositionConfig,
  Placement,
  PositioningOptions,
  PositioningPlatform,
  PositioningResult,
  PositioningSizeVariables,
} from './positioning.types.ts';

/** A size, in px. */
interface Size {
  readonly width: number;
  readonly height: number;
}

/** A rectangle: its top-left corner and its size, in px. */
interface Box extends Size {
  readonly x: number;
  readonly y: number;
}

/** What a fake platform measures. */
interface Scene {
  /** The reference element, in the coordinates of the viewport. */
  readonly reference: Box;
  /** The size of the floating element before positioning changes it. */
  readonly floating: Size;
  /** The viewport, at 0,0: the area that clips the floating element. */
  readonly viewport?: Size | undefined;
  readonly rtl?: boolean | undefined;
}

// The elements are whatever the platform measures: here, two tokens.
const REFERENCE = { element: 'reference' };
const FLOATING = { element: 'floating' };

const VIEWPORT: Size = { width: 1000, height: 800 };

/** A 100×40 reference in the middle of the viewport, a 200×100 floating element: room everywhere. */
const CENTER: Scene = {
  reference: { x: 400, y: 300, width: 100, height: 40 },
  floating: { width: 200, height: 100 },
};

/** A platform of plain rectangles, without a DOM. */
function fakePlatform({ reference, floating, viewport = VIEWPORT, rtl = false }: Scene) {
  return {
    getElementRects: () => ({ reference, floating: { x: 0, y: 0, ...floating } }),
    getDimensions: () => floating,
    getClippingRect: () => ({ x: 0, y: 0, ...viewport }),
    isRTL: () => rtl,
  } satisfies PositioningPlatform;
}

/** Position the floating element of a scene. */
function position(scene: Scene, options: PositioningOptions = {}): Promise<PositioningResult> {
  return computePosition(REFERENCE, FLOATING, { ...options, platform: fakePlatform(scene) });
}

/** The scene with the reference moved. */
function withReference(scene: Scene, reference: Partial<Box>): Scene {
  return { ...scene, reference: { ...scene.reference, ...reference } };
}

/** What the `computePosition` of a Floating UI package gets besides the elements. */
type FloatingComputeConfig = NonNullable<
  Parameters<NonNullable<ComputePositionConfig['compute']>>[2]
>;

/** A call of a `computePosition`. */
interface ComputeCall {
  readonly reference: unknown;
  readonly floating: unknown;
  readonly config: FloatingComputeConfig;
}

/**
 * A `computePosition` that records its calls and computes with the one of `@floating-ui/core`,
 * as the one of `@floating-ui/dom` does once it has added its caches to the platform.
 */
function recordingCompute(calls: ComputeCall[]) {
  return (reference: unknown, floating: unknown, config?: FloatingComputeConfig) => {
    if (config?.platform === undefined) {
      throw new Error('The computation got no platform.');
    }
    calls.push({ reference, floating, config });
    return computeFloatingPosition(reference, floating, { ...config, platform: config.platform });
  };
}

describe('computePosition', () => {
  it('returns the coordinates, the placement, the sizes and the variables as plain data', async () => {
    expect(await position(CENTER, { placement: 'bottom-start', offset: 8 })).toStrictEqual({
      x: 400,
      y: 348,
      placement: 'bottom-start',
      strategy: 'absolute',
      referenceWidth: 100,
      referenceHeight: 40,
      // It may slide along the whole width; below, it has the rest of the viewport.
      availableWidth: 1000,
      availableHeight: 452,
      transformOrigin: 'top left',
      variables: {
        '--reference-width': '100px',
        '--reference-height': '40px',
        '--available-width': '1000px',
        '--available-height': '452px',
        '--transform-origin': 'top left',
      },
    });
  });

  it.each<[Placement, number, number, string]>([
    ['top', 350, 200, 'bottom center'],
    ['top-start', 400, 200, 'bottom left'],
    ['top-end', 300, 200, 'bottom right'],
    ['right', 500, 270, 'left center'],
    ['right-start', 500, 300, 'left top'],
    ['right-end', 500, 240, 'left bottom'],
    ['bottom', 350, 340, 'top center'],
    ['bottom-start', 400, 340, 'top left'],
    ['bottom-end', 300, 340, 'top right'],
    ['left', 200, 270, 'right center'],
    ['left-start', 200, 300, 'right top'],
    ['left-end', 200, 240, 'right bottom'],
  ])('places it at %s: %i, %i, growing from its %s', async (placement, x, y, origin) => {
    const result = await position(CENTER, { placement });

    expect(result).toMatchObject({ placement, x, y, transformOrigin: origin });
    expect(result.variables['--transform-origin']).toBe(origin);
  });

  it('places it below the reference by default', async () => {
    expect(await position(CENTER)).toMatchObject({
      placement: 'bottom',
      strategy: 'absolute',
      x: 350,
      y: 340,
    });
  });

  it('mirrors the alignment on the top and bottom sides in right-to-left text', async () => {
    const rtl: Scene = { ...CENTER, rtl: true };

    // The start edge is the right one: the right edges line up.
    expect(await position(rtl, { placement: 'bottom-start' })).toMatchObject({
      x: 300,
      y: 340,
      transformOrigin: 'top right',
    });
    expect(await position(rtl, { placement: 'top-end' })).toMatchObject({
      x: 400,
      y: 200,
      transformOrigin: 'bottom left',
    });
    expect(await position(rtl, { placement: 'bottom' })).toMatchObject({
      x: 350,
      transformOrigin: 'top center',
    });
    // On the left and right sides, the start edge stays the top one.
    expect(await position(rtl, { placement: 'left-start' })).toMatchObject({
      x: 200,
      y: 300,
      transformOrigin: 'right top',
    });
  });

  it('keeps the offset away from the reference, on every side', async () => {
    const offset = 8;

    expect(await position(CENTER, { placement: 'bottom', offset })).toMatchObject({
      x: 350,
      y: 348,
    });
    expect(await position(CENTER, { placement: 'top', offset })).toMatchObject({ x: 350, y: 192 });
    expect(await position(CENTER, { placement: 'left', offset })).toMatchObject({
      x: 192,
      y: 270,
    });
    expect(await position(CENTER, { placement: 'right', offset })).toMatchObject({
      x: 508,
      y: 270,
    });
  });

  it('moves it along the side by the cross-axis offset', async () => {
    const offset = { mainAxis: 8, crossAxis: 10 };

    expect(await position(CENTER, { placement: 'bottom', offset })).toMatchObject({
      x: 360,
      y: 348,
    });
    expect(await position(CENTER, { placement: 'right', offset })).toMatchObject({
      x: 508,
      y: 280,
    });
  });

  describe('flip', () => {
    /** The reference 60 px above the bottom edge of the viewport: no room below for 100 px. */
    const nearBottom = withReference(CENTER, { y: 700 });

    it('moves it to the opposite side when its side has no room', async () => {
      expect(await position(nearBottom, { placement: 'bottom', offset: 8 })).toMatchObject({
        placement: 'top',
        x: 350,
        y: 592,
        transformOrigin: 'bottom center',
      });
    });

    it('keeps the placement when turned off, even out of view', async () => {
      expect(
        await position(nearBottom, { placement: 'bottom', offset: 8, flip: false }),
      ).toMatchObject({ placement: 'bottom', y: 748 });
    });

    it('tries the other alignment before the opposite side', async () => {
      // No room below for either alignment: the same alignment on the opposite side.
      expect(await position(nearBottom, { placement: 'bottom-start' })).toMatchObject({
        placement: 'top-start',
        x: 400,
        y: 600,
      });

      // No room on the right for the left edges to line up: the right edges line up instead.
      const nearRight = withReference(CENTER, { x: 900, width: 80 });
      expect(await position(nearRight, { placement: 'bottom-start' })).toMatchObject({
        placement: 'bottom-end',
        x: 780,
        y: 340,
      });
    });

    it('tries the placements of a list, in order', async () => {
      expect(
        await position(nearBottom, { placement: 'bottom', flip: ['left-start', 'right'] }),
      ).toMatchObject({ placement: 'left-start', x: 200, y: 700 });
    });

    it('takes the side with the most room when no side has enough', async () => {
      const short: Scene = {
        reference: { x: 400, y: 100, width: 100, height: 40 },
        floating: { width: 200, height: 200 },
        viewport: { width: 1000, height: 300 },
      };

      // 160 px below, 100 above.
      expect(await position(short, { placement: 'bottom' })).toMatchObject({
        placement: 'bottom',
      });
      // 100 px below, 160 above.
      expect(
        await position(withReference(short, { y: 160 }), { placement: 'bottom' }),
      ).toMatchObject({ placement: 'top' });
    });

    it('wants the shift distance from the edge too', async () => {
      // The floating element would end 7 px from the bottom edge.
      const close = withReference(CENTER, { y: 653 });

      expect(await position(close, { shift: 0 })).toMatchObject({ placement: 'bottom' });
      expect(await position(close, { shift: 8 })).toMatchObject({ placement: 'top', y: 553 });
    });
  });

  describe('shift', () => {
    /** The reference 20 px from the right edge: centered below it, the floating element crosses it. */
    const nearRight = withReference(CENTER, { x: 920, width: 60 });
    const nearLeft = withReference(CENTER, { x: 10, width: 60 });

    it('slides it back into the viewport, the shift distance from the edge', async () => {
      expect(await position(nearRight, { shift: 0 })).toMatchObject({
        placement: 'bottom',
        x: 800,
      });
      expect(await position(nearRight, { shift: 8 })).toMatchObject({
        placement: 'bottom',
        x: 792,
      });
      expect(await position(nearLeft, { shift: 0 })).toMatchObject({ x: 0 });
      expect(await position(nearLeft, { shift: 8 })).toMatchObject({ x: 8 });
      expect(await position(nearLeft, { shift: true })).toMatchObject({ x: 0 });
    });

    it('leaves it across the edge when turned off', async () => {
      expect(await position(nearRight, { shift: false })).toMatchObject({
        placement: 'bottom',
        x: 850,
      });
    });

    it('never slides it past the far edge of its reference', async () => {
      // The reference has left the viewport: the floating element stops at its right edge.
      const gone = withReference(CENTER, { x: -100, width: 60 });

      expect(await position(gone, { placement: 'bottom-start' })).toMatchObject({
        placement: 'bottom-start',
        x: -40,
      });
    });
  });

  it('makes it as wide as the reference with sameWidth', async () => {
    expect(await position(CENTER, { sameWidth: true })).toMatchObject({
      x: 400,
      referenceWidth: 100,
    });
    expect(await position(CENTER, { placement: 'top-end', sameWidth: true })).toMatchObject({
      x: 400,
    });
    expect((await position(CENTER, { sameWidth: true })).variables['--reference-width']).toBe(
      '100px',
    );
  });

  describe('fitViewport', () => {
    /** A 600 px tall floating element: 260 px of room below the reference, 500 above. */
    const tall: Scene = {
      reference: { x: 400, y: 500, width: 100, height: 40 },
      floating: { width: 200, height: 600 },
    };

    it('takes the side with the most room and caps its height there', async () => {
      const result = await position(tall, { fitViewport: true });

      expect(result).toMatchObject({ placement: 'top', y: 0, availableHeight: 500 });
      expect(result.variables['--available-height']).toBe('500px');
    });

    it('leaves the shift distance free', async () => {
      expect(await position(tall, { fitViewport: true, shift: 8 })).toMatchObject({
        placement: 'top',
        y: 8,
        availableHeight: 492,
      });
    });

    it('caps its width', async () => {
      const wide: Scene = { ...CENTER, floating: { width: 900, height: 100 } };

      expect(
        await position(wide, { placement: 'left', flip: false, fitViewport: true }),
      ).toMatchObject({ placement: 'left', x: 0, availableWidth: 400 });
    });

    it('only reports the room when turned off', async () => {
      expect(await position(tall)).toMatchObject({
        placement: 'top',
        y: -100,
        availableHeight: 500,
      });
    });
  });

  it('measures the room at the placement: along the side only when it may not slide', async () => {
    expect(await position(CENTER, { placement: 'bottom-start' })).toMatchObject({
      availableWidth: 1000,
      availableHeight: 460,
    });
    // Without sliding, it has the room from the start edge of the reference to the right edge.
    expect(await position(CENTER, { placement: 'bottom-start', shift: false })).toMatchObject({
      availableWidth: 600,
      availableHeight: 460,
    });
  });

  it('lets the platform apply the size during the computation, and places it at the new size', async () => {
    const applied: unknown[] = [];
    let height = 100;
    const platform: PositioningPlatform = {
      ...fakePlatform(CENTER),
      getElementRects: () => ({
        reference: CENTER.reference,
        floating: { x: 0, y: 0, width: 200, height },
      }),
      getDimensions: () => ({ width: 200, height }),
      setVariables: (floating, variables) => {
        applied.push([floating, variables]);
        // Its text wraps at the new size: it grows.
        height = 150;
      },
    };

    const result = await computePosition(REFERENCE, FLOATING, { placement: 'top', platform });

    expect(result).toMatchObject({ placement: 'top', y: 150 });
    const variables: PositioningSizeVariables = {
      '--reference-width': '100px',
      '--reference-height': '40px',
      '--available-width': '1000px',
      '--available-height': '300px',
    };
    // Once at the first size, once more at the new size: the same room.
    expect(applied).toStrictEqual([
      [FLOATING, variables],
      [FLOATING, variables],
    ]);
  });

  it('passes the elements and the strategy to the platform', async () => {
    const measured: unknown[] = [];
    const platform: PositioningPlatform = {
      ...fakePlatform(CENTER),
      getElementRects: (args) => {
        measured.push(args);
        return fakePlatform(CENTER).getElementRects();
      },
    };

    const result = await computePosition(REFERENCE, FLOATING, { strategy: 'fixed', platform });

    expect(result.strategy).toBe('fixed');
    expect(measured[0]).toStrictEqual({
      reference: REFERENCE,
      floating: FLOATING,
      strategy: 'fixed',
    });
  });

  it('computes through the `compute` it is given, on its platform wrapped', async () => {
    const calls: ComputeCall[] = [];
    const platform = fakePlatform(CENTER);

    const result = await computePosition(REFERENCE, FLOATING, {
      placement: 'top',
      sameWidth: true,
      platform,
      compute: recordingCompute(calls),
    });

    expect(result).toMatchObject({ placement: 'top', x: 400, y: 200 });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      reference: REFERENCE,
      floating: FLOATING,
      config: { placement: 'top', strategy: 'absolute' },
    });
    // The platform, wrapped: it measures the floating element as wide as the reference.
    const wrapped = calls[0]?.config.platform;
    expect(wrapped).not.toBe(platform);
    expect(wrapped?.getClippingRect).toBe(platform.getClippingRect);
    expect(await wrapped?.getDimensions(FLOATING)).toStrictEqual({ width: 100, height: 100 });
    expect(platform.getDimensions()).toStrictEqual({ width: 200, height: 100 });
  });

  it('keeps the fields of the platform for its methods', async () => {
    // A platform may share state between its methods through `this`.
    const cache: unknown[] = [];
    const platform = {
      ...fakePlatform(CENTER),
      cache,
      getClippingRect(this: { readonly cache: unknown[] }, args: { element: unknown }) {
        this.cache.push(args.element);
        return { x: 0, y: 0, ...VIEWPORT };
      },
    };

    await computePosition(REFERENCE, FLOATING, { platform });

    expect(cache).toContain(FLOATING);
  });
});
