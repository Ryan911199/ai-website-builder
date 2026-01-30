import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeToggle } from './theme-toggle';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next-themes
const mockSetTheme = vi.fn();
let mockTheme = 'light';

vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: mockTheme,
    setTheme: mockSetTheme,
  }),
}));

describe('ThemeToggle', () => {
  beforeEach(() => {
    mockSetTheme.mockClear();
    mockTheme = 'light';
  });

  it('renders toggle button', async () => {
    render(<ThemeToggle />);
    // Wait for useEffect to run and mount the component
    const button = await screen.findByRole('button', { name: /toggle theme/i });
    expect(button).toBeInTheDocument();
  });

  it('toggles theme from light to dark', async () => {
    render(<ThemeToggle />);
    const button = await screen.findByRole('button', { name: /toggle theme/i });
    
    fireEvent.click(button);
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('toggles theme from dark to light', async () => {
    mockTheme = 'dark';
    render(<ThemeToggle />);
    const button = await screen.findByRole('button', { name: /toggle theme/i });
    
    fireEvent.click(button);
    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });
});
