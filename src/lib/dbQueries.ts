import fs from 'fs';
import path from 'path';
import { db } from './db';
import { users, matches, predictions, settings } from './schema';
import { eq, and, asc } from 'drizzle-orm';
import { FIXTURES } from './fixtures';
import * as bcrypt from 'bcryptjs';

const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const isMockMode = !dbUrl || dbUrl.includes('placeholder-url') || dbUrl.includes('localhost');
const localDbPath = path.join(process.cwd(), 'local_db.json');

// Interface definitions
export interface DBUser {
  id: number;
  username: string;
  name: string;
  password?: string;
  isAdmin: boolean;
  hasSpecialPrivilege: boolean;
  specialPrivilegeUsed: boolean;
  createdAt?: string | Date;
}

export interface DBMatch {
  id: number;
  stage: string;
  group: string | null;
  homeTeam: string;
  awayTeam: string;
  kickoffAt: string;
  venue: string;
  homeScore: number | null;
  awayScore: number | null;
  winner: string | null;
  finished: boolean;
  isLockedManually: boolean;
  isAnonymous: boolean;
  anonymityRequested: boolean;
}

export interface DBPrediction {
  id?: number;
  userId: number;
  matchId: number;
  pick: string;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  updatedAt: string | Date;
}

// Initial Mock Database Seed State
function getInitialMockState() {
  const salt = bcrypt.genSaltSync(10);
  const swarneshAdminHashed = bcrypt.hashSync('adminpassword126', salt);
  const swarneshHashed = bcrypt.hashSync('swarneshpassword126', salt);
  const varunHashed = bcrypt.hashSync('varunpassword126', salt);
  const piyushHashed = bcrypt.hashSync('piyushpassword126', salt);
  const praveenHashed = bcrypt.hashSync('praveenpassword126', salt);
  const shaunakHashed = bcrypt.hashSync('shaunakpassword126', salt);
  const nachiketHashed = bcrypt.hashSync('nachiketpassword126', salt);

  const initialUsers: DBUser[] = [
    { id: 1, username: 'swarnesh_admin', name: 'Swaggy', password: swarneshAdminHashed, isAdmin: true, hasSpecialPrivilege: false, specialPrivilegeUsed: false },
    { id: 2, username: 'swarnesh', name: 'Swaggy', password: swarneshHashed, isAdmin: false, hasSpecialPrivilege: true, specialPrivilegeUsed: false },
    { id: 3, username: 'varun', name: 'Motesh', password: varunHashed, isAdmin: false, hasSpecialPrivilege: true, specialPrivilegeUsed: false },
    { id: 4, username: 'piyush', name: 'PRMJ', password: piyushHashed, isAdmin: false, hasSpecialPrivilege: false, specialPrivilegeUsed: false },
    { id: 5, username: 'praveen', name: 'Illad', password: praveenHashed, isAdmin: false, hasSpecialPrivilege: true, specialPrivilegeUsed: false },
    { id: 6, username: 'shaunak', name: 'Bokya', password: shaunakHashed, isAdmin: false, hasSpecialPrivilege: false, specialPrivilegeUsed: false },
    { id: 7, username: 'nachiket', name: 'Naiket', password: nachiketHashed, isAdmin: false, hasSpecialPrivilege: true, specialPrivilegeUsed: false },
  ];

  const initialMatches: DBMatch[] = FIXTURES.map((f) => ({
    id: f.id,
    stage: f.stage,
    group: f.group,
    homeTeam: f.homeTeam,
    awayTeam: f.awayTeam,
    kickoffAt: f.kickoffAt,
    venue: f.venue,
    homeScore: null,
    awayScore: null,
    winner: null,
    finished: false,
    isLockedManually: false,
    isAnonymous: false,
    anonymityRequested: false,
  }));

  // Pre-seed results and predictions for Matches 1 to 36 (Chronological)
  const chronoIds = [
    1, 2, 3, 4, 8, 7, 5, 6, 10, 11, 9, 12, 14, 15, 16, 13, 17, 18, 19, 20, 21, 22, 24, 23, 28, 26, 27, 25,
    31, 30, 29, 32, 35, 33, 34, 36
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

  // User IDs: Swaggy (2), Motesh (3), PRMJ (4), Illad (5), Bokya (6), Naiket (7)
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
    { 2: 'home', 3: 'home', 4: 'home', 5: 'home', 6: 'home', 7: 'home' }, // M29 (USA vs Australia, FIFA 31)
    { 2: 'away', 3: 'away', 4: 'away', 5: 'away', 6: 'away', 7: 'away' }, // M30 (Scotland vs Morocco, FIFA 30)
    { 2: 'home', 3: 'home', 4: 'home', 5: 'home', 6: 'home', 7: 'home' }, // M31 (Brazil vs Haiti, FIFA 29)
    { 2: 'home', 3: 'draw', 4: 'home', 5: 'home', 6: 'draw', 7: 'draw' }, // M32 (Turkey vs Paraguay, FIFA 32)
    { 2: 'home', 3: 'home', 4: 'home', 5: 'home', 6: 'home', 7: 'home' }, // M33 (Netherlands vs Sweden, FIFA 35)
    { 2: 'home', 3: 'home', 4: 'home', 5: 'home', 6: 'home', 7: 'home' }, // M34 (Germany vs Ivory Coast, FIFA 33)
    { 2: 'home', 3: 'home', 4: 'home', 5: 'home', 6: 'home', 7: 'home' }, // M35 (Ecuador vs Curaçao, FIFA 34)
    { 2: 'away', 3: 'away', 4: 'away', 5: 'away', 6: 'away', 7: 'away' }, // M36 (Tunisia vs Japan, FIFA 36)
  ];

  const initialPredictions: DBPrediction[] = [];
  let predIdCounter = 1;

  chronoIds.forEach((dbId, index) => {
    const match = initialMatches.find(m => m.id === dbId);
    const resultInfo = matchResults[dbId];
    if (match && resultInfo) {
      match.finished = true;
      match.winner = resultInfo.winner;
      match.homeScore = resultInfo.homeScore;
      match.awayScore = resultInfo.awayScore;
    }

    const picks = userPicks[index];
    for (const [userIdStr, pick] of Object.entries(picks)) {
      const userId = parseInt(userIdStr, 10);
      initialPredictions.push({
        id: predIdCounter++,
        userId,
        matchId: dbId,
        pick,
        predictedHomeScore: null,
        predictedAwayScore: null,
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  });

  const initialSettings = {
    anonymous_mode: 'false',
    exact_score_bonus: 'false',
  };

  return {
    users: initialUsers,
    matches: initialMatches,
    predictions: initialPredictions,
    settings: initialSettings,
  };
}

// Read/Write helper for Local JSON
function readLocalDb() {
  if (!fs.existsSync(localDbPath)) {
    const initialState = getInitialMockState();
    fs.writeFileSync(localDbPath, JSON.stringify(initialState, null, 2));
    return initialState;
  }
  try {
    return JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
  } catch (e) {
    const initialState = getInitialMockState();
    fs.writeFileSync(localDbPath, JSON.stringify(initialState, null, 2));
    return initialState;
  }
}

function writeLocalDb(data: any) {
  fs.writeFileSync(localDbPath, JSON.stringify(data, null, 2));
}

// ==========================================
// DB OPERATIONS (Abstracted Layer)
// ==========================================

export async function getUserByUsername(username: string): Promise<DBUser | null> {
  const normUser = username.toLowerCase().trim();
  if (isMockMode) {
    const data = readLocalDb();
    const u = data.users.find((x: any) => x.username === normUser);
    return u || null;
  } else {
    const [dbUser] = await db.select().from(users).where(eq(users.username, normUser)).limit(1);
    return dbUser || null;
  }
}

export async function getUserById(id: number): Promise<DBUser | null> {
  if (isMockMode) {
    const data = readLocalDb();
    const u = data.users.find((x: any) => x.id === id);
    return u || null;
  } else {
    const [dbUser] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return dbUser || null;
  }
}

export async function getAllUsers(): Promise<DBUser[]> {
  if (isMockMode) {
    const data = readLocalDb();
    return data.users.map((u: any) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      isAdmin: u.isAdmin,
      hasSpecialPrivilege: u.hasSpecialPrivilege,
      specialPrivilegeUsed: u.specialPrivilegeUsed,
    }));
  } else {
    return db.select({
      id: users.id,
      name: users.name,
      username: users.username,
      isAdmin: users.isAdmin,
      hasSpecialPrivilege: users.hasSpecialPrivilege,
      specialPrivilegeUsed: users.specialPrivilegeUsed,
    }).from(users).orderBy(asc(users.id));
  }
}

async function getLastSyncTime(): Promise<number> {
  if (isMockMode) {
    const data = readLocalDb();
    if (!data.settings) data.settings = {};
    return parseInt(data.settings.last_sync_time || '0', 10);
  } else {
    try {
      const [row] = await db.select().from(settings).where(eq(settings.key, 'last_sync_time')).limit(1);
      return row ? parseInt(row.value, 10) : 0;
    } catch {
      return 0;
    }
  }
}

async function setLastSyncTime(timeMs: number): Promise<void> {
  const valStr = String(timeMs);
  if (isMockMode) {
    const data = readLocalDb();
    if (!data.settings) data.settings = {};
    data.settings.last_sync_time = valStr;
    writeLocalDb(data);
  } else {
    try {
      await db
        .insert(settings)
        .values({ key: 'last_sync_time', value: valStr })
        .onConflictDoUpdate({
          target: settings.key,
          set: { value: valStr },
        });
    } catch (err) {
      console.error('Error saving last_sync_time:', err);
    }
  }
}

export async function getAllMatches(): Promise<DBMatch[]> {
  const isMock = isMockMode;
  let matchesList: DBMatch[] = [];
  let updateMatchesCallback: (updatedMatches: any[]) => Promise<void> = async () => {};

  if (isMock) {
    const data = readLocalDb();
    matchesList = data.matches;
    updateMatchesCallback = async (updatedMatches) => {
      data.matches = updatedMatches;
      writeLocalDb(data);
    };
  } else {
    const dbMatches = await db.select().from(matches);
    matchesList = dbMatches.map((m) => ({
      ...m,
      kickoffAt: m.kickoffAt instanceof Date ? m.kickoffAt.toISOString() : new Date(m.kickoffAt).toISOString(),
    }));
    updateMatchesCallback = async (updatedMatches) => {
      // Find matches that changed their finished status or have score changes and update them in DB
      for (const m of updatedMatches) {
        const original = dbMatches.find(dm => dm.id === m.id);
        if (original) {
          const needsDbUpdate = original.finished !== m.finished || 
                                original.homeScore !== m.homeScore || 
                                original.awayScore !== m.awayScore || 
                                original.winner !== m.winner;
                                
          if (needsDbUpdate) {
            await db
              .update(matches)
              .set({
                finished: m.finished,
                homeScore: m.homeScore,
                awayScore: m.awayScore,
                winner: m.winner,
              })
              .where(eq(matches.id, m.id));
          }
        }
      }
    };
  }

  // Throttle live API syncing to once every 3 minutes
  const now = new Date();
  const lastSync = await getLastSyncTime();
  const cacheDuration = 3 * 60 * 1000; // 3 minutes
  const shouldSync = (now.getTime() - lastSync) >= cacheDuration;

  if (shouldSync) {
    // Lock the sync immediately to prevent concurrent requests from launching slow fetches
    await setLastSyncTime(now.getTime());

    // Fetch latest live match results from the internet
    let gamesList: any[] = [];
    let isLiveAPI = false;
    try {
      const res = await fetch('https://worldcup26.ir/get/games', {
        next: { revalidate: 60 } // Cache API response for 60 seconds
      });
      if (res.ok) {
        const apiData = await res.json();
        gamesList = apiData.games || [];
        isLiveAPI = true;
      }
    } catch (err) {
      console.error('Error fetching live scores from worldcup26.ir:', err);
    }

    // Fallback to local games.json if API fetch failed
    if (gamesList.length === 0) {
      try {
        const gamesFilePath = path.join(process.cwd(), 'src', 'lib', 'games.json');
        if (fs.existsSync(gamesFilePath)) {
          const gamesData = JSON.parse(fs.readFileSync(gamesFilePath, 'utf8'));
          gamesList = gamesData.games || [];
        }
      } catch (err) {
        console.error('Error reading games.json fallback:', err);
      }
    }

    // Process auto-updates & self-healing
    let hasUpdates = false;

    matchesList.forEach((match: any) => {
      const matchedGame = gamesList.find((g: any) => String(g.id) === String(match.id));
      if (matchedGame) {
        const isApiFinished = matchedGame.finished === 'TRUE' || matchedGame.finished === true;
        if (isApiFinished) {
          const kickoff = new Date(match.kickoffAt);
          const endsAt = new Date(kickoff.getTime() + 2 * 60 * 60 * 1000);
          // Only mark finished if current time is past kickoff/expected end
          // (to prevent any API anomalies from finishing future games)
          if (now >= endsAt) {
            const hs = parseInt(matchedGame.home_score, 10);
            const as = parseInt(matchedGame.away_score, 10);
            if (!isNaN(hs) && !isNaN(as)) {
              const apiWinner = hs > as ? 'home' : as > hs ? 'away' : 'draw';
              
              // Self-heal: update if database has wrong scores or is unfinished
              const needsUpdate = !match.finished || 
                                  match.homeScore !== hs || 
                                  match.awayScore !== as || 
                                  match.winner !== apiWinner;

              if (needsUpdate) {
                match.finished = true;
                match.homeScore = hs;
                match.awayScore = as;
                match.winner = apiWinner;
                hasUpdates = true;
              }
            }
          }
        } else {
          // Self-heal: if the database has it finished but API says it's not finished,
          // reset it back to unfinished. ONLY do this if we successfully fetched the live API,
          // since the local games.json fallback is static and outdated.
          if (isLiveAPI && match.finished) {
            match.finished = false;
            match.homeScore = null;
            match.awayScore = null;
            match.winner = null;
            hasUpdates = true;
          }
        }
      }
    });

    if (hasUpdates) {
      await updateMatchesCallback(matchesList);
    }
  }

  return matchesList;
}

export async function getAllPredictions(): Promise<DBPrediction[]> {
  if (isMockMode) {
    const data = readLocalDb();
    return data.predictions;
  } else {
    const dbPreds = await db.select().from(predictions);
    return dbPreds.map((p) => ({
      ...p,
      updatedAt: p.updatedAt.toISOString(),
    }));
  }
}

export async function getSettingsMap() {
  if (isMockMode) {
    const data = readLocalDb();
    return {
      anonymousMode: data.settings.anonymous_mode === 'true',
      exactScoreBonus: data.settings.exact_score_bonus === 'true',
    };
  } else {
    const rows = await db.select().from(settings);
    const map = rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, string>);
    return {
      anonymousMode: map['anonymous_mode'] === 'true',
      exactScoreBonus: map['exact_score_bonus'] === 'true',
    };
  }
}

