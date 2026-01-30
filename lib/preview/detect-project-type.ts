import { ParsedFile } from '@/lib/ai/parse-files';

export type ProjectType = 'react' | 'static-html' | 'unknown';

export function detectProjectType(files: ParsedFile[]): ProjectType {
  const hasReactFiles = files.some(
    (f) => f.path.endsWith('.tsx') || f.path.endsWith('.jsx')
  );

  const hasPackageJson = files.some((f) => f.path === 'package.json');

  const hasHtmlFiles = files.some((f) => f.path.endsWith('.html'));

  if (hasReactFiles || hasPackageJson) {
    return 'react';
  }

  if (hasHtmlFiles) {
    return 'static-html';
  }

  return 'unknown';
}

export function extractStaticFiles(files: ParsedFile[]): {
  html: string;
  css: string;
  js: string;
} {
  let html = '';
  let css = '';
  let js = '';

  files.forEach((file) => {
    if (file.path.endsWith('.html')) {
      html = file.content;
    } else if (file.path.endsWith('.css')) {
      css = file.content;
    } else if (file.path.endsWith('.js')) {
      js = file.content;
    }
  });

  return { html, css, js };
}
