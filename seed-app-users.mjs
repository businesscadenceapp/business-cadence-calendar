/**
 * Seed script: creates the three BusinessCadence app user accounts.
 * Run once: node seed-app-users.mjs
 */
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";

// Load env
dotenv.config();
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const accounts = [
  { username: "chiro", password: "subluxation", scope: "chiro", displayName: "New Beginnings Chiropractic" },
  { username: "crossfit", password: "burpee", scope: "crossfit", displayName: "Evolved CrossFit" },
  { username: "owner", password: "lynnandmatt901", scope: "owner", displayName: "Matt & Lynn" },
];

const conn = await mysql.createConnection(DATABASE_URL);

for (const account of accounts) {
  const hash = await bcrypt.hash(account.password, 10);
  await conn.execute(
    `INSERT INTO app_users (username, passwordHash, scope, displayName)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE passwordHash = VALUES(passwordHash), scope = VALUES(scope), displayName = VALUES(displayName)`,
    [account.username, hash, account.scope, account.displayName]
  );
  console.log(`✓ Seeded: ${account.username} (${account.scope})`);
}

await conn.end();
console.log("Done.");