export async function savePrediction(
  userId: number,
  matchId: number,
  pick: string,
  homeScore: number | null,
  awayScore: number | null
) {
  if (isMockMode) {
    const data = readLocalDb();
    const idx = data.predictions.findIndex((p: any) => p.userId === userId && p.matchId === matchId);
    const newPred = {
      userId,
      matchId,
      pick,
      predictedHomeScore: homeScore,
      predictedAwayScore: awayScore,
      updatedAt: new Date().toISOString(),
    };

    if (idx !== -1) {
      data.predictions[idx] = newPred;
    } else {
      data.predictions.push(newPred);
    }
    writeLocalDb(data);
  } else {
    await db
      .insert(predictions)
      .values({
        userId,
        matchId,
        pick,
        predictedHomeScore: homeScore,
        predictedAwayScore: awayScore,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [predictions.userId, predictions.matchId],
        set: {
          pick,
          predictedHomeScore: homeScore,
          predictedAwayScore: awayScore,
          updatedAt: new Date(),
        },
      });
  }
}

export async function updateMatchResult(
  matchId: number,
  homeScore: number,
  awayScore: number,
  winner: string,
  finished: boolean
) {
  if (isMockMode) {
    const data = readLocalDb();
    const idx = data.matches.findIndex((m: any) => m.id === matchId);
    if (idx !== -1) {
      data.matches[idx].homeScore = homeScore;
      data.matches[idx].awayScore = awayScore;
      data.matches[idx].winner = winner;
      data.matches[idx].finished = finished;
      writeLocalDb(data);
    }
  } else {
    await db
      .update(matches)
      .set({ homeScore, awayScore, winner, finished })
      .where(eq(matches.id, matchId));
  }
}

