import { soundorTokens } from '@contour-ui/tokens/soundor';
import { Pressable, Text } from '@soundor/react';
import { render, screen, userEvent } from '@soundor/testing-library/react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vite-plus/test';

import { ThemeProvider } from './theme-provider.tsx';
import { useTheme, useTokens } from './use-theme.ts';

function ThemeName(): ReactElement {
  const { theme, resolvedTheme, tokens, setTheme } = useTheme();
  return (
    <Pressable
      onPress={() => {
        setTheme(theme === 'light' ? 'dark' : 'light');
      }}
    >
      <Text>{`${theme} ${resolvedTheme} ${tokens.color.bg.canvas}`}</Text>
    </Pressable>
  );
}

function Canvas(): ReactElement {
  return <Text>{useTokens().color.bg.canvas}</Text>;
}

describe('ThemeProvider', () => {
  it('starts in the default theme of the tokens, with its token values', async () => {
    await render(
      <ThemeProvider>
        <ThemeName />
      </ThemeProvider>,
    );
    expect(screen.getByText(`dark dark ${soundorTokens.dark.color.bg.canvas}`)).toBeDefined();
  });

  it('starts in defaultTheme and switches with setTheme', async () => {
    const user = userEvent.setup();
    await render(
      <ThemeProvider defaultTheme="light">
        <ThemeName />
      </ThemeProvider>,
    );
    const button = screen.getByRole('button', {
      name: `light light ${soundorTokens.light.color.bg.canvas}`,
    });
    await user.click(button);
    expect(screen.getByText(`dark dark ${soundorTokens.dark.color.bg.canvas}`)).toBeDefined();
  });

  it('passes the theme of an outer provider on', async () => {
    await render(
      <ThemeProvider defaultTheme="light">
        <ThemeProvider defaultTheme="dark">
          <ThemeName />
        </ThemeProvider>
      </ThemeProvider>,
    );
    expect(screen.getByText(`light light ${soundorTokens.light.color.bg.canvas}`)).toBeDefined();
  });
});

describe('useTokens', () => {
  it('reads the token values of the default theme outside a provider', async () => {
    await render(<Canvas />);
    expect(screen.getByText(soundorTokens.dark.color.bg.canvas)).toBeDefined();
  });
});

describe('useTheme', () => {
  it('throws outside a provider', async () => {
    await expect(render(<ThemeName />)).rejects.toThrow(
      'useTheme: render the component inside <ThemeProvider>.',
    );
  });
});
