import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { VersionHistory } from '../../components/sidebar/version-history';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

global.fetch = vi.fn();

describe('VersionHistory', () => {
  const mockSnapshots = [
    {
      id: '1',
      projectId: 'proj-1',
      files: '{}',
      messageId: 'msg-1',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      id: '2',
      projectId: 'proj-1',
      files: '{}',
      messageId: 'msg-2',
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no project selected', () => {
    render(<VersionHistory projectId={null} />);
    expect(screen.getByText('Select a project to view history')).toBeInTheDocument();
  });

  it('shows loading state initially', async () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));
    const { container } = render(<VersionHistory projectId="proj-1" />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('fetches and displays snapshots', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSnapshots,
    });

    render(<VersionHistory projectId="proj-1" />);

    await waitFor(() => {
      expect(screen.getByText(new Date(mockSnapshots[1].createdAt).toLocaleString())).toBeInTheDocument();
    });
    
    expect(global.fetch).toHaveBeenCalledWith('/api/projects/proj-1/snapshots');
  });

  it('sorts snapshots by date descending', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSnapshots,
    });

    render(<VersionHistory projectId="proj-1" />);

    await waitFor(() => {
      const dates = screen.getAllByText(/ago|just now/);
      expect(dates[0]).toHaveTextContent('5m ago');
      expect(dates[1]).toHaveTextContent('1d ago');
    });
  });

  it('handles fetch error', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
    });

    render(<VersionHistory projectId="proj-1" />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch snapshots')).toBeInTheDocument();
    });
  });

  it('shows retry button on error', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
    });

    render(<VersionHistory projectId="proj-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  it('retry button triggers re-fetch', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
    });

    render(<VersionHistory projectId="proj-1" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSnapshots,
    });

    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText(new Date(mockSnapshots[1].createdAt).toLocaleString())).toBeInTheDocument();
    });
    
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('handles empty snapshots list', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(<VersionHistory projectId="proj-1" />);

    await waitFor(() => {
      expect(screen.getByText('No snapshots yet.')).toBeInTheDocument();
    });
  });

  it('handles restore action success', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSnapshots,
    });

    const onRestore = vi.fn();
    render(<VersionHistory projectId="proj-1" onRestore={onRestore} />);

    await waitFor(() => {
      expect(screen.getAllByTitle('Restore this version')).toHaveLength(2);
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
    });

    const restoreButtons = screen.getAllByTitle('Restore this version');
    fireEvent.click(restoreButtons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/projects/proj-1/snapshots/2/restore', expect.objectContaining({
        method: 'POST',
      }));
    });
  });

  it('calls onRestore callback after success', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSnapshots,
    });

    const onRestore = vi.fn();
    render(<VersionHistory projectId="proj-1" onRestore={onRestore} />);

    await waitFor(() => {
      expect(screen.getAllByTitle('Restore this version')).toHaveLength(2);
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
    });

    const restoreButtons = screen.getAllByTitle('Restore this version');
    fireEvent.click(restoreButtons[0]);

    await waitFor(() => {
      expect(onRestore).toHaveBeenCalledWith('2');
    });
  });

  it('shows success toast on restore success', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSnapshots,
    });

    render(<VersionHistory projectId="proj-1" />);

    await waitFor(() => {
      expect(screen.getAllByTitle('Restore this version')).toHaveLength(2);
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
    });

    const restoreButtons = screen.getAllByTitle('Restore this version');
    fireEvent.click(restoreButtons[0]);

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Snapshot restored successfully');
    });
  });

  it('handles restore action failure', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSnapshots,
    });

    render(<VersionHistory projectId="proj-1" />);

    await waitFor(() => {
      expect(screen.getAllByTitle('Restore this version')).toHaveLength(2);
    });

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
    });

    const restoreButtons = screen.getAllByTitle('Restore this version');
    fireEvent.click(restoreButtons[0]);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to restore snapshot');
    });
  });

  it('disables restore button while restoring', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSnapshots,
    });

    render(<VersionHistory projectId="proj-1" />);

    await waitFor(() => {
      expect(screen.getAllByTitle('Restore this version')).toHaveLength(2);
    });

    (global.fetch as any).mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve({ ok: true }), 100)));

    const restoreButtons = screen.getAllByTitle('Restore this version');
    fireEvent.click(restoreButtons[0]);

    expect(restoreButtons[0]).toBeDisabled();
  });

  it('shows loading spinner on restore button while restoring', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSnapshots,
    });

    render(<VersionHistory projectId="proj-1" />);

    await waitFor(() => {
      expect(screen.getAllByTitle('Restore this version')).toHaveLength(2);
    });

    (global.fetch as any).mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve({ ok: true }), 100)));

    const restoreButtons = screen.getAllByTitle('Restore this version');
    fireEvent.click(restoreButtons[0]);

    expect(restoreButtons[0].querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('formats relative time correctly', async () => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const snapshots = [
      {
        id: '1',
        projectId: 'proj-1',
        files: '{}',
        messageId: 'msg-1',
        createdAt: oneMinuteAgo.toISOString(),
      },
      {
        id: '2',
        projectId: 'proj-1',
        files: '{}',
        messageId: 'msg-2',
        createdAt: oneHourAgo.toISOString(),
      },
    ];

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => snapshots,
    });

    render(<VersionHistory projectId="proj-1" />);

    await waitFor(() => {
      expect(screen.getByText('1m ago')).toBeInTheDocument();
      expect(screen.getByText('1h ago')).toBeInTheDocument();
    });
  });
});
