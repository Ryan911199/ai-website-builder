import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import * as schema from '../../lib/db/schema';
import path from 'path';

let db: ReturnType<typeof drizzle>;
let sqlite: Database.Database;
const testDbPath = path.join(process.cwd(), 'data', 'test-sqlite.db');

describe('Database Schema', () => {
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
    `;

    migrations.split(';').forEach((sql) => {
      if (sql.trim()) {
        sqlite.exec(sql);
      }
    });
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

  describe('Users table', () => {
    it('should insert and retrieve a user', () => {
      const now = new Date();
      const userId = 'user-1';
      const passwordHash = 'hashed-password';

      sqlite.prepare(`
        INSERT INTO users (id, password_hash, created_at)
        VALUES (?, ?, ?)
      `).run(userId, passwordHash, now.getTime());

      const user = sqlite.prepare('SELECT * FROM users WHERE id = ?').get(userId);
      expect(user).toBeDefined();
      expect(user.id).toBe(userId);
      expect(user.password_hash).toBe(passwordHash);
    });

    it('should enforce primary key constraint', () => {
      const now = new Date();
      const userId = 'user-1';

      sqlite.prepare(`
        INSERT INTO users (id, password_hash, created_at)
        VALUES (?, ?, ?)
      `).run(userId, 'hash1', now.getTime());

      expect(() => {
        sqlite.prepare(`
          INSERT INTO users (id, password_hash, created_at)
          VALUES (?, ?, ?)
        `).run(userId, 'hash2', now.getTime());
      }).toThrow();
    });
  });

  describe('Projects table', () => {
    it('should insert and retrieve a project', () => {
      const now = new Date();
      const userId = 'user-1';
      const projectId = 'project-1';

      sqlite.prepare(`
        INSERT INTO users (id, password_hash, created_at)
        VALUES (?, ?, ?)
      `).run(userId, 'hash', now.getTime());

      sqlite.prepare(`
        INSERT INTO projects (id, user_id, name, type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(projectId, userId, 'My Project', 'react', now.getTime(), now.getTime());

      const project = sqlite.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
      expect(project).toBeDefined();
      expect(project.name).toBe('My Project');
      expect(project.type).toBe('react');
      expect(project.user_id).toBe(userId);
    });

    it('should cascade delete projects when user is deleted', () => {
      const now = new Date();
      const userId = 'user-1';
      const projectId = 'project-1';

      sqlite.prepare(`
        INSERT INTO users (id, password_hash, created_at)
        VALUES (?, ?, ?)
      `).run(userId, 'hash', now.getTime());

      sqlite.prepare(`
        INSERT INTO projects (id, user_id, name, type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(projectId, userId, 'My Project', 'react', now.getTime(), now.getTime());

      sqlite.prepare('DELETE FROM users WHERE id = ?').run(userId);

      const project = sqlite.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
      expect(project).toBeUndefined();
    });
  });

  describe('Chats table', () => {
    it('should insert and retrieve a chat', () => {
      const now = new Date();
      const userId = 'user-1';
      const projectId = 'project-1';
      const chatId = 'chat-1';

      sqlite.prepare(`
        INSERT INTO users (id, password_hash, created_at)
        VALUES (?, ?, ?)
      `).run(userId, 'hash', now.getTime());

      sqlite.prepare(`
        INSERT INTO projects (id, user_id, name, type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(projectId, userId, 'My Project', 'react', now.getTime(), now.getTime());

      sqlite.prepare(`
        INSERT INTO chats (id, project_id, created_at)
        VALUES (?, ?, ?)
      `).run(chatId, projectId, now.getTime());

      const chat = sqlite.prepare('SELECT * FROM chats WHERE id = ?').get(chatId);
      expect(chat).toBeDefined();
      expect(chat.project_id).toBe(projectId);
    });
  });

  describe('Messages table', () => {
    it('should insert and retrieve messages', () => {
      const now = new Date();
      const userId = 'user-1';
      const projectId = 'project-1';
      const chatId = 'chat-1';
      const messageId = 'msg-1';

      sqlite.prepare(`
        INSERT INTO users (id, password_hash, created_at)
        VALUES (?, ?, ?)
      `).run(userId, 'hash', now.getTime());

      sqlite.prepare(`
        INSERT INTO projects (id, user_id, name, type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(projectId, userId, 'My Project', 'react', now.getTime(), now.getTime());

      sqlite.prepare(`
        INSERT INTO chats (id, project_id, created_at)
        VALUES (?, ?, ?)
      `).run(chatId, projectId, now.getTime());

      sqlite.prepare(`
        INSERT INTO messages (id, chat_id, role, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(messageId, chatId, 'user', 'Hello', now.getTime());

      const message = sqlite.prepare('SELECT * FROM messages WHERE id = ?').get(messageId);
      expect(message).toBeDefined();
      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello');
    });
  });

  describe('Artifacts table', () => {
    it('should insert and retrieve artifacts', () => {
      const now = new Date();
      const userId = 'user-1';
      const projectId = 'project-1';
      const artifactId = 'artifact-1';

      sqlite.prepare(`
        INSERT INTO users (id, password_hash, created_at)
        VALUES (?, ?, ?)
      `).run(userId, 'hash', now.getTime());

      sqlite.prepare(`
        INSERT INTO projects (id, user_id, name, type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(projectId, userId, 'My Project', 'react', now.getTime(), now.getTime());

      sqlite.prepare(`
        INSERT INTO artifacts (id, project_id, file_path, content, language, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(artifactId, projectId, 'src/App.tsx', 'export default function App() {}', 'typescript', now.getTime());

      const artifact = sqlite.prepare('SELECT * FROM artifacts WHERE id = ?').get(artifactId);
      expect(artifact).toBeDefined();
      expect(artifact.file_path).toBe('src/App.tsx');
      expect(artifact.language).toBe('typescript');
    });
  });

  describe('Snapshots table', () => {
    it('should insert and retrieve snapshots', () => {
      const now = new Date();
      const userId = 'user-1';
      const projectId = 'project-1';
      const snapshotId = 'snapshot-1';
      const filesJson = JSON.stringify({ 'src/App.tsx': 'content' });

      sqlite.prepare(`
        INSERT INTO users (id, password_hash, created_at)
        VALUES (?, ?, ?)
      `).run(userId, 'hash', now.getTime());

      sqlite.prepare(`
        INSERT INTO projects (id, user_id, name, type, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(projectId, userId, 'My Project', 'react', now.getTime(), now.getTime());

      sqlite.prepare(`
        INSERT INTO snapshots (id, project_id, files, created_at)
        VALUES (?, ?, ?, ?)
      `).run(snapshotId, projectId, filesJson, now.getTime());

      const snapshot = sqlite.prepare('SELECT * FROM snapshots WHERE id = ?').get(snapshotId);
      expect(snapshot).toBeDefined();
      expect(JSON.parse(snapshot.files)).toEqual({ 'src/App.tsx': 'content' });
    });
  });

  describe('Relations', () => {
    it('should maintain referential integrity', () => {
      const now = new Date();
      const userId = 'user-1';
      const projectId = 'project-1';

      sqlite.prepare(`
        INSERT INTO users (id, password_hash, created_at)
        VALUES (?, ?, ?)
      `).run(userId, 'hash', now.getTime());

      expect(() => {
        sqlite.prepare(`
          INSERT INTO projects (id, user_id, name, type, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(projectId, 'non-existent-user', 'My Project', 'react', now.getTime(), now.getTime());
      }).toThrow();
    });
  });
});
