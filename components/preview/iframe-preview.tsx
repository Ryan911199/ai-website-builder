'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface IframePreviewProps {
  html?: string;
  css?: string;
  js?: string;
  className?: string;
}

export function IframePreview({ html = '', css = '', js = '', className }: IframePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState<string | null>(null);

  // Combine HTML, CSS, and JS into a complete document
  const buildSrcdoc = () => {
    const srcdoc = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: #fff;
      color: #000;
    }
    ${css}
  </style>
</head>
<body>
  ${html}
  <script>
    // Setup error handling
    window.addEventListener('error', (event) => {
      window.parent.postMessage({
        type: 'error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
      }, '*');
    });

    window.addEventListener('unhandledrejection', (event) => {
      window.parent.postMessage({
        type: 'error',
        message: 'Unhandled Promise Rejection: ' + event.reason,
      }, '*');
    });

    ${js}
  </script>
</body>
</html>
    `.trim();
    return srcdoc;
  };

  // Handle messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'error') {
        setError(event.data.message);
        console.error('Preview error:', event.data);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Refresh iframe
  const handleRefresh = () => {
    setError(null);
    if (iframeRef.current) {
      iframeRef.current.srcdoc = buildSrcdoc();
    }
  };

  // Initial load
  useEffect(() => {
    handleRefresh();
  }, [html, css, js]);

  return (
    <div className={cn('flex flex-col h-full bg-background border border-border rounded-lg overflow-hidden', className)}>
      {/* Header with refresh button */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
        <span className="text-sm font-medium text-muted-foreground">Preview</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="h-8 w-8 p-0"
          title="Refresh preview"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-3 bg-destructive/10 border-b border-destructive/20 text-sm text-destructive">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* iframe container */}
      <div className="flex-1 overflow-hidden">
        <iframe
          ref={iframeRef}
          title="Preview"
          sandbox="allow-scripts allow-same-origin"
          className="w-full h-full border-none"
          srcDoc={buildSrcdoc()}
        />
      </div>
    </div>
  );
}
