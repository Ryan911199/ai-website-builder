import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { hashPassword } from '@/lib/auth/password';
import { nanoid } from 'nanoid';

describe('Login API', () => {
  let testUserId: string;
  const testPassword = 'test123';

  beforeAll(async () => {
    testUserId = nanoid();
    const passwordHash = await hashPassword(testPassword);
    
    await db.insert(users).values({
      id: testUserId,
      passwordHash,
      createdAt: new Date(),
    });
  });

  afterAll(async () => {
    await db.delete(users).where((t) => t.id === testUserId);
  });

  it('should login with correct password', async () => {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: testPassword }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it('should reject incorrect password', async () => {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrongpassword' }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Invalid credentials');
  });

  it('should reject missing password', async () => {
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Password is required');
  });
});
