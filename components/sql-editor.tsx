"use client"

import { useEffect, useRef, useCallback } from 'react'
import { EditorView, keymap, placeholder, lineNumbers, highlightActiveLine, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor } from '@codemirror/view'
import { EditorState, Extension, Compartment } from '@codemirror/state'
import { sql, PostgreSQL, MySQL, StandardSQL } from '@codemirror/lang-sql'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { oneDark } from '@codemirror/theme-one-dark'
import { bracketMatching, foldGutter, indentOnInput, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'

// Light theme based on GitHub style
const lightTheme = EditorView.theme({
  '&': {
    backgroundColor: '#ffffff',
    color: '#24292f',
  },
  '.cm-content': {
    caretColor: '#8b5cf6',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#8b5cf6',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: '#ddd6fe',
  },
  '.cm-activeLine': {
    backgroundColor: '#f8fafc',
  },
  '.cm-gutters': {
    backgroundColor: '#f8fafc',
    color: '#94a3b8',
    borderRight: '1px solid #e2e8f0',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#f1f5f9',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 8px 0 16px',
  },
}, { dark: false })

// Dark theme extension
const darkTheme = EditorView.theme({
  '&': {
    backgroundColor: '#0f0f0f',
    color: '#e5e7eb',
  },
  '.cm-content': {
    caretColor: '#8b5cf6',
    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: '#8b5cf6',
  },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: '#4c1d95',
  },
  '.cm-activeLine': {
    backgroundColor: '#1e1e1e',
  },
  '.cm-gutters': {
    backgroundColor: '#0f0f0f',
    color: '#6b7280',
    borderRight: '1px solid #1f2937',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#1a1a1a',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 8px 0 16px',
  },
}, { dark: true })

interface SQLEditorProps {
  value: string
  onChange: (value: string) => void
  onExecute?: () => void
  dialect?: 'postgresql' | 'mysql' | 'standard'
  placeholder?: string
  height?: string
  readOnly?: boolean
  className?: string
  tables?: string[]
  columns?: Record<string, string[]>
}

export function SQLEditor({
  value,
  onChange,
  onExecute,
  dialect = 'postgresql',
  placeholder: placeholderText = 'Enter your SQL query...',
  height = '256px',
  readOnly = false,
  className = '',
  tables = [],
  columns = {},
}: SQLEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const themeCompartment = useRef(new Compartment())
  
  // Detect dark mode
  const isDarkMode = typeof window !== 'undefined' && 
    window.matchMedia('(prefers-color-scheme: dark)').matches ||
    document.documentElement.classList.contains('dark')

  // Get SQL dialect
  const getDialect = useCallback(() => {
    switch (dialect) {
      case 'mysql':
        return MySQL
      case 'standard':
        return StandardSQL
      default:
        return PostgreSQL
    }
  }, [dialect])

  // Build schema for autocompletion
  const buildSchema = useCallback(() => {
    const schema: Record<string, string[]> = {}
    
    // Add provided tables and columns
    for (const table of tables) {
      schema[table] = columns[table] || []
    }
    
    return schema
  }, [tables, columns])

  // Initialize editor
  useEffect(() => {
    if (!editorRef.current || viewRef.current) return

    const executeKeymap = keymap.of([
      {
        key: 'Mod-Enter',
        run: () => {
          onExecute?.()
          return true
        },
      },
    ])

    const schema = buildSchema()
    
    const extensions: Extension[] = [
      lineNumbers(),
      highlightActiveLine(),
      highlightSpecialChars(),
      history(),
      drawSelection(),
      dropCursor(),
      EditorState.allowMultipleSelections.of(true),
      indentOnInput(),
      bracketMatching(),
      closeBrackets(),
      autocompletion({
        override: [],
        defaultKeymap: true,
      }),
      rectangularSelection(),
      crosshairCursor(),
      foldGutter(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      sql({
        dialect: getDialect(),
        upperCaseKeywords: true,
        schema: Object.keys(schema).length > 0 ? schema : undefined,
      }),
      keymap.of([
        ...closeBracketsKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...completionKeymap,
        indentWithTab,
      ]),
      executeKeymap,
      placeholder(placeholderText),
      themeCompartment.current.of(isDarkMode ? [oneDark, darkTheme] : lightTheme),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const newValue = update.state.doc.toString()
          onChange(newValue)
        }
      }),
      EditorState.readOnly.of(readOnly),
    ]

    const state = EditorState.create({
      doc: value,
      extensions,
    })

    viewRef.current = new EditorView({
      state,
      parent: editorRef.current,
    })

    return () => {
      viewRef.current?.destroy()
      viewRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update value when prop changes (external updates)
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const currentValue = view.state.doc.toString()
    if (currentValue !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentValue.length,
          insert: value,
        },
      })
    }
  }, [value])

  // Update theme when dark mode changes
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains('dark') || 
        mediaQuery.matches
      
      view.dispatch({
        effects: themeCompartment.current.reconfigure(
          isDark ? [oneDark, darkTheme] : lightTheme
        ),
      })
    }

    // Watch for class changes on html element
    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    // Also listen for media query changes
    mediaQuery.addEventListener('change', updateTheme)

    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener('change', updateTheme)
    }
  }, [])

  return (
    <div 
      ref={editorRef} 
      className={`overflow-auto ${className}`}
      style={{ height }}
    />
  )
}
