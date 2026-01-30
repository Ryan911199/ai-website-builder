import { db } from '../lib/db';
import { users } from '../lib/db/schema';
import { hashPassword } from '../lib/auth/password';
import { nanoid } from 'nanoid';

async function seedUser() {
  const password = process.argv[2] || 'admin123';
  
  const existingUsers = await db.select().from(users).limit(1);
  
  if (existingUsers.length > 0) {
    console.log('User already exists. Skipping seed.');
    console.log('To reset, delete the database and run migrations again.');
    return;
  }

  const userId = nanoid();
  const passwordHash = await hashPassword(password);

  await db.insert(users).values({
    id: userId,
    passwordHash,
    createdAt: new Date(),
  });

  console.log('✅ User created successfully!');
  console.log(`User ID: ${userId}`);
  console.log(`Password: ${password}`);
  console.log('\nYou can now login at http://localhost:3000/login');
}

seedUser()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error seeding user:', error);
    process.exit(1);
  });
