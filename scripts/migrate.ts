import { Database } from 'bun:sqlite';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'sqlite.db');
const migrationsDir = path.join(process.cwd(), 'drizzle');

const sqlite = new Database(dbPath);

const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql'))
  .sort();

for (const file of migrationFiles) {
  const filePath = path.join(migrationsDir, file);
  const sql = fs.readFileSync(filePath, 'utf-8');

  const statements = sql
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(s => s && s.length > 0);

  for (const statement of statements) {
    try {
      sqlite.exec(statement);
    } catch (error) {
      console.error(`✗ Error in ${file}:`, error);
      process.exit(1);
    }
  }
  console.log(`✓ Executed: ${file}`);
}

console.log('✓ All migrations completed');
sqlite.close();
