import { getSession } from '@/lib/auth/session';
import { db } from '@/lib/db';
import { userSettings } from '@/lib/db/schema';
import { decrypt, encrypt } from '@/lib/settings/encryption';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const session = await getSession();
    if (!session.userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const settings = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, session.userId),
    });

    if (!settings) {
      return Response.json({
        claudeApiKey: '',
        minimaxApiKey: '',
        selectedProvider: 'claude',
      });
    }

    // Decrypt keys before sending to client?
    // SECURITY: Sending keys to client is risky if XSS.
    // But the user needs to see if they are set, or edit them.
    // Usually we send a masked version or just "isSet: true".
    // But for this task "Settings page with API key forms", usually implies we can see/edit them.
    // Given the "bolt-diy" context, I will send them back decrypted so the user can see what they saved.
    // Ideally, we should only send them if explicitly requested or just show placeholders.
    // I'll send them decrypted for now as it's the simplest implementation for a "settings form".

    let claudeApiKey = '';
    let minimaxApiKey = '';

    if (settings.claudeApiKey) {
      try {
        claudeApiKey = await decrypt(settings.claudeApiKey);
      } catch (e) {
        console.error('Failed to decrypt Claude key', e);
      }
    }

    if (settings.minimaxApiKey) {
      try {
        minimaxApiKey = await decrypt(settings.minimaxApiKey);
      } catch (e) {
        console.error('Failed to decrypt MiniMax key', e);
      }
    }

    return Response.json({
      claudeApiKey,
      minimaxApiKey,
      selectedProvider: settings.selectedProvider,
    });
  } catch (error) {
    console.error('Settings GET error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await req.json();
    const { claudeApiKey, minimaxApiKey, selectedProvider } = body;

    let encryptedClaudeKey = null;
    let encryptedMiniMaxKey = null;

    if (claudeApiKey) {
      encryptedClaudeKey = await encrypt(claudeApiKey);
    }

    if (minimaxApiKey) {
      encryptedMiniMaxKey = await encrypt(minimaxApiKey);
    }

    // Check if settings exist
    const existing = await db.query.userSettings.findFirst({
      where: eq(userSettings.userId, session.userId),
    });

    if (existing) {
      await db
        .update(userSettings)
        .set({
          claudeApiKey: encryptedClaudeKey,
          minimaxApiKey: encryptedMiniMaxKey,
          selectedProvider: selectedProvider || 'claude',
          updatedAt: new Date(),
        })
        .where(eq(userSettings.userId, session.userId));
    } else {
      await db.insert(userSettings).values({
        id: crypto.randomUUID(),
        userId: session.userId,
        claudeApiKey: encryptedClaudeKey,
        minimaxApiKey: encryptedMiniMaxKey,
        selectedProvider: selectedProvider || 'claude',
        updatedAt: new Date(),
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Settings POST error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
