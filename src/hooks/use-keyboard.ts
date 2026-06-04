import { useEffect } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;

export function useKeyboard(keyMap: Record<string, KeyHandler>, deps: any[] = []) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger hotkeys if user is typing in an input, 
      // UNLESS the hotkey is specifically for escaping or submitting the input.
      const isInput = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;

      let keyCombo = event.key;
      if (event.metaKey || event.ctrlKey) keyCombo = `cmd+${event.key.toLowerCase()}`;

      const handler = keyMap[keyCombo] || keyMap[event.key];

      if (handler) {
        // If it's an input and not a 'cmd+' combo or 'Escape' or 'Enter', skip
        if (isInput && !keyCombo.startsWith('cmd+') && event.key !== 'Escape' && event.key !== 'Enter') {
          return;
        }
        handler(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyMap, ...deps]);
}
