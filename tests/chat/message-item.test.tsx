import { render, screen } from '@testing-library/react';
import { MessageItem } from '@/components/chat/message-item';
import { describe, it, expect } from 'vitest';
import { type UIMessage } from 'ai';

function createMessage(overrides: Partial<UIMessage> = {}): UIMessage {
  return {
    id: '1',
    role: 'user',
    parts: [{ type: 'text', text: 'Hello' }],
    ...overrides,
  } as UIMessage;
}

describe('MessageItem', () => {
  it('renders user message correctly', () => {
    const message = createMessage({
      id: '1',
      role: 'user',
      parts: [{ type: 'text', text: 'Hello world' }],
    });

    render(<MessageItem message={message} />);

    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders assistant message correctly', () => {
    const message = createMessage({
      id: '2',
      role: 'assistant',
      parts: [{ type: 'text', text: 'Hi there' }],
    });

    render(<MessageItem message={message} />);

    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });

  it('renders code blocks correctly', () => {
    const message = createMessage({
      id: '3',
      role: 'assistant',
      parts: [{ type: 'text', text: 'Here is code:\n```javascript\nconsole.log("test");\n```' }],
    });

    render(<MessageItem message={message} />);

    expect(screen.getByText('Here is code:')).toBeInTheDocument();
    expect(screen.getByText('console.log("test");')).toBeInTheDocument();
    expect(screen.getByText('javascript')).toBeInTheDocument();
  });

  it('returns null for empty message', () => {
    const message = createMessage({
      id: '4',
      role: 'assistant',
      parts: [],
    });

    const { container } = render(<MessageItem message={message} />);

    expect(container.firstChild).toBeNull();
  });
});
