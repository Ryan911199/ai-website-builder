import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import * as schema from './schema';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'sqlite.db');

const sqlite = new Database(dbPath);

export const db = drizzle(sqlite, { schema });

export type DatabaseType = typeof db;
