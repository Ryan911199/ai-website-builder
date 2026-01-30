"use client"

import * as React from "react"
import { useEffect, useRef } from "react"
import { EditorState, Compartment } from "@codemirror/state"
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, highlightActiveLine } from "@codemirror/view"
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { bracketMatching, foldGutter, foldKeymap, indentOnInput, syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language"
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search"
import { closeBrackets, autocompletion, closeBracketsKeymap, completionKeymap } from "@codemirror/autocomplete"
import { lintKeymap } from "@codemirror/lint"
import { javascript } from "@codemirror/lang-javascript"
import { html } from "@codemirror/lang-html"
import { css } from "@codemirror/lang-css"
import { oneDark } from "@codemirror/theme-one-dark"
import { cn } from "@/lib/utils"

interface CodeEditorProps {
  value: string
  language: string
  onChange?: (value: string) => void
  className?: string
  readOnly?: boolean
}

export function CodeEditor({
  value,
  language,
  onChange,
  className,
  readOnly = false,
}: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const timeoutRef = useRef<Timer | null>(null)
  const languageCompartment = useRef(new Compartment())

  const getLanguageExtension = (lang: string) => {
    switch (lang.toLowerCase()) {
      case "javascript":
      case "typescript":
      case "js":
      case "ts":
      case "jsx":
      case "tsx":
        return javascript({ typescript: true, jsx: true })
      case "html":
        return html()
      case "css":
        return css()
      default:
        return javascript()
    }
  }

  useEffect(() => {
    if (!editorRef.current) return

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          ...lintKeymap,
        ]),
        languageCompartment.current.of(getLanguageExtension(language)),
        oneDark,
        EditorView.updateListener.of((update) => {
          if (update.docChanged && onChange) {
            if (timeoutRef.current) {
              clearTimeout(timeoutRef.current)
            }
            const newValue = update.state.doc.toString()
            timeoutRef.current = setTimeout(() => {
              onChange(newValue)
            }, 300)
          }
        }),
        EditorState.readOnly.of(readOnly),
      ],
    })

    const view = new EditorView({
      state,
      parent: editorRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (view && value !== view.state.doc.toString()) {
      const transaction = view.state.update({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      })
      view.dispatch(transaction)
    }
  }, [value])

  useEffect(() => {
    const view = viewRef.current
    if (view) {
      view.dispatch({
        effects: languageCompartment.current.reconfigure(getLanguageExtension(language))
      })
    }
  }, [language])

  return (
    <div
      ref={editorRef}
      className={cn("h-full w-full overflow-hidden text-sm", className)}
    />
  )
}
