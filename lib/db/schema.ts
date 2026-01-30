import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Users table - simple password auth
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // nanoid
  passwordHash: text('password_hash').notNull(), // bcrypt hash
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Projects table - user's website projects
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(), // nanoid
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(), // user-provided or AI-generated
  type: text('type').notNull(), // 'react' | 'static'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Chats table - conversation history per project
export const chats = sqliteTable('chats', {
  id: text('id').primaryKey(), // nanoid
  projectId: text('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Messages table - individual chat messages
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(), // nanoid
  chatId: text('chat_id')
    .references(() => chats.id, { onDelete: 'cascade' })
    .notNull(),
  role: text('role').notNull(), // 'user' | 'assistant'
  content: text('content').notNull(), // raw message text
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Artifacts table - generated code files for a project
// PURPOSE: Stores the current state of all files in the project
// Each row = one file. Updated when AI generates new code.
export const artifacts = sqliteTable('artifacts', {
  id: text('id').primaryKey(), // nanoid
  projectId: text('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  filePath: text('file_path').notNull(), // e.g., 'src/App.tsx', 'index.html'
  content: text('content').notNull(), // file content
  language: text('language').notNull(), // 'typescript' | 'javascript' | 'html' | 'css'
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Snapshots table - version history (JSON blob of all files)
// PURPOSE: Point-in-time backup for "undo" functionality
export const snapshots = sqliteTable('snapshots', {
  id: text('id').primaryKey(), // nanoid
  projectId: text('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  files: text('files').notNull(), // JSON: { [filePath]: content }
  messageId: text('message_id'), // which message triggered this snapshot (optional)
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// Relations
export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  chats: many(chats),
  artifacts: many(artifacts),
  snapshots: many(snapshots),
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
  project: one(projects, { fields: [chats.projectId], references: [projects.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, { fields: [messages.chatId], references: [chats.id] }),
}));

export const artifactsRelations = relations(artifacts, ({ one }) => ({
  project: one(projects, { fields: [artifacts.projectId], references: [projects.id] }),
}));

export const snapshotsRelations = relations(snapshots, ({ one }) => ({
  project: one(projects, { fields: [snapshots.projectId], references: [projects.id] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  projects: many(projects),
  settings: one(userSettings),
}));

// User Settings table - API keys and preferences
export const userSettings = sqliteTable('user_settings', {
  id: text('id').primaryKey(), // nanoid
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  claudeApiKey: text('claude_api_key'), // encrypted
  minimaxApiKey: text('minimax_api_key'), // encrypted
  selectedProvider: text('selected_provider').default('claude'), // 'claude' | 'minimax'
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, { fields: [userSettings.userId], references: [users.id] }),
}));
