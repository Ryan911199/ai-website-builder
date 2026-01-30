import React, { useEffect, useRef } from 'react';
import { MessageItem } from './message-item';
import { type UIMessage } from 'ai';

interface MessageListProps {
  messages: UIMessage[];
  isLoading?: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}

      {isLoading && messages.length > 0 && messages[messages.length - 1]?.role !== 'assistant' && (
        <div className="flex justify-start p-4">
          <div className="bg-muted rounded-lg px-4 py-2 text-sm text-muted-foreground animate-pulse">
            Thinking...
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
