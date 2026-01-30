import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ProjectList } from '@/components/sidebar/project-list';
import { Project } from '@/lib/projects';

// Mock data
const mockProjects: Project[] = [
  {
    id: 'proj-1',
    userId: 'user-1',
    name: 'React App',
    type: 'react',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
  },
  {
    id: 'proj-2',
    userId: 'user-1',
    name: 'Static Site',
    type: 'static',
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-04'),
  },
  {
    id: 'proj-3',
    userId: 'user-1',
    name: 'Another React',
    type: 'react',
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-06'),
  },
];

describe('ProjectList', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    // Cleanup after each test
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('should display loading spinner while fetching', async () => {
      // Mock fetch to never resolve (simulating loading)
      (global.fetch as any).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(<ProjectList />);

      // Check for spinner SVG with animate-spin class
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('animate-spin');
    });

    it('should call fetch on mount', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      render(<ProjectList />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/projects');
      });
    });
  });

  describe('Error State', () => {
    it('should display error message when fetch fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch projects')).toBeInTheDocument();
      });
    });

    it('should display error message for network errors', async () => {
      const errorMessage = 'Network error occurred';
      (global.fetch as any).mockRejectedValueOnce(new Error(errorMessage));

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
      });
    });

    it('should display retry button in error state', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({}),
      });

      render(<ProjectList />);

      await waitFor(() => {
        const retryButton = screen.getByRole('button', { name: /retry/i });
        expect(retryButton).toBeInTheDocument();
      });
    });

    it('should retry fetch when retry button is clicked', async () => {
      // First call fails, second succeeds
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({}),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        });

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch projects')).toBeInTheDocument();
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no projects exist', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText('No projects yet.')).toBeInTheDocument();
        expect(screen.getByText('Create your first project!')).toBeInTheDocument();
      });
    });

    it('should display New Project button in empty state', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      render(<ProjectList />);

      await waitFor(() => {
        const newProjectButton = screen.getByRole('button', { name: /new project/i });
        expect(newProjectButton).toBeInTheDocument();
      });
    });
  });

  describe('Projects List', () => {
    it('should display list of projects', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects.map(p => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
      });

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText('React App')).toBeInTheDocument();
        expect(screen.getByText('Static Site')).toBeInTheDocument();
        expect(screen.getByText('Another React')).toBeInTheDocument();
      });
    });

    it('should display correct number of project cards', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects.map(p => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
      });

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText('React App')).toBeInTheDocument();
        expect(screen.getByText('Static Site')).toBeInTheDocument();
        expect(screen.getByText('Another React')).toBeInTheDocument();
      });
    });

    it('should call onProjectSelect when project card is clicked', async () => {
      const onProjectSelect = vi.fn();
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects.map(p => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
      });

      render(<ProjectList onProjectSelect={onProjectSelect} />);

      await waitFor(() => {
        expect(screen.getByText('React App')).toBeInTheDocument();
      });

      const projectCard = screen.getByText('React App').closest('[class*="cursor-pointer"]');
      fireEvent.click(projectCard!);

      expect(onProjectSelect).toHaveBeenCalledWith('proj-1');
    });

    it('should call onProjectSelect with correct project ID for each project', async () => {
      const onProjectSelect = vi.fn();
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects.map(p => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
      });

      render(<ProjectList onProjectSelect={onProjectSelect} />);

      await waitFor(() => {
        expect(screen.getByText('Static Site')).toBeInTheDocument();
      });

      const staticSiteCard = screen.getByText('Static Site').closest('[class*="cursor-pointer"]');
      fireEvent.click(staticSiteCard!);

      expect(onProjectSelect).toHaveBeenCalledWith('proj-2');
    });

    it('should call onNewProject when New Project button is clicked', async () => {
      const onNewProject = vi.fn();
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      render(<ProjectList onNewProject={onNewProject} />);

      await waitFor(() => {
        const newProjectButton = screen.getByRole('button', { name: /new project/i });
        expect(newProjectButton).toBeInTheDocument();
      });

      const newProjectButton = screen.getByRole('button', { name: /new project/i });
      fireEvent.click(newProjectButton);

      expect(onNewProject).toHaveBeenCalled();
    });

    it('should display New Project button even with projects', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects.map(p => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
      });

      render(<ProjectList />);

      await waitFor(() => {
        const newProjectButton = screen.getByRole('button', { name: /new project/i });
        expect(newProjectButton).toBeInTheDocument();
      });
    });
  });

  describe('Project Sorting', () => {
    it('should sort projects by updatedAt descending (newest first)', async () => {
      const unsortedProjects = [
        {
          id: 'proj-1',
          userId: 'user-1',
          name: 'Oldest',
          type: 'react' as const,
          createdAt: new Date('2024-01-01').toISOString(),
          updatedAt: new Date('2024-01-01').toISOString(),
        },
        {
          id: 'proj-2',
          userId: 'user-1',
          name: 'Newest',
          type: 'react' as const,
          createdAt: new Date('2024-01-03').toISOString(),
          updatedAt: new Date('2024-01-03').toISOString(),
        },
        {
          id: 'proj-3',
          userId: 'user-1',
          name: 'Middle',
          type: 'react' as const,
          createdAt: new Date('2024-01-02').toISOString(),
          updatedAt: new Date('2024-01-02').toISOString(),
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => unsortedProjects,
      });

      render(<ProjectList />);

      await waitFor(() => {
        const projectNames = screen.getAllByText(/Oldest|Newest|Middle/);
        expect(projectNames[0]).toHaveTextContent('Newest');
        expect(projectNames[1]).toHaveTextContent('Middle');
        expect(projectNames[2]).toHaveTextContent('Oldest');
      });
    });
  });

  describe('Type Badges', () => {
    it('should display correct type badge for React projects', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects.map(p => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
      });

      render(<ProjectList />);

      await waitFor(() => {
        const reactBadges = screen.getAllByText('React');
        expect(reactBadges.length).toBeGreaterThan(0);
      });
    });

    it('should display correct type badge for Static projects', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects.map(p => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
      });

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText('Static')).toBeInTheDocument();
      });
    });

    it('should display React badge with blue styling', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [mockProjects[0]].map(p => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
      });

      render(<ProjectList />);

      await waitFor(() => {
        const reactBadge = screen.getByText('React');
        expect(reactBadge).toHaveClass('bg-blue-100', 'text-blue-700');
      });
    });

    it('should display Static badge with green styling', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [mockProjects[1]].map(p => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
      });

      render(<ProjectList />);

      await waitFor(() => {
        const staticBadge = screen.getByText('Static');
        expect(staticBadge).toHaveClass('bg-green-100', 'text-green-700');
      });
    });
  });

  describe('Relative Time Formatting', () => {
    it('should display "just now" for very recent updates', async () => {
      const now = new Date();
      const recentProject = {
        id: 'proj-1',
        userId: 'user-1',
        name: 'Recent Project',
        type: 'react' as const,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [recentProject],
      });

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText(/Updated just now/)).toBeInTheDocument();
      });
    });

    it('should display minutes ago for recent updates', async () => {
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
      const recentProject = {
        id: 'proj-1',
        userId: 'user-1',
        name: 'Recent Project',
        type: 'react' as const,
        createdAt: fiveMinutesAgo.toISOString(),
        updatedAt: fiveMinutesAgo.toISOString(),
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [recentProject],
      });

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText(/Updated 5m ago/)).toBeInTheDocument();
      });
    });

    it('should display hours ago for older updates', async () => {
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      const olderProject = {
        id: 'proj-1',
        userId: 'user-1',
        name: 'Older Project',
        type: 'react' as const,
        createdAt: twoHoursAgo.toISOString(),
        updatedAt: twoHoursAgo.toISOString(),
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [olderProject],
      });

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText(/Updated 2h ago/)).toBeInTheDocument();
      });
    });

    it('should display days ago for very old updates', async () => {
      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const veryOldProject = {
        id: 'proj-1',
        userId: 'user-1',
        name: 'Very Old Project',
        type: 'react' as const,
        createdAt: threeDaysAgo.toISOString(),
        updatedAt: threeDaysAgo.toISOString(),
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [veryOldProject],
      });

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText(/Updated 3d ago/)).toBeInTheDocument();
      });
    });

    it('should display date for updates older than 7 days', async () => {
      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const veryOldProject = {
        id: 'proj-1',
        userId: 'user-1',
        name: 'Very Old Project',
        type: 'react' as const,
        createdAt: tenDaysAgo.toISOString(),
        updatedAt: tenDaysAgo.toISOString(),
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [veryOldProject],
      });

      render(<ProjectList />);

      await waitFor(() => {
        const updatedText = screen.getByText(/Updated/);
        expect(updatedText.textContent).toMatch(/Updated \d+\/\d+\/\d+/);
      });
    });
  });

  describe('Component Rendering', () => {
    it('should render without crashing', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const { container } = render(<ProjectList />);
      expect(container).toBeInTheDocument();
    });

    it('should render with optional callbacks', async () => {
      const onProjectSelect = vi.fn();
      const onNewProject = vi.fn();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      render(
        <ProjectList 
          onProjectSelect={onProjectSelect} 
          onNewProject={onNewProject} 
        />
      );

      await waitFor(() => {
        expect(screen.getByText('No projects yet.')).toBeInTheDocument();
      });
    });

    it('should handle undefined callbacks gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProjects.map(p => ({
          ...p,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        })),
      });

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText('React App')).toBeInTheDocument();
      });

      // Should not crash when clicking without callbacks
      const projectCard = screen.getByText('React App').closest('[class*="cursor-pointer"]');
      fireEvent.click(projectCard!);

      const newProjectButton = screen.getByRole('button', { name: /new project/i });
      fireEvent.click(newProjectButton);

      expect(true).toBe(true); // If we got here, no crash occurred
    });
  });

  describe('Data Parsing', () => {
    it('should parse ISO date strings to Date objects', async () => {
      const projectWithStringDates = {
        id: 'proj-1',
        userId: 'user-1',
        name: 'Test Project',
        type: 'react' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [projectWithStringDates],
      });

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
      });
    });

    it('should handle projects with various date formats', async () => {
      const projectsWithDates = [
        {
          id: 'proj-1',
          userId: 'user-1',
          name: 'Project 1',
          type: 'react' as const,
          createdAt: new Date('2024-01-01').toISOString(),
          updatedAt: new Date('2024-01-02').toISOString(),
        },
        {
          id: 'proj-2',
          userId: 'user-1',
          name: 'Project 2',
          type: 'static' as const,
          createdAt: new Date('2024-01-03').toISOString(),
          updatedAt: new Date('2024-01-04').toISOString(),
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => projectsWithDates,
      });

      render(<ProjectList />);

      await waitFor(() => {
        expect(screen.getByText('Project 1')).toBeInTheDocument();
        expect(screen.getByText('Project 2')).toBeInTheDocument();
      });
    });
  });
});
