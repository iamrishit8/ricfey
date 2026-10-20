import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { isDark, setDark } from '@/lib/theme';

export function ThemeToggle() {
  const [dark, setDarkState] = useState(isDark);
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-pressed={dark}
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => {
        setDark(!dark);
        setDarkState(!dark);
      }}
    >
      <span aria-hidden>{dark ? '☀︎' : '☾'}</span>
      <span className="hidden sm:inline">{dark ? 'Light' : 'Dark'}</span>
    </Button>
  );
}
