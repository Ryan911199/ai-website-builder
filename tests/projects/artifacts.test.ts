import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import * as schema from '../../lib/db/schema';
import path from 'path';
import { nanoid } from 'nanoid';

let db: ReturnType<typeof drizzle>;
let sqlite: Database.Database;
const testDbPath = path.join(process.cwd(), 'data', 'test-artifacts.db');

let testProjectId: string;

type Artifact = typeof schema.artifacts.$inferSelect;

interface ArtifactInput {
  path: string;
  content: string;
  language: string;
}

async function saveArtifacts(
  projectId: string,
  files: ArtifactInput[]
): Promise<Artifact[]> {
  if (!files || files.length === 0) {
    return [];
  }

  await db.delete(schema.artifacts).where(eq(schema.artifacts.projectId, projectId));

  const now = new Date();
  const artifactsToInsert = files.map((file) => ({
    id: nanoid(),
    projectId,
    filePath: file.path,
    content: file.content,
    language: file.language,
    updatedAt: now,
  }));

  const result = await db
    .insert(schema.artifacts)
    .values(artifactsToInsert)
    .returning();

  return result;
}

async function getArtifacts(projectId: string): Promise<Artifact[]> {
  const result = await db
    .select()
    .from(schema.artifacts)
    .where(eq(schema.artifacts.projectId, projectId));

  return result;
}

