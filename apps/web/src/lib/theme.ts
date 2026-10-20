const KEY = 'ricfey-theme';

export function isDark(): boolean {
  return document.documentElement.classList.contains('dark');
}

/** Toggle the dark token set and remember the choice on this device. */
export function setDark(dark: boolean): void {
  document.documentElement.classList.toggle('dark', dark);
  try {
    localStorage.setItem(KEY, dark ? 'dark' : 'light');
  } catch {
    // Private mode or blocked storage: the toggle still works for this visit.
  }
}
