import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import * as schema from '../../lib/db/schema';
import path from 'path';
import { nanoid } from 'nanoid';

let db: ReturnType<typeof drizzle>;
let sqlite: Database.Database;
const testDbPath = path.join(process.cwd(), 'data', 'test-projects.db');

type Project = typeof schema.projects.$inferSelect;

async function createProject(
  userId: string,
  name: string,
  type: 'react' | 'static'
): Promise<Project> {
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

async function getProject(projectId: string): Promise<Project | null> {
  const result = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, projectId))
    .limit(1);

  return result[0] || null;
}

async function listProjects(userId: string): Promise<Project[]> {
  const result = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.userId, userId));

  return result;
}

async function updateProject(
  projectId: string,
  data: Partial<Omit<Project, 'id' | 'userId' | 'createdAt'>>
): Promise<Project> {
  const now = new Date();

  const result = await db
    .update(schema.projects)
    .set({
      ...data,
      updatedAt: now,
    })
    .where(eq(schema.projects.id, projectId))
    .returning();

  if (!result[0]) {
    throw new Error('Project not found');
  }

  return result[0];
}

async function deleteProject(projectId: string): Promise<void> {
  await db.delete(schema.projects).where(eq(schema.projects.id, projectId));
}

describe('Projects Service', () => {
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

  describe('createProject', () => {
    it('should create a new project', async () => {
      const project = await createProject('test-user-1', 'My React App', 'react');

      expect(project).toBeDefined();
      expect(project.id).toBeDefined();
      expect(project.userId).toBe('test-user-1');
      expect(project.name).toBe('My React App');
      expect(project.type).toBe('react');
      expect(project.createdAt).toBeInstanceOf(Date);
      expect(project.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a static project', async () => {
      const project = await createProject('test-user-1', 'Static Site', 'static');

      expect(project.type).toBe('static');
      expect(project.name).toBe('Static Site');
    });

    it('should generate unique IDs for each project', async () => {
      const project1 = await createProject('test-user-1', 'Project 1', 'react');
      const project2 = await createProject('test-user-1', 'Project 2', 'react');

      expect(project1.id).not.toBe(project2.id);
    });

    it('should set createdAt and updatedAt to current time', async () => {
      const project = await createProject('test-user-1', 'Test Project', 'react');

      expect(project.createdAt).toBeInstanceOf(Date);
      expect(project.updatedAt).toBeInstanceOf(Date);
      expect(project.createdAt.getTime()).toBeGreaterThan(0);
      expect(project.updatedAt.getTime()).toBeGreaterThan(0);
    });
  });

  describe('getProject', () => {
    it('should retrieve a project by ID', async () => {
      const created = await createProject('test-user-1', 'My Project', 'react');
      const retrieved = await getProject(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.name).toBe('My Project');
      expect(retrieved?.userId).toBe('test-user-1');
    });

    it('should return null for non-existent project', async () => {
      const project = await getProject('non-existent-id');

      expect(project).toBeNull();
    });

    it('should preserve all project fields', async () => {
      const created = await createProject('test-user-1', 'Full Project', 'static');
      const retrieved = await getProject(created.id);

      expect(retrieved).toEqual(created);
    });
  });

  describe('listProjects', () => {
    it('should list all projects for a user', async () => {
      await createProject('test-user-1', 'Project 1', 'react');
      await createProject('test-user-1', 'Project 2', 'static');
      await createProject('test-user-1', 'Project 3', 'react');

      const projects = await listProjects('test-user-1');

      expect(projects).toHaveLength(3);
      expect(projects.every((p) => p.userId === 'test-user-1')).toBe(true);
    });

    it('should return empty array for user with no projects', async () => {
      const projects = await listProjects('test-user-2');

      expect(projects).toEqual([]);
    });

    it('should not include projects from other users', async () => {
      await createProject('test-user-1', 'User 1 Project', 'react');
      await createProject('test-user-2', 'User 2 Project', 'react');

      const user1Projects = await listProjects('test-user-1');
      const user2Projects = await listProjects('test-user-2');

      expect(user1Projects).toHaveLength(1);
      expect(user2Projects).toHaveLength(1);
      expect(user1Projects[0].name).toBe('User 1 Project');
      expect(user2Projects[0].name).toBe('User 2 Project');
    });

    it('should return projects in creation order', async () => {
      const p1 = await createProject('test-user-1', 'First', 'react');
      const p2 = await createProject('test-user-1', 'Second', 'react');
      const p3 = await createProject('test-user-1', 'Third', 'react');

      const projects = await listProjects('test-user-1');

      expect(projects[0].id).toBe(p1.id);
      expect(projects[1].id).toBe(p2.id);
      expect(projects[2].id).toBe(p3.id);
    });
  });

  describe('updateProject', () => {
    it('should update project name', async () => {
      const created = await createProject('test-user-1', 'Original Name', 'react');
      const updated = await updateProject(created.id, { name: 'Updated Name' });

      expect(updated.name).toBe('Updated Name');
      expect(updated.id).toBe(created.id);
      expect(updated.userId).toBe(created.userId);
    });

    it('should update project type', async () => {
      const created = await createProject('test-user-1', 'My Project', 'react');
      const updated = await updateProject(created.id, { type: 'static' });

      expect(updated.type).toBe('static');
    });

    it('should update multiple fields', async () => {
      const created = await createProject('test-user-1', 'Original', 'react');
      const updated = await updateProject(created.id, {
        name: 'New Name',
        type: 'static',
      });

      expect(updated.name).toBe('New Name');
      expect(updated.type).toBe('static');
    });

    it('should update updatedAt timestamp', async () => {
      const created = await createProject('test-user-1', 'My Project', 'react');
      const updated = await updateProject(created.id, { name: 'Updated' });

      expect(updated.updatedAt).toBeInstanceOf(Date);
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(created.updatedAt.getTime());
    });

    it('should preserve createdAt and userId', async () => {
      const created = await createProject('test-user-1', 'My Project', 'react');
      const updated = await updateProject(created.id, { name: 'Updated' });

      expect(updated.createdAt).toEqual(created.createdAt);
      expect(updated.userId).toBe(created.userId);
    });

    it('should throw error for non-existent project', async () => {
      await expect(updateProject('non-existent-id', { name: 'Updated' })).rejects.toThrow(
        'Project not found'
      );
    });
  });

  describe('deleteProject', () => {
    it('should delete a project', async () => {
      const created = await createProject('test-user-1', 'To Delete', 'react');
      await deleteProject(created.id);

      const retrieved = await getProject(created.id);
      expect(retrieved).toBeNull();
    });

    it('should not affect other projects', async () => {
      const p1 = await createProject('test-user-1', 'Project 1', 'react');
      const p2 = await createProject('test-user-1', 'Project 2', 'react');

      await deleteProject(p1.id);

      const remaining = await listProjects('test-user-1');
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(p2.id);
    });

    it('should not throw error for non-existent project', async () => {
      await expect(deleteProject('non-existent-id')).resolves.not.toThrow();
    });

    it('should allow deleting and recreating with same name', async () => {
      const p1 = await createProject('test-user-1', 'My Project', 'react');
      await deleteProject(p1.id);

      const p2 = await createProject('test-user-1', 'My Project', 'react');

      expect(p2.id).not.toBe(p1.id);
      expect(p2.name).toBe(p1.name);
    });
  });

  describe('Integration', () => {
    it('should handle full CRUD lifecycle', async () => {
      const created = await createProject('test-user-1', 'Lifecycle Test', 'react');
      expect(created.id).toBeDefined();

      const retrieved = await getProject(created.id);
      expect(retrieved?.name).toBe('Lifecycle Test');

      const updated = await updateProject(created.id, { name: 'Updated Lifecycle' });
      expect(updated.name).toBe('Updated Lifecycle');

      const listed = await listProjects('test-user-1');
      expect(listed).toHaveLength(1);
      expect(listed[0].name).toBe('Updated Lifecycle');

      await deleteProject(created.id);
      const deleted = await getProject(created.id);
      expect(deleted).toBeNull();
    });

    it('should handle multiple users independently', async () => {
      const user1Project = await createProject('test-user-1', 'User 1 Project', 'react');
      const user2Project = await createProject('test-user-2', 'User 2 Project', 'static');

      const user1List = await listProjects('test-user-1');
      const user2List = await listProjects('test-user-2');

      expect(user1List).toHaveLength(1);
      expect(user2List).toHaveLength(1);
      expect(user1List[0].id).toBe(user1Project.id);
      expect(user2List[0].id).toBe(user2Project.id);

      await deleteProject(user1Project.id);

      const user1After = await listProjects('test-user-1');
      const user2After = await listProjects('test-user-2');

      expect(user1After).toHaveLength(0);
      expect(user2After).toHaveLength(1);
    });
  });
});
