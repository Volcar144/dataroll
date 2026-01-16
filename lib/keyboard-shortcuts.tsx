'use client';

import { createContext, useContext, useEffect, useCallback } from 'react';

type KeyboardShortcut = {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
  category?: string;
};

type KeyboardShortcutsContextType = {
  registerShortcut: (shortcut: KeyboardShortcut) => () => void;
  shortcuts: KeyboardShortcut[];
};

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextType | undefined>(undefined);

export function useKeyboardShortcuts() {
  const context = useContext(KeyboardShortcutsContext);
  if (context === undefined) {
    throw new Error('useKeyboardShortcuts must be used within a KeyboardShortcutsProvider');
  }
  return context;
}

interface KeyboardShortcutsProviderProps {
  children: React.ReactNode;
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const shortcuts: KeyboardShortcut[] = [];

  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    shortcuts.push(shortcut);

    return () => {
      const index = shortcuts.indexOf(shortcut);
      if (index > -1) {
        shortcuts.splice(index, 1);
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target as HTMLElement)?.contentEditable === 'true'
      ) {
        return;
      }

      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = !!event.ctrlKey === !!shortcut.ctrlKey;
        const altMatches = !!event.altKey === !!shortcut.altKey;
        const shiftMatches = !!event.shiftKey === !!shortcut.shiftKey;
        const metaMatches = !!event.metaKey === !!shortcut.metaKey;

        if (keyMatches && ctrlMatches && altMatches && shiftMatches && metaMatches) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);

  const value = {
    registerShortcut,
    shortcuts: [...shortcuts],
  };

  return (
    <KeyboardShortcutsContext.Provider value={value}>
      {children}
    </KeyboardShortcutsContext.Provider>
  );
}

export function useShortcut(
  key: string,
  action: () => void,
  options: {
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    metaKey?: boolean;
    description: string;
    category?: string;
  }
) {
  const { registerShortcut } = useKeyboardShortcuts();

  useEffect(() => {
    const unregister = registerShortcut({
      key,
      action,
      ...options,
    });

    return unregister;
  }, [key, action, options, registerShortcut]);
}