import { describe, it, expect } from 'vitest';
import {
  parseAIResponse,
  getLanguageFromPath,
  buildFilesContext,
  type ParsedFile,
} from '@/lib/ai/parse-files';

describe('parseAIResponse', () => {
  it('parses single file block', () => {
    const response = `Here is your code:

\`\`\`file:src/App.tsx
import React from 'react';

export default function App() {
  return <div>Hello</div>;
}
\`\`\``;

    const result = parseAIResponse(response);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('src/App.tsx');
    expect(result[0].language).toBe('typescript');
    expect(result[0].content).toContain("import React from 'react'");
  });

  it('parses multiple file blocks', () => {
    const response = `
\`\`\`file:src/App.tsx
export default function App() { return <div>App</div>; }
\`\`\`

\`\`\`file:src/index.css
body { margin: 0; }
\`\`\`

\`\`\`file:index.html
<!DOCTYPE html><html><body></body></html>
\`\`\``;

    const result = parseAIResponse(response);

    expect(result).toHaveLength(3);
    expect(result[0].path).toBe('src/App.tsx');
    expect(result[1].path).toBe('src/index.css');
    expect(result[2].path).toBe('index.html');
  });

  it('returns empty array for response without file blocks', () => {
    const response = 'This is just plain text with no code blocks.';
    const result = parseAIResponse(response);
    expect(result).toHaveLength(0);
  });

  it('ignores regular code blocks without file: prefix', () => {
    const response = `
\`\`\`javascript
console.log('hello');
\`\`\`

\`\`\`file:src/main.ts
export const main = () => {};
\`\`\``;

    const result = parseAIResponse(response);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('src/main.ts');
  });

  it('trims file paths and content', () => {
    const response = `\`\`\`file:  src/test.ts  

const x = 1;

\`\`\``;

    const result = parseAIResponse(response);

    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('src/test.ts');
    expect(result[0].content).toBe('const x = 1;');
  });
});

describe('getLanguageFromPath', () => {
  it('returns typescript for .ts files', () => {
    expect(getLanguageFromPath('src/utils.ts')).toBe('typescript');
  });

  it('returns typescript for .tsx files', () => {
    expect(getLanguageFromPath('components/Button.tsx')).toBe('typescript');
  });

  it('returns javascript for .js files', () => {
    expect(getLanguageFromPath('script.js')).toBe('javascript');
  });

  it('returns javascript for .jsx files', () => {
    expect(getLanguageFromPath('App.jsx')).toBe('javascript');
  });

  it('returns html for .html files', () => {
    expect(getLanguageFromPath('index.html')).toBe('html');
  });

  it('returns css for .css files', () => {
    expect(getLanguageFromPath('styles.css')).toBe('css');
  });

  it('returns json for .json files', () => {
    expect(getLanguageFromPath('package.json')).toBe('json');
  });

  it('returns markdown for .md files', () => {
    expect(getLanguageFromPath('README.md')).toBe('markdown');
  });

  it('returns text for unknown extensions', () => {
    expect(getLanguageFromPath('data.txt')).toBe('text');
    expect(getLanguageFromPath('config.yaml')).toBe('text');
  });

  it('handles case insensitively', () => {
    expect(getLanguageFromPath('App.TSX')).toBe('typescript');
    expect(getLanguageFromPath('style.CSS')).toBe('css');
  });
});

describe('buildFilesContext', () => {
  it('builds context string from files array', () => {
    const files: ParsedFile[] = [
      { path: 'src/App.tsx', content: 'export default App;', language: 'typescript' },
      { path: 'index.html', content: '<!DOCTYPE html>', language: 'html' },
    ];

    const result = buildFilesContext(files);

    expect(result).toContain('```file:src/App.tsx');
    expect(result).toContain('export default App;');
    expect(result).toContain('```file:index.html');
    expect(result).toContain('<!DOCTYPE html>');
  });

  it('returns empty string for empty files array', () => {
    const result = buildFilesContext([]);
    expect(result).toBe('');
  });
});
