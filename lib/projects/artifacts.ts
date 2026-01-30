import { db } from '../db';
import { artifacts } from '../db/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export type Artifact = typeof artifacts.$inferSelect;

export interface ArtifactInput {
  path: string;
  content: string;
  language: string;
}

export async function saveArtifacts(
  projectId: string,
  files: ArtifactInput[]
): Promise<Artifact[]> {
  if (!files || files.length === 0) {
    return [];
  }

  await db.delete(artifacts).where(eq(artifacts.projectId, projectId));

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
    .insert(artifacts)
    .values(artifactsToInsert)
    .returning();

  return result;
}

export async function getArtifacts(projectId: string): Promise<Artifact[]> {
  const result = await db
    .select()
    .from(artifacts)
    .where(eq(artifacts.projectId, projectId));

  return result;
}