export async function updateMatchTeams(matchId: number, homeTeam: string, awayTeam: string) {
  if (isMockMode) {
    const data = readLocalDb();
    const idx = data.matches.findIndex((m: any) => m.id === matchId);
    if (idx !== -1) {
      data.matches[idx].homeTeam = homeTeam.trim();
      data.matches[idx].awayTeam = awayTeam.trim();
      writeLocalDb(data);
    }
  } else {
    await db
      .update(matches)
      .set({ homeTeam: homeTeam.trim(), awayTeam: awayTeam.trim() })
      .where(eq(matches.id, matchId));
  }
}

export async function updateMatchLock(matchId: number, isLocked: boolean) {
  if (isMockMode) {
    const data = readLocalDb();
    const idx = data.matches.findIndex((m: any) => m.id === matchId);
    if (idx !== -1) {
      data.matches[idx].isLockedManually = isLocked;
      writeLocalDb(data);
    }
  } else {
    await db
      .update(matches)
      .set({ isLockedManually: isLocked })
      .where(eq(matches.id, matchId));
  }
}

export async function updateUserPassword(userId: number, hashedPass: string) {
  if (isMockMode) {
    const data = readLocalDb();
    const idx = data.users.findIndex((u: any) => u.id === userId);
    if (idx !== -1) {
      data.users[idx].password = hashedPass;
      writeLocalDb(data);
    }
  } else {
    await db
      .update(users)
      .set({ password: hashedPass })
      .where(eq(users.id, userId));
  }
}

