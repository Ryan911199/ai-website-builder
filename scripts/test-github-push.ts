import { createGitHubClient } from '../lib/github/client';

async function testGitHubPush() {
  const token = process.env.GITHUB_TOKEN;

  if (!token) {
    console.error('❌ GITHUB_TOKEN environment variable is required');
    console.log('Usage: GITHUB_TOKEN=ghp_xxx bun run scripts/test-github-push.ts');
    process.exit(1);
  }

  console.log('🔍 Testing GitHub integration...\n');

  try {
    const client = createGitHubClient(token);

    console.log('1️⃣ Validating GitHub token...');
    const isValid = await client.validateToken();
    if (!isValid) {
      console.error('❌ Invalid GitHub token');
      process.exit(1);
    }
    console.log('✅ Token is valid\n');

    console.log('2️⃣ Getting authenticated user...');
    const username = await client.getUsername();
    console.log(`✅ Authenticated as: ${username}\n`);

    const testRepoName = `ai-builder-test-${Date.now()}`;
    console.log(`3️⃣ Creating test repository: ${testRepoName}...`);
    const createResult = await client.createRepo(
      testRepoName,
      'Test repository created by AI Website Builder integration test',
      true
    );

    if (!createResult.success) {
      console.error(`❌ Failed to create repository: ${createResult.error}`);
      process.exit(1);
    }
    console.log(`✅ Repository created: ${createResult.repoUrl}\n`);

    console.log('4️⃣ Pushing test files...');
    const testFiles = [
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Project</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Hello from AI Website Builder!</h1>
  <p>This is a test deployment.</p>
  <script src="script.js"></script>
</body>
</html>`,
      },
      {
        path: 'style.css',
        content: `body {
  font-family: system-ui, -apple-system, sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

p {
  font-size: 1.2rem;
  line-height: 1.6;
}`,
      },
      {
        path: 'script.js',
        content: `console.log('Hello from AI Website Builder!');

document.addEventListener('DOMContentLoaded', () => {
  console.log('Page loaded successfully');
});`,
      },
      {
        path: 'README.md',
        content: `# Test Project

This repository was created by the AI Website Builder integration test.

## Files

- \`index.html\` - Main HTML file
- \`style.css\` - Stylesheet
- \`script.js\` - JavaScript file

Generated at: ${new Date().toISOString()}`,
      },
    ];

    const pushResult = await client.pushFiles(
      testRepoName,
      testFiles,
      'Initial commit from integration test'
    );

    if (!pushResult.success) {
      console.error(`❌ Failed to push files: ${pushResult.error}`);
      process.exit(1);
    }

    console.log(`✅ Files pushed successfully`);
    console.log(`   Commit SHA: ${pushResult.commitSha}`);
    console.log(`   Repository: ${pushResult.repoUrl}\n`);

    console.log('🎉 All tests passed!\n');
    console.log('📝 Summary:');
    console.log(`   - Username: ${username}`);
    console.log(`   - Repository: ${testRepoName}`);
    console.log(`   - Files pushed: ${testFiles.length}`);
    console.log(`   - URL: ${pushResult.repoUrl}`);
    console.log('\n⚠️  Note: This is a private test repository. You can delete it manually if needed.');
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testGitHubPush();
