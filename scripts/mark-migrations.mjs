import { createConnection } from 'mysql2/promise';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Compute the hash the same way drizzle-kit does: sha256 of the SQL file content
function computeHash(sqlContent) {
  return createHash('sha256').update(sqlContent).digest('hex');
}

const migrations = [
  { tag: '0011_pretty_stellaris', when: 1783288108985 },
  { tag: '0012_milky_captain_america', when: 1783288215436 },
];

const conn = await createConnection(process.env.DATABASE_URL || '');

for (const m of migrations) {
  const sqlPath = join(projectRoot, 'drizzle', `${m.tag}.sql`);
  const sql = readFileSync(sqlPath, 'utf8');
  const hash = computeHash(sql);
  
  // Check if already applied
  const [rows] = await conn.execute(
    'SELECT id FROM __drizzle_migrations WHERE hash = ?',
    [hash]
  );
  
  if (rows.length > 0) {
    console.log(`${m.tag} already marked as applied`);
    continue;
  }
  
  await conn.execute(
    'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
    [hash, m.when]
  );
  console.log(`Marked ${m.tag} as applied (hash: ${hash.slice(0, 8)}...)`);
}

await conn.end();
console.log('Done');
