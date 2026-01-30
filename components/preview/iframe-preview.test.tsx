import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IframePreview } from './iframe-preview';

describe('IframePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders iframe with sandbox attributes', () => {
    render(<IframePreview html="<h1>Test</h1>" />);
    const iframe = screen.getByTitle('Preview') as HTMLIFrameElement;
    
    expect(iframe).toBeInTheDocument();
    expect(iframe.getAttribute('sandbox')).toContain('allow-scripts');
    expect(iframe.getAttribute('sandbox')).toContain('allow-same-origin');
  });

  it('renders refresh button', () => {
    render(<IframePreview html="<h1>Test</h1>" />);
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    
    expect(refreshButton).toBeInTheDocument();
  });

  it('combines HTML, CSS, and JS in srcdoc', () => {
    const html = '<h1>Hello</h1>';
    const css = 'h1 { color: red; }';
    const js = 'console.log("test");';
    
    render(<IframePreview html={html} css={css} js={js} />);
    const iframe = screen.getByTitle('Preview') as HTMLIFrameElement;
    
    expect(iframe.srcdoc).toContain(html);
    expect(iframe.srcdoc).toContain(css);
    expect(iframe.srcdoc).toContain(js);
  });

  it('includes DOCTYPE and proper HTML structure', () => {
    render(<IframePreview html="<p>Test</p>" />);
    const iframe = screen.getByTitle('Preview') as HTMLIFrameElement;
    
    expect(iframe.srcdoc).toContain('<!DOCTYPE html>');
    expect(iframe.srcdoc).toContain('<html');
    expect(iframe.srcdoc).toContain('<head>');
    expect(iframe.srcdoc).toContain('<body>');
  });

  it('includes error handling script', () => {
    render(<IframePreview html="<p>Test</p>" />);
    const iframe = screen.getByTitle('Preview') as HTMLIFrameElement;
    
    expect(iframe.srcdoc).toContain('window.addEventListener(\'error\'');
    expect(iframe.srcdoc).toContain('window.parent.postMessage');
  });

  it('updates srcdoc when props change', async () => {
    const { rerender } = render(<IframePreview html="<h1>First</h1>" />);
    const iframe = screen.getByTitle('Preview') as HTMLIFrameElement;
    const firstSrcdoc = iframe.srcdoc;
    
    rerender(<IframePreview html="<h1>Second</h1>" />);
    
    await waitFor(() => {
      expect(iframe.srcdoc).not.toBe(firstSrcdoc);
      expect(iframe.srcdoc).toContain('Second');
    });
  });

  it('handles refresh button click', async () => {
    const { rerender } = render(<IframePreview html="<h1>Test</h1>" />);
    const iframe = screen.getByTitle('Preview') as HTMLIFrameElement;
    const initialSrcdoc = iframe.srcdoc;
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(iframe.srcdoc).toBe(initialSrcdoc);
    });
  });

  it('displays error message when postMessage error is received', async () => {
    render(<IframePreview html="<h1>Test</h1>" />);
    
    const errorMessage = 'Test error message';
    window.postMessage({ type: 'error', message: errorMessage }, '*');
    
    await waitFor(() => {
      expect(screen.getByText(new RegExp(errorMessage))).toBeInTheDocument();
    });
  });

  it('clears error on refresh', async () => {
    render(<IframePreview html="<h1>Test</h1>" />);
    
    window.postMessage({ type: 'error', message: 'Test error' }, '*');
    
    await waitFor(() => {
      expect(screen.getByText(/Test error/)).toBeInTheDocument();
    });
    
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);
    
    await waitFor(() => {
      expect(screen.queryByText(/Test error/)).not.toBeInTheDocument();
    });
  });

  it('renders with custom className', () => {
    const { container } = render(
      <IframePreview html="<h1>Test</h1>" className="custom-class" />
    );
    
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('custom-class');
  });

  it('includes viewport meta tag for responsive design', () => {
    render(<IframePreview html="<h1>Test</h1>" />);
    const iframe = screen.getByTitle('Preview') as HTMLIFrameElement;
    
    expect(iframe.srcdoc).toContain('viewport');
    expect(iframe.srcdoc).toContain('width=device-width');
  });

  it('prevents parent window access via sandbox', () => {
    render(<IframePreview html="<h1>Test</h1>" />);
    const iframe = screen.getByTitle('Preview') as HTMLIFrameElement;
    const sandboxAttr = iframe.getAttribute('sandbox') || '';
    
    expect(sandboxAttr).toContain('allow-scripts');
    expect(sandboxAttr).toContain('allow-same-origin');
    expect(sandboxAttr).not.toContain('allow-top-navigation');
    expect(sandboxAttr).not.toContain('allow-forms');
  });
});
