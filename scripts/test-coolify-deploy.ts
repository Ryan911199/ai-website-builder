#!/usr/bin/env bun

import { CoolifyClient, CreateAppConfig } from '../lib/coolify/client';

async function main() {
  const coolifyUrl = process.env.COOLIFY_URL;
  const coolifyToken = process.env.COOLIFY_TOKEN;
  const projectUuid = process.env.COOLIFY_PROJECT_UUID;
  const serverUuid = process.env.COOLIFY_SERVER_UUID;
  const gitRepository = process.env.GIT_REPOSITORY || 'https://github.com/test/test-repo';

  if (!coolifyUrl || !coolifyToken) {
    console.error('Missing required environment variables:');
    console.error('  COOLIFY_URL - Coolify instance URL');
    console.error('  COOLIFY_TOKEN - Coolify API token');
    console.error('');
    console.error('Optional environment variables:');
    console.error('  COOLIFY_PROJECT_UUID - Coolify project UUID');
    console.error('  COOLIFY_SERVER_UUID - Coolify server UUID');
    console.error('  GIT_REPOSITORY - Git repository URL to deploy');
    process.exit(1);
  }

  if (!projectUuid || !serverUuid) {
    console.error('Missing required environment variables for deployment:');
    console.error('  COOLIFY_PROJECT_UUID - Coolify project UUID');
    console.error('  COOLIFY_SERVER_UUID - Coolify server UUID');
    process.exit(1);
  }

  console.log('Testing Coolify deployment integration...\n');

  const client = new CoolifyClient(coolifyUrl, coolifyToken);

  console.log('1. Validating credentials...');
  const isValid = await client.validateCredentials();
  if (!isValid) {
    console.error('   Invalid Coolify credentials');
    process.exit(1);
  }
  console.log('   Credentials valid\n');

  const config: CreateAppConfig = {
    project_uuid: projectUuid,
    server_uuid: serverUuid,
    environment_name: 'production',
    git_repository: gitRepository,
    git_branch: 'main',
    build_pack: 'static',
    ports_exposes: '80',
    publish_directory: '/dist',
    is_static: true,
    instant_deploy: false,
  };

  console.log('2. Creating application...');
  console.log(`   Repository: ${gitRepository}`);

  try {
    const app = await client.createApplication(config);
    console.log(`   Application created: ${app.uuid}`);
    console.log(`   Domain: ${app.domains}\n`);

    console.log('3. Triggering deployment...');
    const deployUuid = await client.deploy(app.uuid);
    console.log(`   Deployment started: ${deployUuid}\n`);

    console.log('4. Waiting for deployment to complete...');
    const status = await client.waitForDeployment(deployUuid);
    console.log(`   Deployment status: ${status}\n`);

    if (status === 'failed') {
      console.error('   Deployment failed');
      process.exit(1);
    }

    console.log('5. Getting application details...');
    const appDetails = await client.getApplicationDetails(app.uuid);
    console.log(`   Live URL: ${appDetails.fqdn || app.domains}\n`);

    console.log('Integration test PASSED');
    console.log(`Application deployed to: ${appDetails.fqdn || app.domains}`);
  } catch (error) {
    console.error('Integration test FAILED');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
