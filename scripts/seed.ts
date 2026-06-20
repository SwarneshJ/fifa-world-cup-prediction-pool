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
  const userMap = new Map<string, number>();
  for (const u of usersToSeed) {
    const hashedPassword = await bcrypt.hash(u.password, 10);
    const [insertedUser] = await db.insert(schema.users).values({
      username: u.username.toLowerCase().trim(),
      name: u.name,
      password: hashedPassword,
      isAdmin: u.isAdmin,
      hasSpecialPrivilege: u.hasPrivilege,
      specialPrivilegeUsed: false,
    }).returning({ id: schema.users.id });
    
    userMap.set(u.username.toLowerCase().trim(), insertedUser.id);
    console.log(`Created user: ${u.username} with ID ${insertedUser.id}`);
  }

  // Pre-seed results and predictions for Matches 1 to 28 (Chronological)
  const chronoIds = [
    1, 2, 3, 4, 8, 7, 5, 6, 10, 11, 9, 12, 14, 15, 16, 13, 17, 18, 19, 20, 21, 22, 24, 23, 28, 26, 27, 25
  ];

  const matchResults: Record<number, { winner: 'home' | 'draw' | 'away'; homeScore: number; awayScore: number }> = {
    1: { winner: 'home', homeScore: 2, awayScore: 0 },
    2: { winner: 'home', homeScore: 2, awayScore: 1 },
    3: { winner: 'draw', homeScore: 1, awayScore: 1 },
    4: { winner: 'home', homeScore: 4, awayScore: 1 },
    5: { winner: 'away', homeScore: 0, awayScore: 1 },
    6: { winner: 'home', homeScore: 2, awayScore: 0 },
    7: { winner: 'draw', homeScore: 1, awayScore: 1 },
    8: { winner: 'draw', homeScore: 1, awayScore: 1 },
    9: { winner: 'home', homeScore: 1, awayScore: 0 },
    10: { winner: 'home', homeScore: 7, awayScore: 1 },
    11: { winner: 'draw', homeScore: 2, awayScore: 2 },
    12: { winner: 'home', homeScore: 5, awayScore: 1 },
    13: { winner: 'draw', homeScore: 2, awayScore: 2 },
    14: { winner: 'draw', homeScore: 0, awayScore: 0 },
    15: { winner: 'draw', homeScore: 1, awayScore: 1 },
    16: { winner: 'draw', homeScore: 1, awayScore: 1 },
    17: { winner: 'home', homeScore: 3, awayScore: 1 },
    18: { winner: 'away', homeScore: 1, awayScore: 4 },
    19: { winner: 'home', homeScore: 3, awayScore: 0 },
    20: { winner: 'home', homeScore: 3, awayScore: 1 },
    21: { winner: 'draw', homeScore: 1, awayScore: 1 },
    22: { winner: 'home', homeScore: 4, awayScore: 2 },
    23: { winner: 'away', homeScore: 1, awayScore: 3 },
    24: { winner: 'home', homeScore: 1, awayScore: 0 },
    25: { winner: 'home', homeScore: 1, awayScore: 0 },
    26: { winner: 'home', homeScore: 4, awayScore: 1 },
    27: { winner: 'home', homeScore: 6, awayScore: 0 },
    28: { winner: 'draw', homeScore: 1, awayScore: 1 }
  };

  // Map mock IDs used in the array back to usernames
  const mockIdToUsername: Record<number, string> = {
    2: 'swarnesh',
    3: 'varun',
    4: 'piyush',
    5: 'praveen',
    6: 'shaunak',
    7: 'nachiket',
  };

  const userPicks: Record<number, string>[] = [
    { 2: 'home', 3: 'home', 4: 'home', 5: 'home', 6: 'home', 7: 'home' }, // M1
    { 2: 'away', 3: 'draw', 4: 'away', 5: 'home', 6: 'away', 7: 'draw' }, // M2
    { 2: 'home', 3: 'home', 4: 'home', 5: 'draw', 6: 'draw', 7: 'draw' }, // M3
    { 2: 'home', 3: 'home', 4: 'home', 5: 'home', 6: 'home', 7: 'home' }, // M4
    { 2: 'away', 3: 'away', 4: 'away', 5: 'away', 6: 'away', 7: 'away' }, // M5
    { 2: 'home', 3: 'draw', 4: 'home', 5: 'home', 6: 'home', 7: 'home' }, // M6
    { 2: 'home', 3: 'away', 4: 'away', 5: 'away', 6: 'away', 7: 'away' }, // M7
    { 2: 'home', 3: 'away', 4: 'home', 5: 'away', 6: 'away', 7: 'away' }, // M8
    { 2: 'home', 3: 'home', 4: 'home', 5: 'home', 6: 'home', 7: 'home' }, // M9
    { 2: 'draw', 3: 'home', 4: 'home', 5: 'draw', 6: 'home', 7: 'away' }, // M10
    { 2: 'away', 3: 'draw', 4: 'draw', 5: 'away', 6: 'away', 7: 'draw' }, // M11
    { 2: 'draw', 3: 'home', 4: 'home', 5: 'draw', 6: 'home', 7: 'home' }, // M12
    { 2: 'home', 3: 'home', 4: 'home', 5: 'home', 6: 'home', 7: 'home' }, // M13
    { 2: 'draw', 3: 'home', 4: 'draw', 5: 'home', 6: 'home', 7: 'home' }, // M14
    { 2: 'away', 3: 'away', 4: 'away', 5: 'away', 6: 'draw', 7: 'away' }, // M15
    { 2: 'home', 3: 'home', 4: 'home', 5: 'home', 6: 'home', 7: 'draw' }, // M16
    { 2: 'home', 3: 'draw', 4: 'home', 5: 'home', 6: 'home', 7: 'home' }, // M17
    { 2: 'draw', 3: 'draw', 4: 'away', 5: 'away', 6: 'away', 7: 'away' }, // M18
    { 2: 'home', 3: 'home', 4: 'home', 5: 'home', 6: 'home', 7: 'home' }, // M19
    { 2: 'home', 3: 'home', 4: 'draw', 5: 'home', 6: 'home', 7: 'home' }, // M20
    { 2: 'home', 3: 'home', 4: 'home', 5: 'home', 6: 'home', 7: 'home' }, // M21
    { 2: 'home', 3: 'home', 4: 'home', 5: 'home', 6: 'draw', 7: 'home' }, // M22
    { 2: 'draw', 3: 'draw', 4: 'draw', 5: 'draw', 6: 'draw', 7: 'draw' }, // M23
    { 2: 'away', 3: 'away', 4: 'away', 5: 'away', 6: 'away', 7: 'away' }, // M24
    { 2: 'home', 3: 'home', 4: 'home', 5: 'home', 6: 'home', 7: 'home' }, // M25
    { 2: 'home', 3: 'home', 4: 'home', 5: 'home', 6: 'draw', 7: 'home' }, // M26
    { 2: 'home', 3: 'home', 4: 'home', 5: 'home', 6: 'home', 7: 'home' }, // M27
    { 2: 'home', 3: 'draw', 4: 'home', 5: 'draw', 6: 'draw', 7: 'draw' }, // M28
  ];

  console.log('Seeding matches...');
  for (const f of FIXTURES) {
    const result = matchResults[f.id];
    await db.insert(schema.matches).values({
      id: f.id,
      stage: f.stage,
      group: f.group,
      homeTeam: f.homeTeam,
      awayTeam: f.awayTeam,
      kickoffAt: new Date(f.kickoffAt),
      venue: f.venue,
      finished: !!result,
      homeScore: result ? result.homeScore : null,
      awayScore: result ? result.awayScore : null,
      winner: result ? result.winner : null,
      isAnonymous: false,
      anonymityRequested: false,
    });
  }
  console.log(`Seeded ${FIXTURES.length} matches.`);

  console.log('Seeding predictions...');
  for (let index = 0; index < chronoIds.length; index++) {
    const dbId = chronoIds[index];
    const picks = userPicks[dbId - 1];
    for (const [mockIdStr, pick] of Object.entries(picks)) {
      const mockId = parseInt(mockIdStr, 10);
      const username = mockIdToUsername[mockId];
      if (username) {
        const dbUserId = userMap.get(username);
        if (dbUserId) {
          await db.insert(schema.predictions).values({
            userId: dbUserId,
            matchId: dbId,
            pick,
            updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          });
        }
      }
    }
  }
  console.log('Seeded prediction picks.');

  // Seeding specific predictions for matches 31 and 32
  console.log('Seeding specific predictions for matches 31 and 32...');
  const praveenId = userMap.get('praveen');
  if (praveenId) {
    await sql`
      INSERT INTO predictions (user_id, match_id, pick)
      VALUES (${praveenId}, 31, 'home')
      ON CONFLICT (user_id, match_id) DO UPDATE SET pick = 'home'
    `;
  }
  const shaunakId = userMap.get('shaunak');
  if (shaunakId) {
    await sql`
      INSERT INTO predictions (user_id, match_id, pick)
      VALUES (${shaunakId}, 32, 'draw')
      ON CONFLICT (user_id, match_id) DO UPDATE SET pick = 'draw'
    `;
  }

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
