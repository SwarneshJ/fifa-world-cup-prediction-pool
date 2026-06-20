import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as schema from '@/lib/schema';
import { FIXTURES } from '@/lib/fixtures';
import * as bcrypt from 'bcryptjs';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const force = searchParams.get('force') === 'true';
  const reseedHistorical = searchParams.get('reseed_historical') === 'true';

  const logs: string[] = [];
  let success = true;
  let dbConnected = false;

  try {
    // 1. Test database connection
    logs.push('Testing database connection...');
    await db.execute(sql`SELECT 1`);
    dbConnected = true;
    logs.push('✅ Database connection test succeeded.');
  } catch (err: any) {
    success = false;
    logs.push(`❌ Database connection test failed: ${err.message || err}`);
    return renderHtmlResponse(success, logs);
  }

  try {
    // 2. Create tables if they do not exist
    logs.push('Setting up tables schema...');
    
    // Create matches table
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS "matches" (
        "id" integer PRIMARY KEY NOT NULL,
        "stage" text NOT NULL,
        "group" text,
        "home_team" text NOT NULL,
        "away_team" text NOT NULL,
        "kickoff_at" timestamp NOT NULL,
        "venue" text NOT NULL,
        "home_score" integer,
        "away_score" integer,
        "winner" text,
        "finished" boolean DEFAULT false NOT NULL,
        "is_locked_manually" boolean DEFAULT false NOT NULL,
        "is_anonymous" boolean DEFAULT false NOT NULL,
        "anonymity_requested" boolean DEFAULT false NOT NULL
      );
    `));
    logs.push('✅ Table "matches" checked/created.');

    // Create users table
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" serial PRIMARY KEY NOT NULL,
        "username" text NOT NULL,
        "password" text NOT NULL,
        "name" text NOT NULL,
        "is_admin" boolean DEFAULT false NOT NULL,
        "has_special_privilege" boolean DEFAULT false NOT NULL,
        "special_privilege_used" boolean DEFAULT false NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "users_username_unique" UNIQUE("username")
      );
    `));
    logs.push('✅ Table "users" checked/created.');

    // Create predictions table
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS "predictions" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" integer NOT NULL REFERENCES users(id) ON DELETE cascade,
        "match_id" integer NOT NULL REFERENCES matches(id) ON DELETE cascade,
        "pick" text NOT NULL,
        "predicted_home_score" integer,
        "predicted_away_score" integer,
        "updated_at" timestamp DEFAULT now() NOT NULL,
        CONSTRAINT "user_match_unique" UNIQUE("user_id","match_id")
      );
    `));
    logs.push('✅ Table "predictions" checked/created.');

    // Create settings table
    await db.execute(sql.raw(`
      CREATE TABLE IF NOT EXISTS "settings" (
        "key" text PRIMARY KEY NOT NULL,
        "value" text NOT NULL
      );
    `));
    logs.push('✅ Table "settings" checked/created.');
    logs.push('✅ Database schema verified.');

  } catch (err: any) {
    success = false;
    logs.push(`❌ Schema creation failed: ${err.message || err}`);
    return renderHtmlResponse(success, logs);
  }

  // 3. Clear data if force = true, or check if we need to seed
  try {
    const userCheck = await db.select().from(schema.users).limit(1);
    const alreadySeeded = userCheck.length > 0;

    if (alreadySeeded && !force && !reseedHistorical) {
      logs.push('⚠️ Database is already seeded. Seeding skipped. (Use /api/init-db?force=true to reset and re-seed, or /api/init-db?reseed_historical=true to correct historical predictions without losing users/new predictions)');
      return renderHtmlResponse(success, logs);
    }

    const userMap = new Map<string, number>();

    if (reseedHistorical) {
      logs.push('Reseeding historical predictions only. Fetching existing users...');
      const dbUsers = await db.select().from(schema.users);
      for (const u of dbUsers) {
        userMap.set(u.username.toLowerCase().trim(), u.id);
      }
      logs.push(`Loaded ${dbUsers.length} existing users from DB.`);
      
      logs.push('Removing existing predictions for matches 1-28...');
      await db.execute(sql`DELETE FROM predictions WHERE match_id <= 28`);
      logs.push('✅ Old historical predictions wiped.');
    } else {
      if (force) {
        logs.push('Wiping old data from tables...');
        await db.delete(schema.predictions);
        await db.delete(schema.matches);
        await db.delete(schema.users);
        await db.delete(schema.settings);
        logs.push('✅ Old data wiped successfully.');
      }

      logs.push('Seeding database tables...');

      // A. Seed Users
      const usersToSeed = [
        { username: 'swarnesh_admin', name: 'Swaggy', password: 'adminpassword126', isAdmin: true, hasPrivilege: false },
        { username: 'swarnesh', name: 'Swaggy', password: 'swarneshpassword126', isAdmin: false, hasPrivilege: true },
        { username: 'varun', name: 'Motesh', password: 'varunpassword126', isAdmin: false, hasPrivilege: true },
        { username: 'piyush', name: 'PRMJ', password: 'piyushpassword126', isAdmin: false, hasPrivilege: false },
        { username: 'praveen', name: 'Illad', password: 'praveenpassword126', isAdmin: false, hasPrivilege: true },
        { username: 'shaunak', name: 'Bokya', password: 'shaunakpassword126', isAdmin: false, hasPrivilege: false },
        { username: 'nachiket', name: 'Naiket', password: 'nachiketpassword126', isAdmin: false, hasPrivilege: true },
      ];

      for (const u of usersToSeed) {
        const hashedPassword = bcrypt.hashSync(u.password, 10);
        const [insertedUser] = await db.insert(schema.users).values({
          username: u.username.toLowerCase().trim(),
          name: u.name,
          password: hashedPassword,
          isAdmin: u.isAdmin,
          hasSpecialPrivilege: u.hasPrivilege,
          specialPrivilegeUsed: false,
        }).returning({ id: schema.users.id });
        
        userMap.set(u.username.toLowerCase().trim(), insertedUser.id);
        logs.push(`👤 Seeded user: ${u.username} (ID: ${insertedUser.id})`);
      }
    }

    // B. Match Results Map
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

    // C. Seed Matches
    if (!reseedHistorical) {
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
      logs.push(`⚽ Seeded ${FIXTURES.length} tournament matches.`);
    }

    // D. Seed Predictions
    let predictionCount = 0;
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
            predictionCount++;
          }
        }
      }
    }
    logs.push(`🗳️ Seeded ${predictionCount} historical predictions (Matches 1-28).`);

    // E. Seed Settings
    if (!reseedHistorical) {
      await db.insert(schema.settings).values([
        { key: 'anonymous_mode', value: 'false' },
        { key: 'exact_score_bonus', value: 'false' },
      ]);
      logs.push('⚙️ Seeded default settings.');
    }

    logs.push('🎉 Database seeding completed successfully!');
  } catch (err: any) {
    success = false;
    logs.push(`❌ Seeding failed: ${err.message || err}`);
  }

  return renderHtmlResponse(success, logs);
}

function renderHtmlResponse(success: boolean, logs: string[]) {
  const title = success ? 'Database Initialized Successfully' : 'Database Initialization Failed';
  const statusColor = success ? '#10b981' : '#ef4444';
  const statusBg = success ? '#ecfdf5' : '#fef2f2';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f3f4f6;
      color: #1f2937;
      margin: 0;
      padding: 40px 20px;
      display: flex;
      justify-content: center;
    }
    .card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      width: 100%;
      max-width: 650px;
      padding: 32px;
    }
    .header {
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 9999px;
      font-weight: bold;
      font-size: 14px;
      color: ${statusColor};
      background-color: ${statusBg};
      border: 1px solid ${statusColor}40;
      margin-top: 8px;
    }
    h1 {
      margin: 0;
      font-size: 24px;
      color: #111827;
    }
    .log-container {
      background: #1f2937;
      color: #f9fafb;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      padding: 16px;
      border-radius: 8px;
      max-height: 350px;
      overflow-y: auto;
      font-size: 13px;
      line-height: 1.6;
    }
    .log-line {
      margin-bottom: 6px;
      border-bottom: 1px solid #374151;
      padding-bottom: 4px;
    }
    .log-line:last-child {
      margin-bottom: 0;
      border-bottom: none;
      padding-bottom: 0;
    }
    .credentials {
      margin-top: 24px;
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      padding: 16px;
      border-radius: 8px;
    }
    .credentials h3 {
      margin-top: 0;
      color: #111827;
    }
    .credentials table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    .credentials th, .credentials td {
      text-align: left;
      padding: 8px;
      border-bottom: 1px solid #e5e7eb;
    }
    .credentials th {
      color: #4b5563;
      font-weight: 600;
    }
    .action-btn {
      display: inline-block;
      margin-top: 24px;
      background-color: #15803d;
      color: white;
      padding: 12px 24px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: bold;
      text-align: center;
      transition: background-color 0.2s;
    }
    .action-btn:hover {
      background-color: #166534;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Database Setup Dashboard</h1>
      <div class="status-badge">${success ? 'SUCCESS' : 'FAILED'}</div>
    </div>
    
    <h2>Execution Logs</h2>
    <div class="log-container">
      ${logs.map(log => `<div class="log-line">${log}</div>`).join('')}
    </div>

    ${success ? `
      <div class="credentials">
        <h3>🔑 Default Seeding Login Accounts</h3>
        <table>
          <thead>
            <tr>
              <th>Role</th>
              <th>Username</th>
              <th>Password</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Admin</strong></td>
              <td><code>swarnesh_admin</code></td>
              <td><code>adminpassword126</code></td>
            </tr>
            <tr>
              <td><strong>User (Swaggy)</strong></td>
              <td><code>swarnesh</code></td>
              <td><code>swarneshpassword126</code></td>
            </tr>
            <tr>
              <td><strong>User (Motesh)</strong></td>
              <td><code>varun</code></td>
              <td><code>varunpassword126</code></td>
            </tr>
          </tbody>
        </table>
      </div>
      <a href="/login" class="action-btn">Go to Prediction Pool Login</a>
    ` : `
      <a href="/api/init-db?force=true" class="action-btn" style="background-color: #dc2626;">Force Re-init Database</a>
    `}
  </div>
</body>
</html>
`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}
