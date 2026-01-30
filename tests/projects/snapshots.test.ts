import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import * as schema from '../../lib/db/schema';
import path from 'path';
import { nanoid } from 'nanoid';

let db: ReturnType<typeof drizzle>;
let sqlite: Database.Database;
const testDbPath = path.join(process.cwd(), 'data', 'test-snapshots.db');

type Snapshot = typeof schema.snapshots.$inferSelect;

async function createProject(
  userId: string,
  name: string,
  type: 'react' | 'static'
): Promise<typeof schema.projects.$inferSelect> {
  const id = nanoid();
  const now = new Date();

  const result = await db
    .insert(schema.projects)
    .values({
      id,
      userId,
      name,
      type,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!result[0]) {
    throw new Error('Failed to create project');
  }

  return result[0];
}

async function createSnapshot(
  projectId: string,
  files: Record<string, string>,
  messageId?: string
): Promise<Snapshot> {
  const id = nanoid();
  const now = new Date();

  const result = await db
    .insert(schema.snapshots)
    .values({
      id,
      projectId,
      files: JSON.stringify(files),
      messageId,
      createdAt: now,
    })
    .returning();

  if (!result[0]) {
    throw new Error('Failed to create snapshot');
  }

  return result[0];
}

async function getSnapshot(snapshotId: string): Promise<Snapshot | null> {
  const result = await db
    .select()
    .from(schema.snapshots)
    .where(eq(schema.snapshots.id, snapshotId))
    .limit(1);

  return result[0] || null;
}

async function listSnapshots(projectId: string): Promise<Snapshot[]> {
  const result = await db
    .select()
    .from(schema.snapshots)
    .where(eq(schema.snapshots.projectId, projectId))
    .orderBy(schema.snapshots.createdAt);

  return result.reverse();
}

async function deleteSnapshot(snapshotId: string): Promise<void> {
  await db.delete(schema.snapshots).where(eq(schema.snapshots.id, snapshotId));
}

describe('Snapshots Service', () => {
  beforeEach(() => {
    sqlite = new Database(testDbPath);
    sqlite.pragma('journal_mode = WAL');
    db = drizzle(sqlite, { schema: schema });

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

    const now = new Date().getTime();
    sqlite.prepare(`
      INSERT INTO users (id, password_hash, created_at)
      VALUES (?, ?, ?)
    `).run('test-user-1', 'hashed-password', now);

    sqlite.prepare(`
      INSERT INTO users (id, password_hash, created_at)
      VALUES (?, ?, ?)
    `).run('test-user-2', 'hashed-password', now);
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

  describe('createSnapshot', () => {
    it('should create a snapshot with files', async () => {
      const project = await createProject('test-user-1', 'Test Project', 'react');
      const files = {
        'src/App.tsx': 'import React from "react";\nexport default function App() {}',
        'src/index.tsx': 'import ReactDOM from "react-dom";\nimport App from "./App";',
      };

      const snapshot = await createSnapshot(project.id, files);

      expect(snapshot).toBeDefined();
      expect(snapshot.id).toBeDefined();
      expect(snapshot.projectId).toBe(project.id);
      expect(snapshot.files).toBeDefined();
      expect(snapshot.createdAt).toBeInstanceOf(Date);
      expect(snapshot.messageId).toBeNull();
    });

    it('should create a snapshot with messageId', async () => {
      const project = await createProject('test-user-1', 'Test Project', 'react');
      const files = { 'src/App.tsx': 'export default function App() {}' };
      const messageId = 'msg-123';

      const snapshot = await createSnapshot(project.id, files, messageId);

      expect(snapshot.messageId).toBe(messageId);
    });

    it('should generate unique snapshot IDs', async () => {
      const project = await createProject('test-user-1', 'Test Project', 'react');
      const files = { 'src/App.tsx': 'export default function App() {}' };

      const snapshot1 = await createSnapshot(project.id, files);
      const snapshot2 = await createSnapshot(project.id, files);

      expect(snapshot1.id).not.toBe(snapshot2.id);
    });

    it('should store files as JSON string', async () => {
      const project = await createProject('test-user-1', 'Test Project', 'react');
      const files = {
        'package.json': '{"name": "my-app"}',
        'src/App.tsx': 'export default function App() {}',
      };

      const snapshot = await createSnapshot(project.id, files);

      expect(typeof snapshot.files).toBe('string');
      const parsed = JSON.parse(snapshot.files);
      expect(parsed).toEqual(files);
    });

    it('should set createdAt to current time', async () => {
      const project = await createProject('test-user-1', 'Test Project', 'react');
      const files = { 'src/App.tsx': 'export default function App() {}' };

      const snapshot = await createSnapshot(project.id, files);

      expect(snapshot.createdAt).toBeInstanceOf(Date);
      expect(snapshot.createdAt.getTime()).toBeGreaterThan(0);
    });

    it('should handle empty files object', async () => {
      const project = await createProject('test-user-1', 'Test Project', 'react');
      const files = {};

      const snapshot = await createSnapshot(project.id, files);

      expect(snapshot).toBeDefined();
      expect(JSON.parse(snapshot.files)).toEqual({});
    });

    it('should handle files with special characters', async () => {
      const project = await createProject('test-user-1', 'Test Project', 'react');
      const files = {
        'src/App.tsx': 'const str = "Hello\\nWorld\\t!";',
        'src/data.json': '{"key": "value with \\"quotes\\""}',
      };

      const snapshot = await createSnapshot(project.id, files);
      const parsed = JSON.parse(snapshot.files);

      expect(parsed).toEqual(files);
    });
  });

  describe('getSnapshot', () => {
    it('should retrieve a snapshot by ID', async () => {
      const project = await createProject('test-user-1', 'Test Project', 'react');
      const files = { 'src/App.tsx': 'export default function App() {}' };
      const created = await createSnapshot(project.id, files);

      const retrieved = await getSnapshot(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.projectId).toBe(project.id);
    });

    it('should return null for non-existent snapshot', async () => {
      const snapshot = await getSnapshot('non-existent-id');

      expect(snapshot).toBeNull();
    });

    it('should parse files JSON correctly', async () => {
      const project = await createProject('test-user-1', 'Test Project', 'react');
      const files = {
        'src/App.tsx': 'export default function App() {}',
        'src/index.tsx': 'import App from "./App";',
      };
      const created = await createSnapshot(project.id, files);

      const retrieved = await getSnapshot(created.id);

      expect(retrieved).toBeDefined();
      const parsedFiles = JSON.parse(retrieved!.files);
      expect(parsedFiles).toEqual(files);
    });

    it('should preserve all snapshot fields', async () => {
      const project = await createProject('test-user-1', 'Test Project', 'react');
      const files = { 'src/App.tsx': 'export default function App() {}' };
      const messageId = 'msg-456';
      const created = await createSnapshot(project.id, files, messageId);

      const retrieved = await getSnapshot(created.id);

      expect(retrieved).toEqual(created);
    });
  });

  describe('listSnapshots', () => {
    it('should list all snapshots for a project', async () => {
      const project = await createProject('test-user-1', 'Test Project', 'react');
      const files = { 'src/App.tsx': 'export default function App() {}' };

      await createSnapshot(project.id, files);
      await createSnapshot(project.id, files);
      await createSnapshot(project.id, files);

      const snapshots = await listSnapshots(project.id);

      expect(snapshots).toHaveLength(3);
    });

    it('should sort snapshots by createdAt descending (newest first)', async () => {
      const project = await createProject('test-user-1', 'Test Project', 'react');
      const files = { 'src/App.tsx': 'export default function App() {}' };

      const snapshot1 = await createSnapshot(project.id, files);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const snapshot2 = await createSnapshot(project.id, files);
      await new Promise((resolve) => setTimeout(resolve, 10));
      const snapshot3 = await createSnapshot(project.id, files);

      const snapshots = await listSnapshots(project.id);

      expect(snapshots).toHaveLength(3);
      expect(snapshots[0].id).toBe(snapshot3.id);
      expect(snapshots[1].id).toBe(snapshot2.id);
      expect(snapshots[2].id).toBe(snapshot1.id);
    });

    it('should filter snapshots by projectId', async () => {
      const project1 = await createProject('test-user-1', 'Project 1', 'react');
      const project2 = await createProject('test-user-1', 'Project 2', 'react');
      const files = { 'src/App.tsx': 'export default function App() {}' };

      await createSnapshot(project1.id, files);
      await createSnapshot(project1.id, files);
      await createSnapshot(project2.id, files);

      const snapshots1 = await listSnapshots(project1.id);
      const snapshots2 = await listSnapshots(project2.id);

      expect(snapshots1).toHaveLength(2);
      expect(snapshots2).toHaveLength(1);
      expect(snapshots1.every((s) => s.projectId === project1.id)).toBe(true);
      expect(snapshots2.every((s) => s.projectId === project2.id)).toBe(true);
    });

    it('should return empty array if no snapshots exist', async () => {
      const project = await createProject('test-user-1', 'Test Project', 'react');

      const snapshots = await listSnapshots(project.id);

      expect(snapshots).toEqual([]);
    });

    it('should handle multiple projects with snapshots', async () => {
      const project1 = await createProject('test-user-1', 'Project 1', 'react');
      const project2 = await createProject('test-user-2', 'Project 2', 'static');
      const files = { 'src/App.tsx': 'export default function App() {}' };

      await createSnapshot(project1.id, files);
      await createSnapshot(project1.id, files);
      await createSnapshot(project2.id, files);

      const snapshots1 = await listSnapshots(project1.id);
      const snapshots2 = await listSnapshots(project2.id);

      expect(snapshots1).toHaveLength(2);
      expect(snapshots2).toHaveLength(1);
    });
  });

  describe('deleteSnapshot', () => {
    it('should delete a snapshot', async () => {
      const project = await createProject('test-user-1', 'Test Project', 'react');
      const files = { 'src/App.tsx': 'export default function App() {}' };
      const snapshot = await createSnapshot(project.id, files);

      await deleteSnapshot(snapshot.id);

      const retrieved = await getSnapshot(snapshot.id);
      expect(retrieved).toBeNull();
    });

    it('should not affect other snapshots when deleting', async () => {
      const project = await createProject('test-user-1', 'Test Project', 'react');
      const files = { 'src/App.tsx': 'export default function App() {}' };

      const snapshot1 = await createSnapshot(project.id, files);
      const snapshot2 = await createSnapshot(project.id, files);
      const snapshot3 = await createSnapshot(project.id, files);

      await deleteSnapshot(snapshot2.id);

      const snapshots = await listSnapshots(project.id);
      expect(snapshots).toHaveLength(2);
      expect(snapshots.map((s) => s.id)).toContain(snapshot1.id);
      expect(snapshots.map((s) => s.id)).toContain(snapshot3.id);
      expect(snapshots.map((s) => s.id)).not.toContain(snapshot2.id);
    });

    it('should handle deleting non-existent snapshot gracefully', async () => {
      await expect(deleteSnapshot('non-existent-id')).resolves.not.toThrow();
    });

    it('should delete snapshot from correct project only', async () => {
      const project1 = await createProject('test-user-1', 'Project 1', 'react');
      const project2 = await createProject('test-user-1', 'Project 2', 'react');
      const files = { 'src/App.tsx': 'export default function App() {}' };

      const snapshot1 = await createSnapshot(project1.id, files);
      const snapshot2 = await createSnapshot(project2.id, files);

      await deleteSnapshot(snapshot1.id);

      const project1Snapshots = await listSnapshots(project1.id);
      const project2Snapshots = await listSnapshots(project2.id);

      expect(project1Snapshots).toHaveLength(0);
      expect(project2Snapshots).toHaveLength(1);
      expect(project2Snapshots[0].id).toBe(snapshot2.id);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete snapshot lifecycle', async () => {
      const project = await createProject('test-user-1', 'Test Project', 'react');
      const files1 = { 'src/App.tsx': 'export default function App() {}' };
      const files2 = { 'src/App.tsx': 'export default function App() { return <div>Hello</div>; }' };

      const snapshot1 = await createSnapshot(project.id, files1, 'msg-1');
      const snapshot2 = await createSnapshot(project.id, files2, 'msg-2');

      let snapshots = await listSnapshots(project.id);
      expect(snapshots).toHaveLength(2);

      const retrieved1 = await getSnapshot(snapshot1.id);
      expect(JSON.parse(retrieved1!.files)).toEqual(files1);

      await deleteSnapshot(snapshot1.id);

      snapshots = await listSnapshots(project.id);
      expect(snapshots).toHaveLength(1);
      expect(snapshots[0].id).toBe(snapshot2.id);
    });

    it('should maintain snapshot isolation between projects', async () => {
      const project1 = await createProject('test-user-1', 'Project 1', 'react');
      const project2 = await createProject('test-user-1', 'Project 2', 'react');
      const files = { 'src/App.tsx': 'export default function App() {}' };

      const p1Snapshot1 = await createSnapshot(project1.id, files);
      const p1Snapshot2 = await createSnapshot(project1.id, files);
      const p2Snapshot1 = await createSnapshot(project2.id, files);

      const p1Snapshots = await listSnapshots(project1.id);
      const p2Snapshots = await listSnapshots(project2.id);

      expect(p1Snapshots).toHaveLength(2);
      expect(p2Snapshots).toHaveLength(1);
      expect(p1Snapshots.map((s) => s.id)).toContain(p1Snapshot1.id);
      expect(p1Snapshots.map((s) => s.id)).toContain(p1Snapshot2.id);
      expect(p2Snapshots.map((s) => s.id)).toContain(p2Snapshot1.id);
    });
  });
});