describe('Artifacts Service', () => {
  beforeEach(() => {
    sqlite = new Database(testDbPath);
    sqlite.pragma('journal_mode = WAL');
    db = drizzle(sqlite, { schema });

    const migrations = `
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        chat_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        file_path TEXT NOT NULL,
        content TEXT NOT NULL,
        language TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        files TEXT NOT NULL,
        message_id TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_settings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        claude_api_key TEXT,
        minimax_api_key TEXT,
        selected_provider TEXT DEFAULT 'claude',
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `;

    migrations.split(';').forEach((sql) => {
      if (sql.trim()) {
        sqlite.exec(sql);
      }
    });

    testProjectId = nanoid();
    const userId = nanoid();
    const now = new Date().getTime();

    sqlite.prepare(`
      INSERT INTO users (id, password_hash, created_at)
      VALUES (?, ?, ?)
    `).run(userId, 'hashed-password', now);

    sqlite.prepare(`
      INSERT INTO projects (id, user_id, name, type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(testProjectId, userId, 'Test Project', 'react', now, now);
  });

  afterEach(() => {
    sqlite.close();
    try {
      const fs = require('fs');
      fs.unlinkSync(testDbPath);
      fs.unlinkSync(testDbPath + '-wal');
      fs.unlinkSync(testDbPath + '-shm');
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('saveArtifacts', () => {
    it('should save single artifact', async () => {
      const files = [
        {
          path: 'src/App.tsx',
          content: 'export default function App() {}',
          language: 'typescript',
        },
      ];

      const result = await saveArtifacts(testProjectId, files);

      expect(result).toHaveLength(1);
      expect(result[0].filePath).toBe('src/App.tsx');
      expect(result[0].content).toBe('export default function App() {}');
      expect(result[0].language).toBe('typescript');
      expect(result[0].projectId).toBe(testProjectId);
    });

    it('should save multiple artifacts', async () => {
      const files = [
        {
          path: 'src/App.tsx',
          content: 'export default function App() {}',
          language: 'typescript',
        },
        {
          path: 'src/index.css',
          content: 'body { margin: 0; }',
          language: 'css',
        },
        {
          path: 'index.html',
          content: '<html><body></body></html>',
          language: 'html',
        },
      ];

      const result = await saveArtifacts(testProjectId, files);

      expect(result).toHaveLength(3);
      expect(result[0].filePath).toBe('src/App.tsx');
      expect(result[1].filePath).toBe('src/index.css');
      expect(result[2].filePath).toBe('index.html');
    });

    it('should generate unique IDs for each artifact', async () => {
      const files = [
        {
          path: 'src/App.tsx',
          content: 'export default function App() {}',
          language: 'typescript',
        },
        {
          path: 'src/index.css',
          content: 'body { margin: 0; }',
          language: 'css',
        },
      ];

      const result = await saveArtifacts(testProjectId, files);

      expect(result[0].id).not.toBe(result[1].id);
    });

    it('should set updatedAt timestamp', async () => {
      const files = [
        {
          path: 'src/App.tsx',
          content: 'export default function App() {}',
          language: 'typescript',
        },
      ];

      const result = await saveArtifacts(testProjectId, files);

      expect(result[0].updatedAt).toBeInstanceOf(Date);
      expect(result[0].updatedAt.getTime()).toBeGreaterThan(0);
    });

    it('should replace existing artifacts', async () => {
      const files1 = [
        {
          path: 'src/App.tsx',
          content: 'old content',
          language: 'typescript',
        },
      ];

      await saveArtifacts(testProjectId, files1);

      const files2 = [
        {
          path: 'src/App.tsx',
          content: 'new content',
          language: 'typescript',
        },
        {
          path: 'src/index.css',
          content: 'body { margin: 0; }',
          language: 'css',
        },
      ];

      const result = await saveArtifacts(testProjectId, files2);

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('new content');
    });

    it('should handle empty file array', async () => {
      const result = await saveArtifacts(testProjectId, []);

      expect(result).toEqual([]);
    });

    it('should preserve all file properties', async () => {
      const files = [
        {
          path: 'src/App.tsx',
          content: 'export default function App() {}',
          language: 'typescript',
        },
      ];

      const result = await saveArtifacts(testProjectId, files);

      expect(result[0].filePath).toBe('src/App.tsx');
      expect(result[0].content).toBe('export default function App() {}');
      expect(result[0].language).toBe('typescript');
      expect(result[0].projectId).toBe(testProjectId);
    });

    it('should support different languages', async () => {
      const files = [
        { path: 'app.tsx', content: 'tsx', language: 'typescript' },
        { path: 'app.jsx', content: 'jsx', language: 'javascript' },
        { path: 'style.css', content: 'css', language: 'css' },
        { path: 'index.html', content: 'html', language: 'html' },
      ];

      const result = await saveArtifacts(testProjectId, files);

      expect(result[0].language).toBe('typescript');
      expect(result[1].language).toBe('javascript');
      expect(result[2].language).toBe('css');
      expect(result[3].language).toBe('html');
    });
  });

  describe('getArtifacts', () => {
    it('should retrieve saved artifacts', async () => {
      const files = [
        {
          path: 'src/App.tsx',
          content: 'export default function App() {}',
          language: 'typescript',
        },
      ];

      await saveArtifacts(testProjectId, files);
      const result = await getArtifacts(testProjectId);

      expect(result).toHaveLength(1);
      expect(result[0].filePath).toBe('src/App.tsx');
    });

    it('should retrieve multiple artifacts', async () => {
      const files = [
        {
          path: 'src/App.tsx',
          content: 'export default function App() {}',
          language: 'typescript',
        },
        {
          path: 'src/index.css',
          content: 'body { margin: 0; }',
          language: 'css',
        },
      ];

      await saveArtifacts(testProjectId, files);
      const result = await getArtifacts(testProjectId);

      expect(result).toHaveLength(2);
    });

    it('should return empty array for project with no artifacts', async () => {
      const result = await getArtifacts(testProjectId);

      expect(result).toEqual([]);
    });

    it('should filter artifacts by projectId', async () => {
      const files = [
        {
          path: 'src/App.tsx',
          content: 'export default function App() {}',
          language: 'typescript',
        },
      ];

      await saveArtifacts(testProjectId, files);

      const otherProjectId = nanoid();
      const userId = nanoid();
      const now = new Date().getTime();

      sqlite.prepare(`
        INSERT INTO users (id, password_hash, created_at)
        VALUES (?, ?, ?)
      `).run(userId, 'hashed-password', now);

      sqlite.prepare(`
        INSERT INTO projects (id, user_id, name, type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(otherProjectId, userId, 'Other Project', 'static', now, now);

      const otherFiles = [
        {
          path: 'other.tsx',
          content: 'other content',
          language: 'typescript',
        },
      ];

      await saveArtifacts(otherProjectId, otherFiles);

      const result = await getArtifacts(testProjectId);

      expect(result).toHaveLength(1);
      expect(result[0].filePath).toBe('src/App.tsx');
    });

    it('should preserve artifact data on retrieval', async () => {
      const files = [
        {
          path: 'src/App.tsx',
          content: 'export default function App() {}',
          language: 'typescript',
        },
      ];

      const saved = await saveArtifacts(testProjectId, files);
      const retrieved = await getArtifacts(testProjectId);

      expect(retrieved[0].id).toBe(saved[0].id);
      expect(retrieved[0].filePath).toBe(saved[0].filePath);
      expect(retrieved[0].content).toBe(saved[0].content);
      expect(retrieved[0].language).toBe(saved[0].language);
    });
  });

  describe('Integration', () => {
    it('should handle save and retrieve cycle', async () => {
      const files = [
        {
          path: 'src/App.tsx',
          content: 'export default function App() {}',
          language: 'typescript',
        },
        {
          path: 'src/index.css',
          content: 'body { margin: 0; }',
          language: 'css',
        },
      ];

      await saveArtifacts(testProjectId, files);
      const result = await getArtifacts(testProjectId);

      expect(result).toHaveLength(2);
      expect(result.every((a) => a.projectId === testProjectId)).toBe(true);
    });

    it('should handle multiple updates', async () => {
      const files1 = [
        {
          path: 'src/App.tsx',
          content: 'version 1',
          language: 'typescript',
        },
      ];

      await saveArtifacts(testProjectId, files1);
      let result = await getArtifacts(testProjectId);
      expect(result).toHaveLength(1);

      const files2 = [
        {
          path: 'src/App.tsx',
          content: 'version 2',
          language: 'typescript',
        },
        {
          path: 'src/index.css',
          content: 'new file',
          language: 'css',
        },
      ];

      await saveArtifacts(testProjectId, files2);
      result = await getArtifacts(testProjectId);

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('version 2');
    });

    it('should isolate artifacts by project', async () => {
      const projectId1 = testProjectId;
      const projectId2 = nanoid();

      const userId = nanoid();
      const now = new Date().getTime();

      sqlite.prepare(`
        INSERT INTO users (id, password_hash, created_at)
        VALUES (?, ?, ?)
      `).run(userId, 'hashed-password', now);

      sqlite.prepare(`
        INSERT INTO projects (id, user_id, name, type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(projectId2, userId, 'Project 2', 'static', now, now);

      const files1 = [
        {
          path: 'src/App.tsx',
          content: 'project 1',
          language: 'typescript',
        },
      ];

      const files2 = [
        {
          path: 'index.html',
          content: 'project 2',
          language: 'html',
        },
      ];

      await saveArtifacts(projectId1, files1);
      await saveArtifacts(projectId2, files2);

      const result1 = await getArtifacts(projectId1);
      const result2 = await getArtifacts(projectId2);

      expect(result1).toHaveLength(1);
      expect(result2).toHaveLength(1);
      expect(result1[0].filePath).toBe('src/App.tsx');
      expect(result2[0].filePath).toBe('index.html');
    });
  });
});
