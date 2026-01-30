"use client";

import React, { useEffect, useState } from "react";
import { Sandpack, SandpackFile } from "@codesandbox/sandpack-react";
import { parseAIResponse } from "@/lib/ai/parse-files";
import { SANDPACK_TEMPLATE, SANDPACK_OPTIONS, SANDPACK_DEFAULT_FILES } from "@/lib/preview/sandpack-config";

interface SandpackPreviewProps {
  code: string;
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("SandpackPreview Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div className="p-4 text-red-500">Something went wrong with the preview.</div>;
    }

    return this.props.children;
  }
}

export function SandpackPreview({ code }: SandpackPreviewProps) {
  const [files, setFiles] = useState<Record<string, SandpackFile>>(SANDPACK_DEFAULT_FILES);
  const [debouncedCode, setDebouncedCode] = useState(code);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCode(code);
    }, 150);
    return () => clearTimeout(timer);
  }, [code]);

  useEffect(() => {
    try {
      const parsedFiles = parseAIResponse(debouncedCode);
      if (parsedFiles.length > 0) {
        const newFiles: Record<string, SandpackFile> = { ...SANDPACK_DEFAULT_FILES };
        
        parsedFiles.forEach((file) => {
          const path = file.path.startsWith("/") ? file.path : `/${file.path}`;
          newFiles[path] = { code: file.content };
        });
        
        setFiles(newFiles);
      }
    } catch (error) {
      console.error("Failed to parse AI response:", error);
    }
  }, [debouncedCode]);

  return (
    <ErrorBoundary>
      <div className="h-full w-full border rounded-lg overflow-hidden bg-white">
        <Sandpack
          template={SANDPACK_TEMPLATE}
          files={files}
          options={SANDPACK_OPTIONS}
          theme="light"
        />
      </div>
    </ErrorBoundary>
  );
}