export async function updatePoolSettings(anonymousMode: boolean, exactScoreBonus: boolean) {
  if (isMockMode) {
    const data = readLocalDb();
    data.settings.anonymous_mode = anonymousMode ? 'true' : 'false';
    data.settings.exact_score_bonus = exactScoreBonus ? 'true' : 'false';
    writeLocalDb(data);
  } else {
    await db
      .insert(settings)
      .values([
        { key: 'anonymous_mode', value: anonymousMode ? 'true' : 'false' },
        { key: 'exact_score_bonus', value: exactScoreBonus ? 'true' : 'false' },
      ])
      .onConflictDoUpdate({
        target: [settings.key],
        set: { value: anonymousMode ? 'true' : 'false' },
      });

    await db
      .update(settings)
      .set({ value: anonymousMode ? 'true' : 'false' })
      .where(eq(settings.key, 'anonymous_mode'));

    await db
      .update(settings)
      .set({ value: exactScoreBonus ? 'true' : 'false' })
      .where(eq(settings.key, 'exact_score_bonus'));
  }
}

// ==========================================
// NEW PRIVILEGE & MATCH ANONYMITY QUERIES
// ==========================================

export async function requestMatchAnonymity(matchId: number) {
  if (isMockMode) {
    const data = readLocalDb();
    const idx = data.matches.findIndex((m: any) => m.id === matchId);
    if (idx !== -1) {
      data.matches[idx].anonymityRequested = true;
      writeLocalDb(data);
    }
  } else {
    await db
      .update(matches)
      .set({ anonymityRequested: true })
      .where(eq(matches.id, matchId));
  }
}

export async function approveMatchAnonymity(matchId: number, isAnonymous: boolean) {
  if (isMockMode) {
    const data = readLocalDb();
    const idx = data.matches.findIndex((m: any) => m.id === matchId);
    if (idx !== -1) {
      data.matches[idx].isAnonymous = isAnonymous;
      data.matches[idx].anonymityRequested = false;
      writeLocalDb(data);
    }
  } else {
    await db
      .update(matches)
      .set({ isAnonymous, anonymityRequested: false })
      .where(eq(matches.id, matchId));
  }
}

export async function useSpecialPrivilege(userId: number) {
  if (isMockMode) {
    const data = readLocalDb();
    const idx = data.users.findIndex((u: any) => u.id === userId);
    if (idx !== -1) {
      data.users[idx].specialPrivilegeUsed = true;
      writeLocalDb(data);
    }
  } else {
    await db
      .update(users)
      .set({ specialPrivilegeUsed: true })
      .where(eq(users.id, userId));
  }
}

// Reset local db (deletes file to force rebuild from seed state)
export function forceLocalReset() {
  if (fs.existsSync(localDbPath)) {
    fs.unlinkSync(localDbPath);
  }
}
