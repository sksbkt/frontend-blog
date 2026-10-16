import { prisma } from '../lib/prisma';

async function main() {
  const timer = setTimeout(() => {
    console.error('[TIMEOUT] Database cleanup query took longer than 15s. Forcing exit.');
    process.exit(1);
  }, 15000);

  try {
    console.log('Cleaning fake external records from AssetCache...');
    const result = await prisma.assetCache.deleteMany({
      where: {
        storageUrl: {
          contains: 'githubassets.com',
        },
      },
    });
    console.log(`Successfully deleted ${result.count} fake AssetCache record(s).`);
  } catch (err: any) {
    console.error('[CLEANUP ERROR]:', err.message);
  } finally {
    clearTimeout(timer);
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
