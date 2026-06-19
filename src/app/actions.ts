'use server';

import { auth } from '@/lib/auth';
import {
  getUserById,
  getAllUsers,
  getAllMatches,
  getAllPredictions,
  getSettingsMap,
  savePrediction,
  updateUserPassword,
  updatePoolSettings,
  updateMatchResult,
  updateMatchTeams,
  updateMatchLock,
  requestMatchAnonymity,
  approveMatchAnonymity,
  useSpecialPrivilege,
} from '@/lib/dbQueries';
import * as bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { SCORING_CONFIG } from '@/lib/config';

// Helper to check if a user is admin
async function requireAdmin() {
  const session = await auth();
  if (!session || !session.user || !(session.user as any).isAdmin) {
    throw new Error('Unauthorized. Admin privileges required.');
  }
  return session;
}

// Helper to check if a user is logged in
async function requireUser() {
  const session = await auth();
  if (!session || !session.user || !(session.user as any).id) {
    throw new Error('Unauthorized. Please log in.');
  }
  return session;
}

// Fetch all settings
export async function getSystemSettings() {
  return getSettingsMap();
}

// Submit a prediction (safely locked based on kickoff and manual lock, with special privilege check)
export async function submitPrediction(
  matchId: number,
  pick: string,
  predictedHomeScore?: number | null,
  predictedAwayScore?: number | null,
  usePrivilege: boolean = false
) {
  const session = await requireUser();
  const userId = parseInt((session.user as any).id, 10);

  // Fetch user to check privilege status
  const user = await getUserById(userId);
  if (!user) {
    throw new Error('User not found.');
  }

  // Fetch all matches to find this match
  const allMatches = await getAllMatches();
  const match = allMatches.find((m) => m.id === matchId);
  if (!match) {
    throw new Error('Match not found.');
  }

  const now = new Date();
  const kickoff = new Date(match.kickoffAt);

  // Enforce lock rules
  let isMatchActiveForPrivilege = false;
  if (match.stage === 'group' && user.hasSpecialPrivilege && !user.specialPrivilegeUsed) {
    // Group stage matches can be edited up to 30 minutes after kickoff using privilege
    const limit = new Date(kickoff.getTime() + 30 * 60 * 1000);
    if (now >= kickoff && now < limit) {
      isMatchActiveForPrivilege = true;
    }
  }

  // Voting opens 24 hours before kickoff
  const openTime = new Date(kickoff.getTime() - 24 * 60 * 60 * 1000);
  if (now < openTime) {
    throw new Error('Voting is not open yet. It opens 24 hours before kickoff.');
  }

  if (now >= kickoff && !isMatchActiveForPrivilege) {
    throw new Error('Match has already kicked off and is locked.');
  }
  if (match.isLockedManually) {
    throw new Error('Match has been locked manually by the admin.');
  }

  // If using special privilege
  if (isMatchActiveForPrivilege) {
    if (!usePrivilege) {
      throw new Error('CONFIRM_PRIVILEGE_REQUIRED');
    }
    // Consume the privilege in DB
    await useSpecialPrivilege(userId);
  }

  // Validate pick format
  const isKnockout = match.stage !== 'group';
  const validPicks = isKnockout ? ['home_advance', 'away_advance'] : ['home', 'draw', 'away'];
  if (!validPicks.includes(pick)) {
    throw new Error('Invalid pick for this match stage.');
  }

  // Clean scores
  const scoreHome = predictedHomeScore !== undefined ? predictedHomeScore : null;
  const scoreAway = predictedAwayScore !== undefined ? predictedAwayScore : null;

  // Save prediction
  await savePrediction(userId, matchId, pick, scoreHome, scoreAway);

  revalidatePath('/today');
  revalidatePath('/fixtures');
  revalidatePath('/standings');
  return { success: true };
}

// Non-admin requests anonymity for a match
export async function requestAnonymityForMatch(matchId: number) {
  await requireUser();
  await requestMatchAnonymity(matchId);
  revalidatePath('/today');
  revalidatePath('/fixtures');
  revalidatePath('/admin');
  return { success: true };
}

// Admin approves/rejects anonymity for a match
export async function adminApproveAnonymity(matchId: number, isAnonymous: boolean) {
  await requireAdmin();
  await approveMatchAnonymity(matchId, isAnonymous);
  revalidatePath('/today');
  revalidatePath('/fixtures');
  revalidatePath('/standings');
  revalidatePath('/admin');
  return { success: true };
}

