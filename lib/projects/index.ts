import { db } from '../db';
import { projects } from '../db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

/**
 * Create a new project for a user
 */
export async function createProject(
  userId: string,
  name: string,
  type: 'react' | 'static'
): Promise<Project> {
  const id = nanoid();
  const now = new Date();

  const result = await db
    .insert(projects)
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

/**
 * Get a project by ID
 */
export async function getProject(projectId: string): Promise<Project | null> {
  const result = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  return result[0] || null;
}

/**
 * List all projects for a user
 */
export async function listProjects(userId: string): Promise<Project[]> {
  const result = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId));

  return result;
}

/**
 * Update a project
 */
export async function updateProject(
  projectId: string,
  data: Partial<Omit<Project, 'id' | 'userId' | 'createdAt'>>
): Promise<Project> {
  const now = new Date();

  const result = await db
    .update(projects)
    .set({
      ...data,
      updatedAt: now,
    })
    .where(eq(projects.id, projectId))
    .returning();

  if (!result[0]) {
    throw new Error('Project not found');
  }

  return result[0];
}

/**
 * Delete a project
 */
export async function deleteProject(projectId: string): Promise<void> {
  await db.delete(projects).where(eq(projects.id, projectId));
}
