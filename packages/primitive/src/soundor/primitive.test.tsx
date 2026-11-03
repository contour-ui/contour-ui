import { Text } from '@soundor/react';
import type { PressableState } from '@soundor/react';
import { fireEvent, render, screen, userEvent } from '@soundor/testing-library/react';
import type { UiNode } from 'soundor:ui';
import { createRef } from 'react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test';

import { resetWarnings } from '../native/warnings.ts';
import { Primitive } from './primitive.ts';
import type { PrimitiveElement, PrimitiveProps } from './types.ts';

/**
 * Props the types of the Soundor build leave out, as an untyped spread of shared code passes them:
 * the backend must still handle them as it renders.
 */
function untyped<E extends PrimitiveElement>(
  _element: E,
  props: Readonly<Record<string, unknown>>,
): PrimitiveProps<E> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- on purpose, see above.
  return props;
}

/** Silence the warnings of the backend, and read them. */
const spyOnWarnings = () => vi.spyOn(console, 'warn').mockImplementation(() => undefined);

beforeEach(() => {
  resetWarnings();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** The texts of a node's children, as they show. */
const textsOf = (node: { readonly children: ReadonlyArray<{ readonly text: string }> }) =>
  node.children.map((child) => child.text);

/** A slider's props, written once, as shared parts write them. */
const GAIN: PrimitiveProps<'svg'> = {
  role: 'slider',
  tabIndex: 0,
  'aria-label': 'Gain',
  'aria-valuemin': -60,
  'aria-valuemax': 12,
  'aria-valuenow': -6,
  'aria-valuetext': '-6 dB',
  viewBox: '0 0 100 100',
};

/** A slider and a button, the slider focusable or not. */
const sliderAndButton = (focusable: boolean): ReactElement => (
  <>
    <Primitive.svg {...GAIN} tabIndex={focusable ? 0 : undefined} />
    <Primitive.button>Other</Primitive.button>
  </>
);

/** A button that may be disabled, and another one to move the focus to. */
const twoButtons = (disabled: boolean): ReactElement => (
  <>
    <Primitive.button disabled={disabled}>Save</Primitive.button>
    <Primitive.button>Other</Primitive.button>
  </>
);

/** A row of text around an element, and an icon before it or not. */
const row = (icon: ReactElement | null): ReactElement => (
  <Primitive.div aria-label="Row">
    {icon}
    Before
    <Primitive.text>Middle</Primitive.text>
    After
  </Primitive.div>
);

/** A style of the pressed state: half seen at rest, whole under the pointer. */
const hoverStyle = ({ hovered }: PressableState) => ({ opacity: Number(hovered) / 2 + 0.5 });

describe('Primitive on Soundor', () => {
  describe('roles and ARIA', () => {
    it('translates a slider into an adjustable node with its name and value', async () => {
      await render(<Primitive.svg {...GAIN} />);
      const slider = screen.getByRole('adjustable', { name: 'Gain' });
      expect(slider.accessibility).toEqual({
        role: 'adjustable',
        label: 'Gain',
        value: { min: -60, max: 12, now: -6, text: '-6 dB' },
      });
      expect(slider.focusable).toBe(true);
    });

    it('makes a group an accessible node without a role, and none a node without one', async () => {
      const plain = createRef<UiNode>();
      const bare = createRef<UiNode>();
      const group: PrimitiveProps<'div'> = { role: 'group', 'aria-label': 'Filter' };
      await render(
        <>
          <Primitive.div {...group}>
            <Primitive.text>Cutoff</Primitive.text>
          </Primitive.div>
          <Primitive.div ref={plain} role="presentation" />
          <Primitive.span ref={bare} role="none" />
        </>,
      );
      expect(screen.getByRole('group', { name: 'Filter' }).accessibility).toEqual({
        label: 'Filter',
        accessible: true,
      });
      expect(plain.current?.accessibility).toEqual({ role: 'none' });
      expect(bare.current?.accessibility).toEqual({ role: 'none' });
    });

    it('throws a readable error for a role without a native twin', async () => {
      // React reports what a component throws, too.
      vi.spyOn(globalThis, 'reportError').mockImplementation(() => undefined);
      // `listbox` has no twin, so the types leave it out.
      const props = untyped('div', { role: 'listbox' });
      await expect(render(<Primitive.div {...props} />)).rejects.toThrow(
        'Primitive.div: role="listbox" has no twin on native platforms',
      );
    });

    it('gives the state and the value only the fields that are set', async () => {
      const solo: PrimitiveProps<'button'> = {
        role: 'checkbox',
        'aria-checked': 'mixed',
        'aria-busy': 'true',
      };
      const load: PrimitiveProps<'div'> = {
        role: 'progressbar',
        'aria-label': 'Load',
        'aria-valuenow': 40,
      };
      const mixer: PrimitiveProps<'button'> = {
        role: 'tab',
        'aria-selected': false,
        'aria-expanded': true,
        'aria-disabled': true,
      };
      await render(
        <>
          <Primitive.button {...solo}>Solo</Primitive.button>
          <Primitive.div {...load} />
          <Primitive.button {...mixer}>Mixer</Primitive.button>
        </>,
      );
      expect(screen.getByRole('checkbox', { name: 'Solo' }).accessibility.state).toEqual({
        checked: 'mixed',
        busy: true,
      });
      expect(screen.getByRole('progressbar', { name: 'Load' }).accessibility.value).toEqual({
        now: 40,
      });
      expect(screen.getByRole('tab', { name: 'Mixer' }).accessibility.state).toEqual({
        selected: false,
        expanded: true,
        disabled: true,
      });
    });

    it('leaves out the attributes without a twin, data attributes and web-only props', async () => {
      const warn = spyOnWarnings();
      const pan = untyped('svg', {
        ...GAIN,
        'aria-label': 'Pan',
        'aria-orientation': 'vertical',
        'aria-readonly': true,
        'aria-controls': 'mixer',
        'data-part': 'control',
        className: 'contour-knob',
        'aria-live': 'polite',
      });
      await render(<Primitive.svg {...pan} />);
      const slider = screen.getByRole('adjustable', { name: 'Pan' });
      expect(slider.accessibility).toEqual({
        role: 'adjustable',
        label: 'Pan',
        value: { min: -60, max: 12, now: -6, text: '-6 dB' },
      });
      // The table's own drops say nothing; an attribute outside it and a web-only prop warn once.
      expect(warn.mock.calls).toEqual([
        [
          'Primitive.svg: `className` is web-only and was dropped: a native element takes its look from `style`.',
        ],
        [
          'Primitive.svg: `aria-live` has no twin on native platforms and was dropped (ARIA_ATTRIBUTES).',
        ],
      ]);
    });

    it('warns about a dropped prop once per element and prop', async () => {
      const warn = spyOnWarnings();
      const { rerender } = await render(<Primitive.div {...untyped('div', { className: 'a' })} />);
      await rerender(<Primitive.div {...untyped('div', { className: 'b' })} />);
      await render(<Primitive.span {...untyped('span', { className: 'c' })} />);
      expect(warn).toHaveBeenCalledTimes(2);
    });

    it('hides an element from assistive technology with aria-hidden, the text it wraps too', async () => {
      await render(
        <>
          <Primitive.span aria-hidden>Decor</Primitive.span>
          <Primitive.text aria-hidden="true">Readout</Primitive.text>
          <Primitive.text aria-hidden={false}>Shown</Primitive.text>
        </>,
      );
      expect(screen.queryByRole('text', { name: 'Decor' })).toBeNull();
      expect(screen.queryByRole('text', { name: 'Readout' })).toBeNull();
      expect(screen.getByText('Decor').accessibility.accessible).toBe(false);
      expect(screen.getByRole('text', { name: 'Shown' })).toBeDefined();
    });
  });

  describe('focus', () => {
    it('gives focusable every time, also when tabIndex goes away', async () => {
      const warn = spyOnWarnings();
      const { rerender } = await render(<Primitive.div aria-label="Pad" tabIndex={0} />);
      const pad = screen.getByLabelText('Pad');
      expect(pad.focusable).toBe(true);
      await rerender(<Primitive.div aria-label="Pad" />);
      expect(pad.focusable).toBe(false);
      await rerender(<Primitive.div aria-label="Pad" tabIndex={0} />);
      expect(pad.focusable).toBe(true);
      // Focus from code only has no twin: no focus at all.
      await rerender(<Primitive.div aria-label="Pad" tabIndex={-1} />);
      expect(pad.focusable).toBe(false);
      expect(warn).toHaveBeenCalledOnce();
    });

    it('gives the focus up when the element stops taking it, as the DOM does', async () => {
      const user = userEvent.setup();
      const { rerender } = await render(sliderAndButton(true));
      const slider = screen.getByRole('adjustable', { name: 'Gain' });
      await user.tab();
      expect(slider).toHaveFocus();
      await rerender(sliderAndButton(false));
      expect(slider).not.toHaveFocus();
      expect(slider.focusable).toBe(false);
    });

    it('takes no focus while the button is disabled, and gives it up when it turns so', async () => {
      const user = userEvent.setup();
      const { rerender } = await render(twoButtons(false));
      const save = screen.getByRole('button', { name: 'Save' });
      await user.tab();
      expect(save).toHaveFocus();
      await rerender(twoButtons(true));
      expect(save).not.toHaveFocus();
      expect(save.focusable).toBe(false);
      expect(save.accessibility.state).toEqual({ disabled: true });
      await rerender(twoButtons(false));
      expect(save.focusable).toBe(true);
    });

    it('passes the node to a ref', async () => {
      const ref = createRef<UiNode>();
      await render(<Primitive.div ref={ref} aria-label="Box" />);
      expect(ref.current).toBe(screen.getByLabelText('Box'));
    });
  });

  describe('button', () => {
    it('presses on a click, Enter and Space, as Pressable', async () => {
      const onPress = vi.fn<() => void>();
      const user = userEvent.setup();
      await render(<Primitive.button onPress={onPress}>Save</Primitive.button>);
      const save = screen.getByRole('button', { name: 'Save' });
      await user.click(save);
      await user.keyboard('{Enter}');
      await user.keyboard(' ');
      expect(onPress).toHaveBeenCalledTimes(3);
      expect(save.focusable).toBe(true);
    });

    it('presses on the activate action of assistive technology', async () => {
      const onPress = vi.fn<() => void>();
      await render(<Primitive.button onPress={onPress}>Save</Primitive.button>);
      fireEvent.accessibilityAction(screen.getByRole('button', { name: 'Save' }), {
        actionName: 'activate',
      });
      expect(onPress).toHaveBeenCalledOnce();
    });

    it('does not press while disabled', async () => {
      const onPress = vi.fn<() => void>();
      const user = userEvent.setup();
      await render(
        <Primitive.button disabled onPress={onPress}>
          Save
        </Primitive.button>,
      );
      const save = screen.getByRole('button', { name: 'Save', disabled: true });
      await user.click(save);
      await user.tab();
      expect(onPress).not.toHaveBeenCalled();
      expect(save).not.toHaveFocus();
    });

    it('stays focusable while enabled whatever its tabIndex, and says so once', async () => {
      const warn = spyOnWarnings();
      await render(<Primitive.button tabIndex={-1}>Save</Primitive.button>);
      expect(screen.getByRole('button', { name: 'Save' }).focusable).toBe(true);
      expect(warn).toHaveBeenCalledExactlyOnceWith(
        'Primitive.button: `tabIndex` below 0 has no twin on Soundor: a Pressable takes focus while it is enabled.',
      );
    });

    it('passes a style function of the state on to Pressable', async () => {
      const user = userEvent.setup();
      await render(<Primitive.button style={hoverStyle}>Save</Primitive.button>);
      const save = screen.getByRole('button', { name: 'Save' });
      expect(save.style).toMatchObject({ opacity: 0.5 });
      await user.pointer({ target: save });
      expect(save.style).toMatchObject({ opacity: 1 });
    });
  });

  describe('text', () => {
    it('wraps a run of strings and numbers in one text', async () => {
      const count = 3;
      await render(<Primitive.button aria-label="Save">Save {count} items</Primitive.button>);
      const button = screen.getByRole('button', { name: 'Save' });
      expect(textsOf(button)).toEqual(['Save 3 items']);
      expect(button.children[0]?.type).toBe('text');
    });

    it('drops runs of white space, and collapses white space as CSS does', async () => {
      await render(
        <Primitive.div aria-label="Row">
          <Primitive.span aria-label="Icon" /> {'  Save \n now  '}{' '}
        </Primitive.div>,
      );
      const box = screen.getByLabelText('Row');
      expect(box.children.map((child) => child.type)).toEqual(['view', 'text']);
      expect(box.children[1]?.text).toBe('Save now');
    });

    it('keeps the elements between runs in their places', async () => {
      const { rerender } = await render(row(null));
      const middle = screen.getByText('Middle');
      await rerender(row(<Primitive.span aria-label="Icon" />));
      expect(textsOf(screen.getByLabelText('Row'))).toEqual(['', 'Before', 'Middle', 'After']);
      // The same node: adding an element before it mounted nothing again.
      expect(screen.getByText('Middle')).toBe(middle);
    });

    it('joins the strings of a list, as the web shows them together', async () => {
      await render(<Primitive.div aria-label="List">{['Low', ' ', 'High']}</Primitive.div>);
      expect(textsOf(screen.getByLabelText('List'))).toEqual(['Low High']);
    });

    it('wraps the runs of a list inside the children with keys of their own', async () => {
      const error = vi.spyOn(console, 'error');
      const parts = [
        <Primitive.text key="low">Low</Primitive.text>,
        'to',
        <Primitive.text key="high">High</Primitive.text>,
      ];
      await render(<Primitive.div aria-label="Range">Range: {parts}</Primitive.div>);
      expect(textsOf(screen.getByLabelText('Range'))).toEqual(['Range:', 'Low', 'to', 'High']);
      expect(error).not.toHaveBeenCalled();
    });

    it('gives the runs of a box and every text below it the ambient text style', async () => {
      await render(
        <Primitive.div aria-label="Panel" textStyle={{ color: '#ffffff', fontSize: 12 }}>
          Title
          <Primitive.div aria-label="Inner">
            <Primitive.text style={{ fontSize: 10 }}>Caption</Primitive.text>
          </Primitive.div>
          <Primitive.div textStyle={{ color: '#ff0000' }}>Warning</Primitive.div>
          <Text>Own</Text>
        </Primitive.div>,
      );
      expect(screen.getByText('Title').style).toEqual({ color: '#ffffff', fontSize: 12 });
      // A text's own style wins over the ambient one, per property.
      expect(screen.getByText('Caption').style).toEqual({ color: '#ffffff', fontSize: 10 });
      // A nearer text style wins over the one above it.
      expect(screen.getByText('Warning').style).toEqual({ color: '#ff0000', fontSize: 12 });
      // A Text of Soundor's own is not one of ours: it takes nothing.
      expect(screen.getByText('Own').style).toEqual({});
    });

    it('gives the label of a button the text style of the button', async () => {
      await render(<Primitive.button textStyle={{ fontWeight: 600 }}>Save</Primitive.button>);
      expect(screen.getByText('Save').style).toEqual({ fontWeight: 600 });
    });
  });

  describe('shapes', () => {
    it('draws shapes with their presentation props only', async () => {
      const dial: PrimitiveProps<'svg'> = {
        role: 'img',
        'aria-label': 'Dial',
        viewBox: '0 0 100 100',
        color: '#51a0ff',
      };
      const track = untyped('path', {
        d: 'M 10 10 L 90 90',
        stroke: 'currentColor',
        strokeWidth: 4,
        strokeLinecap: 'round',
        fill: 'none',
        'data-part': 'track',
        onPointerDown: () => undefined,
      });
      await render(
        <Primitive.svg {...dial}>
          <Primitive.path {...track} />
          <Primitive.line x1={50} y1={50} x2={50} y2={10} stroke="currentColor" />
        </Primitive.svg>,
      );
      expect(screen.getByRole('image', { name: 'Dial' }).svgScene).toEqual({
        version: 1,
        viewBox: [0, 0, 100, 100],
        presentation: { color: '#51a0ff' },
        children: [
          {
            type: 'path',
            d: 'M 10 10 L 90 90',
            presentation: {
              stroke: 'currentColor',
              strokeWidth: 4,
              strokeLinecap: 'round',
              fill: 'none',
            },
          },
          {
            type: 'line',
            x1: 50,
            y1: 50,
            x2: 50,
            y2: 10,
            presentation: { stroke: 'currentColor' },
          },
        ],
      });
    });
  });

  describe('form value', () => {
    it('renders nothing: Soundor has no forms', async () => {
      await render(
        <Primitive.div aria-label="Root">
          <Primitive.formValue name="gain" value="0.5" />
        </Primitive.div>,
      );
      expect(screen.getByLabelText('Root').children).toHaveLength(0);
    });
  });
});
