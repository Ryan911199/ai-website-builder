import { describe, it, expect, beforeEach } from 'vitest';
import { createSession, destroySession, isAuthenticated } from '@/lib/auth/session';

describe('Session utilities', () => {
  beforeEach(async () => {
    await destroySession();
  });

  it('should create a session', async () => {
    const userId = 'test-user-123';
    await createSession(userId);
    
    const authenticated = await isAuthenticated();
    expect(authenticated).toBe(true);
  });

  it('should destroy a session', async () => {
    const userId = 'test-user-123';
    await createSession(userId);
    
    let authenticated = await isAuthenticated();
    expect(authenticated).toBe(true);
    
    await destroySession();
    
    authenticated = await isAuthenticated();
    expect(authenticated).toBe(false);
  });

  it('should return false for unauthenticated session', async () => {
    const authenticated = await isAuthenticated();
    expect(authenticated).toBe(false);
  });
});
