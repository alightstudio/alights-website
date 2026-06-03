const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const TARGET_DB_URL = process.argv[2];
if (!TARGET_DB_URL) {
  console.error('Usage: node migrate-to-supabase.js "postgresql://..."');
  process.exit(1);
}

const BACKUP_DIR = path.join(__dirname, '..', 'backups', '2026-06-02T19-02-13');

// Tables in dependency order (foreign key constraints)
const TABLES = [
  'User',
  'ForumCategory',
  'ForumTag',
  'ForumPost',
  'ForumComment',
  'ForumPostLike',
  'ForumPostTag',
  'Work',
  'WorkView',
  'Review',
  'SiteConfig',
  'Contact',
  'PointsRecord',
  'SiteAnalytics',
  'Canvas',
  'Pixel',
  'CanvasExpansion',
  'CanvasPixelCount',
  'Transaction',
  'MarketplaceListing',
  'Referral',
  'RateLimitEntry',
  'VideoReview',
  'ReviewComment',
];

async function migrate() {
  // Connect to target database directly
  const prisma = new PrismaClient({
    datasources: { db: { url: TARGET_DB_URL } },
  });

  try {
    // Step 1: Push schema
    console.log('📐 Step 1: Pushing schema to Supabase...\n');
    const { execSync } = require('child_process');
    try {
      execSync(`DATABASE_URL="${TARGET_DB_URL}" npx prisma db push --skip-generate`, {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
        timeout: 60000,
      });
      console.log('   ✅ Schema pushed');
    } catch (e) {
      console.log('   ⚠️ Schema push had issues, will try to import anyway\n');
    }

    // Step 2: Import data
    console.log('\n📥 Step 2: Importing data...\n');

    let totalImported = 0;
    const skipped = [];

    for (const tableName of TABLES) {
      const jsonFile = path.join(BACKUP_DIR, `${tableName}.json`);
      if (!fs.existsSync(jsonFile)) {
        skipped.push(tableName);
        continue;
      }

      const raw = fs.readFileSync(jsonFile, 'utf-8').trim();
      if (raw === '[]' || raw === '') {
        skipped.push(tableName);
        continue;
      }

      try {
        const records = JSON.parse(raw);
        if (!records.length) {
          skipped.push(tableName);
          continue;
        }

        // Insert in batches of 500
        const batchSize = 500;
        let imported = 0;
        
        for (let i = 0; i < records.length; i += batchSize) {
          const batch = records.slice(i, i + batchSize);
          await prisma[tableName.toLowerCase()].createMany({
            data: batch.map(r => {
              // Clean up Prisma-specific fields
              const { __proto__, ...clean } = r;
              // Convert date strings back to Date objects
              for (const [k, v] of Object.entries(clean)) {
                if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) {
                  clean[k] = new Date(v);
                }
              }
              return clean;
            }),
            skipDuplicates: true,
          });
          imported += batch.length;
        }

        console.log(`   ✅ ${tableName}: ${imported} rows`);
        totalImported += imported;
      } catch (e) {
        console.log(`   ❌ ${tableName}: ${e.message.split('\n')[0]}`);
      }
    }

    console.log(`\n📊 Import complete: ${totalImported} total rows`);
    if (skipped.length) {
      console.log(`⏭️  Skipped (empty/missing): ${skipped.join(', ')}`);
    }

    // Step 3: Verify
    console.log('\n🔍 Step 3: Quick verification...');
    const counts = {};
    for (const tableName of TABLES) {
      try {
        const count = await prisma[tableName.toLowerCase()].count();
        counts[tableName] = count;
      } catch (e) {
        // Table might not exist yet
      }
    }
    
    const important = ['User', 'SiteConfig', 'ForumPost', 'Canvas'];
    for (const t of important) {
      if (counts[t] !== undefined) {
        console.log(`   ${t}: ${counts[t]}`);
      }
    }

    console.log('\n🎉 Migration complete!');
    console.log('   Next: Update DATABASE_URL in .env and Vercel env vars');
    console.log('   Then: npx vercel --prod');

  } catch (e) {
    console.error('❌ Migration failed:', e.message);
    throw e;
  } finally {
    await prisma.$disconnect();
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
