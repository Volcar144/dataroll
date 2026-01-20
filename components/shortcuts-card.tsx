import { Command } from "lucide-react"

export function ShortcutsCard() {
  const shortcuts = [
    { key: "C", action: "Connections" },
    { key: "M", action: "Migrations" },
    { key: "W", action: "Workflows" },
    { key: "T", action: "Teams" },
    { key: "A", action: "Audit" },
    { key: "?", action: "Help" },
  ]

  return (
    <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
      <div className="flex items-center gap-2 mb-3">
        <Command className="w-4 h-4 text-zinc-500 dark:text-zinc-400" />
        <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          Keyboard Shortcuts
        </h4>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {shortcuts.map((shortcut) => (
          <div
            key={shortcut.key}
            className="flex items-center gap-2 text-xs"
          >
            <kbd className="px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded font-mono text-zinc-900 dark:text-zinc-100">
              {shortcut.key}
            </kbd>
            <span className="text-zinc-600 dark:text-zinc-400">
              {shortcut.action}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
