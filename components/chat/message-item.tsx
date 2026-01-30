import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { User, Bot } from 'lucide-react';
import { type UIMessage } from 'ai';
import { parseAIResponse } from '@/lib/ai/parse-files';
import { detectProjectType, extractStaticFiles } from '@/lib/preview/detect-project-type';
import { IframePreview } from '@/components/preview/iframe-preview';

interface MessageItemProps {
  message: UIMessage;
}

function getMessageText(message: UIMessage): string {
  if (!message.parts || message.parts.length === 0) {
    return '';
  }
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('');
}

function renderContent(content: string, showPreview: boolean = false) {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return parts.map((part, index) => {
    if (part.startsWith('```') && part.endsWith('```')) {
      const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
      const language = match ? match[1] : '';
      const code = match ? match[2] : part.slice(3, -3);

      return (
        <pre
          key={index}
          className="bg-black/90 text-white p-4 rounded-md overflow-x-auto my-2 text-sm font-mono"
        >
          {language && <div className="text-xs text-gray-400 mb-1">{language}</div>}
          <code>{code}</code>
        </pre>
      );
    }

    return part.split('\n').map((line, i) => (
      <p key={`${index}-${i}`} className={cn('min-h-[1.5em]', i > 0 && 'mt-1')}>
        {line}
      </p>
    ));
  });
}

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user';
  const content = getMessageText(message);

  const { projectType, files, staticFiles } = useMemo(() => {
    try {
      const parsedFiles = parseAIResponse(content);
      const type = detectProjectType(parsedFiles);
      const statics = extractStaticFiles(parsedFiles);
      return { projectType: type, files: parsedFiles, staticFiles: statics };
    } catch {
      return { projectType: 'unknown', files: [], staticFiles: { html: '', css: '', js: '' } };
    }
  }, [content]);

  const hasPreview = !isUser && projectType === 'static-html' && staticFiles.html;

  if (!content) {
    return null;
  }

  return (
    <div className={cn('flex w-full gap-3 p-4', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-full border shadow',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-background'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div
        className={cn(
          'flex flex-col',
          isUser ? 'items-end max-w-[80%] lg:max-w-[70%]' : 'items-start w-full'
        )}
      >
        {hasPreview && (
          <div className="w-full max-w-2xl mb-4 h-96">
            <IframePreview
              html={staticFiles.html}
              css={staticFiles.css}
              js={staticFiles.js}
            />
          </div>
        )}

        <div
          className={cn(
            'rounded-lg px-4 py-3 text-sm shadow-sm',
            isUser
              ? 'bg-primary text-primary-foreground max-w-[80%] lg:max-w-[70%]'
              : 'bg-muted text-foreground border border-border',
            hasPreview && 'max-w-2xl'
          )}
        >
          {renderContent(content)}
        </div>
      </div>
    </div>
  );
}
