# AI Website Builder

An intelligent web-based platform that transforms natural language descriptions into fully functional websites. Users describe their vision in chat, see live previews, iterate with AI assistance, and deploy with a single click.

## Features

- **Natural Language to Code**: Describe your website in plain English, and AI generates production-ready React or static HTML/CSS/JS code
- **Live Preview**: See your website update in real-time as code is generated (Sandpack for React, iframe for static HTML)
- **Streaming AI Responses**: Watch code generation happen in real-time with streaming responses
- **Multi-Provider AI**: Choose between Claude (Anthropic) and MiniMax 2.1 for code generation
- **Code Editor**: Built-in CodeMirror editor with syntax highlighting for TypeScript, JavaScript, HTML, and CSS
- **Project Persistence**: Save and resume projects anytime with auto-save every 30 seconds
- **Version History**: Create snapshots of your project and restore to any previous version
- **GitHub Integration**: Push generated code directly to GitHub repositories
- **Coolify Deployment**: Deploy to Coolify with one click and get a live URL within minutes
- **Secure Authentication**: Password-protected access with session management
- **Dark Mode**: Full dark mode support for comfortable development

## Tech Stack

### Frontend
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui components
- **Code Editor**: CodeMirror 6 with syntax highlighting
- **Preview**: Sandpack (React) + iframe sandbox (static HTML)
- **UI Components**: Radix UI, Lucide icons, Sonner toasts

### Backend
- **Runtime**: Bun
- **Database**: SQLite with Drizzle ORM
- **AI Integration**: Vercel AI SDK with custom providers
- **Authentication**: iron-session with bcrypt
- **Git Integration**: Octokit (GitHub API)

### Testing & Quality
- **Unit Tests**: Vitest with React Testing Library
- **E2E Tests**: Playwright
- **Linting**: ESLint 9
- **Formatting**: Prettier
- **Type Safety**: TypeScript strict mode

## Prerequisites

