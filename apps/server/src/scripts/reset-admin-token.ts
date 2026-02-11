#!/usr/bin/env tsx

import { prisma } from '../db/prisma';
import { randomToken, hashToken } from '../utils/crypto';

async function resetAdminToken(slug: string) {
  console.log(`Resetting admin token for event: ${slug}\n`);

  // Find the event
  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true, title: true, slug: true },
  });

  if (!event) {
    console.error(`❌ Error: Event with slug "${slug}" not found.`);
    process.exit(1);
  }

  console.log(`Found event: ${event.title}`);

  // Generate new token
  const newToken = randomToken();
  const newTokenHash = await hashToken(newToken);

  // Update the database
  await prisma.event.update({
    where: { id: event.id },
    data: { adminTokenHash: newTokenHash },
  });

  console.log('\n✅ Admin token reset successfully!\n');
  console.log('═══════════════════════════════════════════════════');
  console.log('⚠️  SAVE THIS TOKEN - IT WILL NOT BE SHOWN AGAIN');
  console.log('═══════════════════════════════════════════════════');
  console.log(`\nEvent Slug: ${event.slug}`);
  console.log(`Admin Token: ${newToken}\n`);
  console.log('═══════════════════════════════════════════════════\n');
}

// Get slug from command line argument
const slug = process.argv[2];

if (!slug) {
  console.error('Usage: npm run reset-token <event-slug>');
  console.error('Example: npm run reset-token abc123xyz789');
  process.exit(1);
}

resetAdminToken(slug)
  .catch((error) => {
    console.error('Error resetting token:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
