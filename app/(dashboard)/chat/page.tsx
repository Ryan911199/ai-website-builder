'use client';

import React, { useState, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { MessageList } from '@/components/chat/message-list';
import { ChatInput } from '@/components/chat/chat-input';
import { CodeEditor } from '@/components/editor/code-editor';
import { FileTabs } from '@/components/editor/file-tabs';
import { SandpackPreview } from '@/components/preview/sandpack-preview';
import { parseAIResponse, ParsedFile } from '@/lib/ai/parse-files';

export default function ChatPage() {
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<ParsedFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: '/api/chat' }),
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  useEffect(() => {
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistantMessage && lastAssistantMessage.parts) {
      const content = lastAssistantMessage.parts
        .filter((part) => part.type === 'text')
        .map((part) => (part.type === 'text' ? part.text : ''))
        .join('');
      const parsedFiles = parseAIResponse(content);
      if (parsedFiles.length > 0) {
        setFiles(parsedFiles);
        if (!activeFileId || !parsedFiles.find(f => f.path === activeFileId)) {
          setActiveFileId(parsedFiles[0].path);
        }
      }
    }
  }, [messages, activeFileId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage({ text: input });
      setInput('');
    }
  };

  const handleFileChange = (newContent: string) => {
    if (!activeFileId) return;
    setFiles(prev => prev.map(f => f.path === activeFileId ? { ...f, content: newContent } : f));
  };

  const activeFile = files.find(f => f.path === activeFileId);

  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex flex-col w-1/2 border-r h-full">
        <MessageList messages={messages} isLoading={isLoading} />
        <ChatInput
          input={input}
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
        />
      </div>
      <div className="flex flex-col w-1/2 h-full bg-background border-l">
        <div className="flex items-center justify-between border-b px-2 py-1 bg-muted/30">
          <div className="flex space-x-1">
            <button
              onClick={() => setViewMode('code')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'code'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:bg-background/50'
              }`}
            >
              Code
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'preview'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:bg-background/50'
              }`}
            >
              Preview
            </button>
          </div>
        </div>

        {viewMode === 'code' ? (
          files.length > 0 ? (
            <>
              <FileTabs
                files={files.map((f) => ({
                  id: f.path,
                  name: f.path,
                  language: f.language,
                }))}
                activeFileId={activeFileId}
                onSelect={setActiveFileId}
              />
              {activeFile && (
                <div className="flex-1 overflow-hidden">
                  <CodeEditor
                    value={activeFile.content}
                    language={activeFile.language}
                    onChange={handleFileChange}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No files to display
            </div>
          )
        ) : (
          <SandpackPreview
            code={
              (() => {
                const lastMsg = [...messages].reverse().find((m) => m.role === 'assistant');
                if (lastMsg && lastMsg.parts) {
                  return lastMsg.parts
                    .filter((part) => part.type === 'text')
                    .map((part) => (part.type === 'text' ? part.text : ''))
                    .join('');
                }
                return '';
              })()
            }
          />
        )}
      </div>
    </div>
  );
}
