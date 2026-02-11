#!/usr/bin/env tsx

import { prisma } from '../db/prisma';

async function listEvents() {
  console.log('\n📋 Listing all events:\n');

  const events = await prisma.event.findMany({
    select: {
      slug: true,
      title: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  if (events.length === 0) {
    console.log('No events found.');
    return;
  }

  console.log('═══════════════════════════════════════════════════');
  events.forEach((event, index) => {
    console.log(`\n${index + 1}. ${event.title}`);
    console.log(`   Slug: ${event.slug}`);
    console.log(`   Created: ${event.createdAt.toLocaleString()}`);
  });
  console.log('\n═══════════════════════════════════════════════════\n');
}

listEvents()
  .catch((error) => {
    console.error('Error listing events:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
