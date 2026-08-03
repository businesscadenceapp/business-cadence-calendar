import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

try {
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS \`person_hours\` (
      \`id\` int AUTO_INCREMENT NOT NULL,
      \`accountId\` int NOT NULL,
      \`personId\` varchar(64) NOT NULL,
      \`workDays\` text NOT NULL,
      \`startTime\` varchar(5) NOT NULL DEFAULT '08:00',
      \`endTime\` varchar(5) NOT NULL DEFAULT '18:00',
      \`timezone\` varchar(64) NOT NULL DEFAULT 'America/New_York',
      \`manualDndActive\` boolean NOT NULL DEFAULT false,
      \`createdAt\` timestamp NOT NULL DEFAULT (now()),
      \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT \`person_hours_id\` PRIMARY KEY(\`id\`)
    )
  `);
  console.log("✓ person_hours table created (or already exists)");
} catch (e) {
  console.error("Error:", e.message);
} finally {
  await conn.end();
}
