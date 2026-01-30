import { db } from '../lib/db';
import { users } from '../lib/db/schema';
import { hashPassword } from '../lib/auth/password';
import { nanoid } from 'nanoid';

async function seedUser() {
  const password = process.env.AUTH_PASSWORD || 'test123';
  
  // Check if user already exists
  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length > 0) {
    console.log('User already exists, skipping seed');
    return;
  }

  const passwordHash = await hashPassword(password);
  const userId = nanoid();
  
  await db.insert(users).values({
    id: userId,
    passwordHash,
    createdAt: new Date(),
  });

  console.log('Created default user with password:', password);
  console.log('User ID:', userId);
}

seedUser()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
