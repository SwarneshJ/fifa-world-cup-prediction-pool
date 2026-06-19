import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as bcrypt from 'bcryptjs';
import * as schema from '../src/lib/schema';
import { FIXTURES } from '../src/lib/fixtures';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('Error: DATABASE_URL environment variable is required.');
  process.exit(1);
}

const sql = neon(databaseUrl);
const db = drizzle({ client: sql, schema });

async function main() {
  console.log('Seeding database...');

  const usersToSeed = [
    { username: 'swarnesh_admin', name: 'Swaggy', password: 'adminpassword126', isAdmin: true, hasPrivilege: false },
    { username: 'swarnesh', name: 'Swaggy', password: 'swarneshpassword126', isAdmin: false, hasPrivilege: true },
    { username: 'varun', name: 'Motesh', password: 'varunpassword126', isAdmin: false, hasPrivilege: true },
    { username: 'piyush', name: 'PRMJ', password: 'piyushpassword126', isAdmin: false, hasPrivilege: false },
    { username: 'praveen', name: 'Illad', password: 'praveenpassword126', isAdmin: false, hasPrivilege: true },
    { username: 'shaunak', name: 'Bokya', password: 'shaunakpassword126', isAdmin: false, hasPrivilege: false },
    { username: 'nachiket', name: 'Naiket', password: 'nachiketpassword126', isAdmin: false, hasPrivilege: true },
  ];

  console.log('Clearing old data...');
  await db.delete(schema.predictions);
  await db.delete(schema.matches);
  await db.delete(schema.users);
  await db.delete(schema.settings);

  console.log('Seeding users...');
  for (const u of usersToSeed) {
    const hashedPassword = await bcrypt.hash(u.password, 10);
    await db.insert(schema.users).values({
      username: u.username.toLowerCase().trim(),
      name: u.name,
      password: hashedPassword,
      isAdmin: u.isAdmin,
      hasSpecialPrivilege: u.hasPrivilege,
      specialPrivilegeUsed: false,
    });
    console.log(`Created user: ${u.username}`);
  }

  console.log('Seeding matches...');
  for (const f of FIXTURES) {
    await db.insert(schema.matches).values({
      id: f.id,
      stage: f.stage,
      group: f.group,
      homeTeam: f.homeTeam,
      awayTeam: f.awayTeam,
      kickoffAt: new Date(f.kickoffAt),
      venue: f.venue,
      finished: false,
      isAnonymous: false,
      anonymityRequested: false,
    });
  }
  console.log(`Seeded ${FIXTURES.length} matches.`);

  console.log('Seeding settings...');
  await db.insert(schema.settings).values([
    { key: 'anonymous_mode', value: 'false' },
    { key: 'exact_score_bonus', value: 'false' },
  ]);
  console.log('Seeded default settings.');

  console.log('Database seeding completed successfully!');
}

main()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
