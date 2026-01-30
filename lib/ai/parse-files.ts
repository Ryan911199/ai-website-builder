export interface ParsedFile {
  path: string;
  content: string;
  language: string;
}

/** Parse AI response with pattern: ```file:path/to/file.tsx\ncontent\n``` */
export function parseAIResponse(response: string): ParsedFile[] {
  const fileBlockRegex = /```file:([^\n]+)\n([\s\S]*?)```/g;
  const files: ParsedFile[] = [];

  let match;
  while ((match = fileBlockRegex.exec(response)) !== null) {
    const [, filePath, content] = match;
    const language = getLanguageFromPath(filePath);
    files.push({ path: filePath.trim(), content: content.trim(), language });
  }

  return files;
}

export function getLanguageFromPath(path: string): string {
  const lowerPath = path.toLowerCase();
  if (lowerPath.endsWith('.tsx')) return 'typescript';
  if (lowerPath.endsWith('.ts')) return 'typescript';
  if (lowerPath.endsWith('.jsx')) return 'javascript';
  if (lowerPath.endsWith('.js')) return 'javascript';
  if (lowerPath.endsWith('.html')) return 'html';
  if (lowerPath.endsWith('.css')) return 'css';
  if (lowerPath.endsWith('.json')) return 'json';
  if (lowerPath.endsWith('.md')) return 'markdown';
  return 'text';
}

export function buildFilesContext(files: ParsedFile[]): string {
  return files
    .map((file) => `\`\`\`file:${file.path}\n${file.content}\n\`\`\``)
    .join('\n\n');
}