// Change user password
export async function changeUserPassword(currentPass: string, newPass: string) {
  const session = await requireUser();
  const userId = parseInt((session.user as any).id, 10);

  if (newPass.length < 6) {
    throw new Error('New password must be at least 6 characters.');
  }

  const user = await getUserById(userId);
  if (!user || !user.password) {
    throw new Error('User not found.');
  }

  const isCorrect = await bcrypt.compare(currentPass, user.password);
  if (!isCorrect) {
    throw new Error('Incorrect current password.');
  }

  const hashed = await bcrypt.hash(newPass, 10);
  await updateUserPassword(userId, hashed);

  return { success: true };
}

// ADMIN: Toggle system settings
export async function adminUpdateSettings(anonymousMode: boolean, exactScoreBonus: boolean) {
  await requireAdmin();
  await updatePoolSettings(anonymousMode, exactScoreBonus);

  revalidatePath('/today');
  revalidatePath('/fixtures');
  revalidatePath('/standings');
  revalidatePath('/admin');
  return { success: true };
}

// ADMIN: Save match result
export async function adminSaveMatchResult(
  matchId: number,
  homeScore: number,
  awayScore: number,
  winner: 'home' | 'draw' | 'away',
  finished: boolean
) {
  await requireAdmin();

  const allMatches = await getAllMatches();
  const match = allMatches.find((m) => m.id === matchId);
  if (!match) {
    throw new Error('Match not found.');
  }

  // Knockout stage cannot end in a draw
  if (match.stage !== 'group' && winner === 'draw') {
    throw new Error('Knockout matches must have a winner (home or away).');
  }

  await updateMatchResult(matchId, homeScore, awayScore, winner, finished);

  revalidatePath('/today');
  revalidatePath('/fixtures');
  revalidatePath('/standings');
  return { success: true };
}

// ADMIN: Update teams for a knockout match (e.g. when determined)
export async function adminUpdateKnockoutTeams(
  matchId: number,
  homeTeam: string,
  awayTeam: string
) {
  await requireAdmin();

  const allMatches = await getAllMatches();
  const match = allMatches.find((m) => m.id === matchId);
  if (!match) {
    throw new Error('Match not found.');
  }

  await updateMatchTeams(matchId, homeTeam, awayTeam);

  revalidatePath('/today');
  revalidatePath('/fixtures');
  revalidatePath('/standings');
  return { success: true };
}

// ADMIN: Toggle match manual lock
export async function adminToggleMatchLock(matchId: number, isLocked: boolean) {
  await requireAdmin();
  await updateMatchLock(matchId, isLocked);

  revalidatePath('/today');
  revalidatePath('/fixtures');
  revalidatePath('/admin');
  return { success: true };
}

// ADMIN: Reset a user's password
export async function adminResetUserPassword(userId: number, newPass: string) {
  await requireAdmin();

  if (newPass.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const hashed = await bcrypt.hash(newPass, 10);
  await updateUserPassword(userId, hashed);

  return { success: true };
}

// Standings calculation helper (called on standings page)
export async function getStandings() {
  const allUsers = await getAllUsers();
  const allMatches = await getAllMatches();
  const allPredictions = await getAllPredictions();
  const { exactScoreBonus } = await getSystemSettings();

  const matchMap = new Map(allMatches.map((m) => [m.id, m]));

  const standings = allUsers
    .filter((u) => !u.isAdmin) // Filter out Swarnesh (Admin) so only players are on the leaderboard
    .map((u) => {
      const userPreds = allPredictions.filter((p) => p.userId === u.id);
      let totalPoints = 0;
      let correctPicksCount = 0;
      let sumVoteTimestamps = 0;
      const formTrail: { matchId: number; date: Date; correct: boolean }[] = [];

      userPreds.forEach((p) => {
        const match = matchMap.get(p.matchId);
        if (!match || !match.finished) return;

        const isKnockout = match.stage !== 'group';
        let outcomeCorrect = false;

        if (isKnockout) {
          const predictedWinner = p.pick === 'home_advance' ? 'home' : 'away';
          if (predictedWinner === match.winner) {
            outcomeCorrect = true;
          }
        } else {
          if (p.pick === match.winner) {
            outcomeCorrect = true;
          }
        }

        if (outcomeCorrect) {
          correctPicksCount++;
          totalPoints += 1;
        }

        sumVoteTimestamps += new Date(p.updatedAt).getTime();

        formTrail.push({
          matchId: match.id,
          date: new Date(match.kickoffAt),
          correct: outcomeCorrect,
        });
      });

      formTrail.sort((a, b) => b.date.getTime() - a.date.getTime());
      const last5Form = formTrail.slice(0, 5).map((f) => f.correct);

      return {
        userId: u.id,
        name: u.name,
        username: u.username,
        isAdmin: u.isAdmin,
        totalPoints,
        correctPicksCount,
        sumVoteTimestamps,
        formTrail: last5Form,
      };
    });

  standings.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    return a.name.localeCompare(b.name);
  });

  return standings;
}
