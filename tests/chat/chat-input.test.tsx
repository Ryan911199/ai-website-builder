import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from '@/components/chat/chat-input';
import { describe, it, expect, vi } from 'vitest';

describe('ChatInput', () => {
  it('renders input and button', () => {
    const handleInputChange = vi.fn();
    const handleSubmit = vi.fn();

    render(
      <ChatInput 
        input="" 
        handleInputChange={handleInputChange} 
        handleSubmit={handleSubmit} 
        isLoading={false} 
      />
    );

    expect(screen.getByPlaceholderText('Describe your website...')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls handleInputChange on typing', () => {
    const handleInputChange = vi.fn();
    const handleSubmit = vi.fn();

    render(
      <ChatInput 
        input="" 
        handleInputChange={handleInputChange} 
        handleSubmit={handleSubmit} 
        isLoading={false} 
      />
    );

    const textarea = screen.getByPlaceholderText('Describe your website...');
    fireEvent.change(textarea, { target: { value: 'test' } });

    expect(handleInputChange).toHaveBeenCalled();
  });

  it('calls handleSubmit on button click', () => {
    const handleInputChange = vi.fn();
    const handleSubmit = vi.fn((e) => e.preventDefault());

    render(
      <ChatInput 
        input="test message" 
        handleInputChange={handleInputChange} 
        handleSubmit={handleSubmit} 
        isLoading={false} 
      />
    );

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(handleSubmit).toHaveBeenCalled();
  });

  it('disables input when loading', () => {
    const handleInputChange = vi.fn();
    const handleSubmit = vi.fn();

    render(
      <ChatInput 
        input="" 
        handleInputChange={handleInputChange} 
        handleSubmit={handleSubmit} 
        isLoading={true} 
      />
    );

    expect(screen.getByPlaceholderText('Describe your website...')).toBeDisabled();
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