- **Bun** 1.0+ ([install](https://bun.sh))
- **Node.js** 20+ (for some tools)
- **Docker** (for production deployment)
- **Git** (for GitHub integration)

## Installation

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-website-builder
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   See [Environment Variables](#environment-variables) section below.

4. **Initialize database**
   ```bash
   bun run db:migrate
   ```

5. **Seed initial user (optional)**
   ```bash
   bun run db:seed
   ```

6. **Start development server**
   ```bash
   bun run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

### Required Variables

```env
# Authentication
AUTH_PASSWORD=your-secure-password-here

# AI Providers (at least one required)
ANTHROPIC_API_KEY=sk-ant-...
MINIMAX_API_KEY=your-minimax-key

# GitHub Integration
GITHUB_TOKEN=ghp_...
GITHUB_OWNER=your-github-username
GITHUB_REPO_PREFIX=ai-website-

# Coolify Deployment
COOLIFY_URL=https://coolify.example.com
COOLIFY_TOKEN=your-coolify-token
COOLIFY_PROJECT_UUID=project-uuid
COOLIFY_SERVER_UUID=server-uuid

# Database (optional, defaults to SQLite)
DATABASE_URL=file:./data.db

# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Optional Variables

```env
# Logging
LOG_LEVEL=info

# Session
SESSION_SECRET=your-random-secret-key

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
```

### AI Provider Configuration

#### Anthropic Claude
- Get API key from [console.anthropic.com](https://console.anthropic.com)
- Set `ANTHROPIC_API_KEY` in `.env.local`
- Recommended model: `claude-3-5-sonnet-20241022`

#### MiniMax 2.1
- Get API key from [minimax.chat](https://www.minimax.chat/)
- Set `MINIMAX_API_KEY` in `.env.local`
- Model: `minimax-01`

#### GitHub Token
- Create Personal Access Token at [github.com/settings/tokens](https://github.com/settings/tokens)
- Required scopes: `repo`, `workflow`
- Set `GITHUB_TOKEN` in `.env.local`

#### Coolify Token
- Generate API token in Coolify dashboard
- Set `COOLIFY_TOKEN` in `.env.local`
- Get project and server UUIDs from Coolify dashboard

## Development

### Running the Development Server

```bash
bun run dev
```

The application will be available at `http://localhost:3000`.

### Building for Production

```bash
bun run build
```

This creates an optimized production build in the `.next` directory.

### Starting Production Server

```bash
bun run start
```

### Code Quality

#### Linting
```bash
bun run lint
```

#### Formatting
```bash
bun run format
```

#### Type Checking
```bash
bunx tsc --noEmit
```

## Testing

### Unit & Integration Tests

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test --watch

# Run tests with UI
bun run test:ui

# Run specific test file
bun run test auth.test.ts
```

### E2E Tests

```bash
# Run all E2E tests
bun run test:e2e

# Run specific E2E test
bun run test:e2e chat-ui.spec.ts

# Run with UI
bunx playwright test --ui

# Generate test report
bunx playwright show-report
```

### Test Coverage

```bash
bun run test -- --coverage
```

## Database

### Schema

The application uses SQLite with Drizzle ORM. Key tables:

- **users**: User accounts with password hashes
- **projects**: Website projects (React or static)
- **chats**: Conversation history per project
- **messages**: Individual chat messages
- **artifacts**: Generated code files
- **snapshots**: Version history snapshots

### Migrations

```bash
# Run migrations
bun run db:migrate

# Push schema changes
bun run db:push

# Open Drizzle Studio
bun run db:studio
```

### Seeding

```bash
# Seed initial user
bun run db:seed
```

Default credentials after seeding:
- **Password**: `admin123` (change immediately in production)

## Production Deployment

### Docker Deployment

#### Build Docker Image

```bash
docker build -t ai-website-builder:latest .
```

#### Run Container

```bash
docker run -d \
  --name ai-website-builder \
  -p 3000:3000 \
  -e AUTH_PASSWORD=your-password \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -e GITHUB_TOKEN=ghp_... \
  -e COOLIFY_URL=https://coolify.example.com \
  -e COOLIFY_TOKEN=... \
  -v ai-website-builder-data:/app/data \
  ai-website-builder:latest
```

#### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      AUTH_PASSWORD: ${AUTH_PASSWORD}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      MINIMAX_API_KEY: ${MINIMAX_API_KEY}
      GITHUB_TOKEN: ${GITHUB_TOKEN}
      COOLIFY_URL: ${COOLIFY_URL}
      COOLIFY_TOKEN: ${COOLIFY_TOKEN}
      NODE_ENV: production
    volumes:
      - app-data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s

volumes:
  app-data:
```

Run with:
```bash
docker-compose up -d
```

### Environment Setup for Production

1. **Generate secure secrets**
   ```bash
   # Generate session secret
   openssl rand -base64 32
   
   # Generate strong password
   openssl rand -base64 16
   ```

2. **Set environment variables** in your deployment platform (Docker, Vercel, etc.)

3. **Database persistence**
   - Mount `/app/data` volume for SQLite database
   - Or configure PostgreSQL via `DATABASE_URL`

4. **SSL/TLS**
   - Use reverse proxy (nginx, Caddy) for HTTPS
   - Or deploy to Vercel/Coolify with automatic SSL

### Deployment Checklist

- [ ] All environment variables set
- [ ] Database migrations run
- [ ] Build succeeds: `bun run build`
- [ ] Tests pass: `bun run test && bun run test:e2e`
- [ ] Docker build succeeds: `docker build -t app .`
- [ ] Health check endpoint responds
- [ ] Logs are accessible
- [ ] Backups configured for database
- [ ] Monitoring/alerting set up

## Architecture

### Project Structure

```
ai-website-builder/
├── app/                    # Next.js App Router
│   ├── (auth)/            # Authentication pages
│   ├── (dashboard)/       # Protected dashboard
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── chat/              # Chat UI components
│   ├── editor/            # Code editor
│   ├── preview/           # Preview components
│   └── ui/                # shadcn/ui components
├── lib/                   # Utilities and services
│   ├── ai/                # AI providers and utilities
│   ├── auth/              # Authentication logic
│   ├── db/                # Database schema and queries
│   ├── github/            # GitHub integration
│   ├── coolify/           # Coolify API client
│   └── utils/             # Helper functions
├── tests/                 # Unit and integration tests
├── e2e/                   # E2E tests
├── public/                # Static assets
├── drizzle/               # Database migrations
└── docs/                  # Documentation
```

### Data Flow

1. **User Input** → Chat message
2. **AI Processing** → Stream response with code blocks
3. **File Parsing** → Extract files from AI response
4. **Preview Update** → Update Sandpack/iframe
5. **Auto-save** → Save to database every 30s
6. **Deployment** → Push to GitHub → Deploy via Coolify

## API Routes

### Authentication
- `POST /api/auth/login` - Login with password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/session` - Get current session

### Projects
- `GET /api/projects` - List user's projects
- `POST /api/projects` - Create new project
- `GET /api/projects/[id]` - Get project details
- `PUT /api/projects/[id]` - Update project
- `DELETE /api/projects/[id]` - Delete project

### Chat
- `POST /api/chat` - Stream chat response

### Deployment
- `POST /api/deploy/github` - Push to GitHub
- `POST /api/deploy/coolify` - Deploy to Coolify
- `GET /api/deploy/status/[id]` - Check deployment status

## Troubleshooting

### Common Issues

#### Port 3000 already in use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

#### Database locked
```bash
# Remove lock file
rm data.db-wal data.db-shm

# Restart application
bun run dev
```

#### AI API errors
- Check API keys in `.env.local`
- Verify API key has correct permissions
- Check rate limits and quota

#### Docker build fails
```bash
# Clear Docker cache
docker system prune -a

# Rebuild
docker build --no-cache -t ai-website-builder .
```

### Debug Mode

```bash
# Enable debug logging
DEBUG=* bun run dev

# Check database
bun run db:studio
```

## Performance Optimization

### Frontend
- Code splitting via Next.js dynamic imports
- Image optimization with next/image
- CSS minification with Tailwind
- JavaScript minification in production build

### Backend
- Database query optimization with Drizzle
- Response caching with HTTP headers
- Streaming responses for AI
- Connection pooling for database

### Deployment
- Multi-stage Docker build reduces image size
- Production dependencies only in final image
- Health checks for container orchestration
- Non-root user for security

## Security

### Best Practices Implemented

- **Password Hashing**: bcrypt with salt rounds
- **Session Management**: Secure HTTP-only cookies
- **CSRF Protection**: Built into Next.js
- **XSS Prevention**: React escaping + Content Security Policy
- **SQL Injection**: Drizzle ORM parameterized queries
- **Sandbox**: iframe with restricted permissions
- **Non-root User**: Docker runs as unprivileged user
- **Secrets Management**: Environment variables, never in code

### Security Checklist

- [ ] Change default password immediately
- [ ] Use strong, unique API keys
- [ ] Enable HTTPS in production
- [ ] Set secure session secret
- [ ] Restrict database access
- [ ] Monitor logs for suspicious activity
- [ ] Keep dependencies updated
- [ ] Regular security audits

## Contributing

### Development Workflow

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and test: `bun run test`
3. Format code: `bun run format`
4. Commit with clear message: `git commit -m "feat: description"`
5. Push and create pull request

### Code Standards

- TypeScript strict mode
- ESLint rules enforced
- Prettier formatting
- Test coverage >80%
- Meaningful commit messages

## License

MIT License - see LICENSE file for details

## Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Check existing documentation in `/docs`
- Review test files for usage examples

## Roadmap

### v2 Features (Future)
- Docker sandbox for backend code
- Vue/Svelte support
- Team collaboration
- Custom domain management
- Template marketplace
- OAuth authentication
- Visual drag-drop editor
- Build log streaming
- CI/CD pipeline integration

## Acknowledgments

- [Next.js](https://nextjs.org) - React framework
- [Vercel AI SDK](https://ai-sdk.dev) - AI integration
- [Sandpack](https://sandpack.codesandbox.io) - React preview
- [shadcn/ui](https://ui.shadcn.com) - UI components
- [Drizzle ORM](https://orm.drizzle.team) - Database ORM
- [Playwright](https://playwright.dev) - E2E testing
