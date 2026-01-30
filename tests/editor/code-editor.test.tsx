import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CodeEditor } from '@/components/editor/code-editor'
import { FileTabs } from '@/components/editor/file-tabs'

describe('CodeEditor', () => {
  it('renders without crashing', () => {
    const { container } = render(<CodeEditor value="console.log('hello')" language="javascript" />)
    expect(container.querySelector('.cm-editor')).toBeInTheDocument()
  })
})

describe('FileTabs', () => {
  const files = [
    { id: 'file1.ts', name: 'file1.ts', language: 'typescript' },
    { id: 'file2.ts', name: 'file2.ts', language: 'typescript' },
  ]

  it('renders tabs', () => {
    render(<FileTabs files={files} activeFileId="file1.ts" onSelect={() => {}} />)
    expect(screen.getByText('file1.ts')).toBeInTheDocument()
    expect(screen.getByText('file2.ts')).toBeInTheDocument()
  })

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn()
    render(<FileTabs files={files} activeFileId="file1.ts" onSelect={onSelect} />)
    fireEvent.click(screen.getByText('file2.ts'))
    expect(onSelect).toHaveBeenCalledWith('file2.ts')
  })
})
