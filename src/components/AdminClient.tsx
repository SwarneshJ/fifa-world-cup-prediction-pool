'use client';

import React, { useState } from 'react';
import {
  adminUpdateSettings,
  adminSaveMatchResult,
  adminUpdateKnockoutTeams,
  adminToggleMatchLock,
  adminResetUserPassword,
  adminApproveAnonymity,
} from '@/app/actions';
import { getTeamFlagUrl } from '@/lib/flags';
import { Settings, Users, Calendar, CheckCircle2, AlertCircle, Edit3, Lock, Unlock, EyeOff, ShieldAlert } from 'lucide-react';

interface Match {
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

interface User {
  id: number;
  name: string;
  username: string;
  isAdmin: boolean;
}

interface AdminClientProps {
  initialMatches: Match[];
  users: User[];
  currentUserId: number;
  settings: {
    anonymousMode: boolean;
    exactScoreBonus: boolean;
  };
}

export default function AdminClient({
  initialMatches,
  users,
  currentUserId,
  settings,
}: AdminClientProps) {
  const [anonymousMode, setAnonymousMode] = useState(settings.anonymousMode);
  const [exactScoreBonus, setExactScoreBonus] = useState(settings.exactScoreBonus);
  const [settingsSuccess, setSettingsSuccess] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const [targetUserId, setTargetUserId] = useState<string>('');
  const [newPassword, setNewPassword] = useState('');
  const [userSuccess, setUserSuccess] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [userLoading, setUserLoading] = useState(false);

  const [selectedMatchId, setSelectedMatchId] = useState<number | ''>('');
  const [matchEditHomeTeam, setMatchEditHomeTeam] = useState('');
  const [matchEditAwayTeam, setMatchEditAwayTeam] = useState('');
  const [matchEditHomeScore, setMatchEditHomeScore] = useState('');
  const [matchEditAwayScore, setMatchEditAwayScore] = useState('');
  const [matchEditWinner, setMatchEditWinner] = useState<'home' | 'draw' | 'away'>('draw');
  const [matchEditFinished, setMatchEditFinished] = useState(false);
  const [matchEditIsAnonymous, setMatchEditIsAnonymous] = useState(false);
  const [matchSuccess, setMatchSuccess] = useState<string | null>(null);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [matchLoading, setMatchLoading] = useState(false);

  const [matchesFilter, setMatchesFilter] = useState<'all' | 'unfinished' | 'finished'>('unfinished');

  const handleSaveSettings = async () => {
    setSettingsLoading(true);
    setSettingsSuccess(false);
    try {
      await adminUpdateSettings(anonymousMode, exactScoreBonus);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err) {
      alert('Failed to update settings');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);
    setUserSuccess(null);

    if (!targetUserId || !newPassword) {
      setUserError('Please select a user and enter a password.');
      return;
    }

    if (newPassword.length < 6) {
      setUserError('Password must be at least 6 characters.');
      return;
    }

    setUserLoading(true);
    try {
      await adminResetUserPassword(parseInt(targetUserId, 10), newPassword);
      const targetUser = users.find((u) => u.id === parseInt(targetUserId, 10));
      setUserSuccess(`Password for ${targetUser?.name || 'user'} reset successfully!`);
      setNewPassword('');
    } catch (err: any) {
      setUserError(err.message || 'Failed to reset password.');
    } finally {
      setUserLoading(false);
    }
  };

  const handleMatchSelectChange = (matchIdVal: string) => {
    if (matchIdVal === '') {
      setSelectedMatchId('');
      return;
    }

    const matchId = parseInt(matchIdVal, 10);
    setSelectedMatchId(matchId);
    setMatchError(null);
    setMatchSuccess(null);

    const m = initialMatches.find((x) => x.id === matchId);
    if (m) {
      setMatchEditHomeTeam(m.homeTeam);
      setMatchEditAwayTeam(m.awayTeam);
      setMatchEditHomeScore(m.homeScore !== null ? String(m.homeScore) : '');
      setMatchEditAwayScore(m.awayScore !== null ? String(m.awayScore) : '');
      setMatchEditWinner((m.winner as any) || (m.stage !== 'group' ? 'home' : 'draw'));
      setMatchEditFinished(m.finished);
      setMatchEditIsAnonymous(m.isAnonymous);
    }
  };

  const handleSaveMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setMatchError(null);
    setMatchSuccess(null);

    if (selectedMatchId === '') return;

    const match = initialMatches.find((x) => x.id === selectedMatchId);
    if (!match) return;

    setMatchLoading(true);
    try {
      // 1. Update teams if knockout
      if (match.stage !== 'group') {
        await adminUpdateKnockoutTeams(match.id, matchEditHomeTeam, matchEditAwayTeam);
      }

      // 2. Update match anonymity
      await adminApproveAnonymity(match.id, matchEditIsAnonymous);

      // 3. Save scores / finished / winner
      if (matchEditFinished) {
        if (matchEditHomeScore === '' || matchEditAwayScore === '') {
          throw new Error('Please enter home and away scores to mark match as finished.');
        }

        const hScore = parseInt(matchEditHomeScore, 10);
        const aScore = parseInt(matchEditAwayScore, 10);

        if (match.stage === 'group') {
          let calculatedWinner: 'home' | 'draw' | 'away' = 'draw';
          if (hScore > aScore) calculatedWinner = 'home';
          if (aScore > hScore) calculatedWinner = 'away';

          if (calculatedWinner !== matchEditWinner) {
            throw new Error(
              `Group stage winner must match score result (${hScore}-${aScore} implies ${calculatedWinner.toUpperCase()}).`
            );
          }
        }

        await adminSaveMatchResult(match.id, hScore, aScore, matchEditWinner, true);
      } else {
        const hScore = matchEditHomeScore !== '' ? parseInt(matchEditHomeScore, 10) : 0;
        const aScore = matchEditAwayScore !== '' ? parseInt(matchEditAwayScore, 10) : 0;
        await adminSaveMatchResult(match.id, hScore, aScore, matchEditWinner, false);
      }

      setMatchSuccess(`Match ${match.id} saved successfully!`);
    } catch (err: any) {
      setMatchError(err.message || 'Failed to save match updates.');
    } finally {
      setMatchLoading(false);
    }
  };

  const handleToggleManualLock = async (matchId: number, isLocked: boolean) => {
    try {
      await adminToggleMatchLock(matchId, isLocked);
      setMatchSuccess(`Match ${matchId} ${isLocked ? 'locked' : 'unlocked'} manually!`);
      const updatedMatch = initialMatches.find((m) => m.id === matchId);
      if (updatedMatch) {
        updatedMatch.isLockedManually = isLocked;
      }
    } catch (err: any) {
      alert(err.message || 'Failed to toggle lock.');
    }
  };

  const handleApproveAnonymityRequest = async (matchId: number, approve: boolean) => {
    try {
      await adminApproveAnonymity(matchId, approve);
      alert(approve ? 'Match anonymity approved.' : 'Anonymity request rejected.');
      window.location.reload();
    } catch (err: any) {
      alert('Moderation failed.');
    }
  };

  const filteredMatches = initialMatches.filter((m) => {
    if (matchesFilter === 'unfinished') return !m.finished;
    if (matchesFilter === 'finished') return m.finished;
    return true;
  });

  const selectedMatch = initialMatches.find((x) => x.id === selectedMatchId);

  // Find matches that have requested anonymity
  const anonymityRequests = initialMatches.filter((m) => m.anonymityRequested);

  return (
    <div className="space-y-6">
      {/* 0. Moderation Panel: Anonymity Requests */}
      {anonymityRequests.length > 0 && (
        <div className="glass-card rounded-2xl border border-indigo-500/30 p-5 bg-indigo-500/5 shadow-lg">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-3 flex items-center gap-1.5 border-b border-slate-300 dark:border-slate-800 pb-2 flex-wrap">
            <EyeOff className="w-4 h-4 text-indigo-500 animate-pulse" /> Pending Anonymity Requests ({anonymityRequests.length})
          </h2>
          <div className="space-y-3">
            {anonymityRequests.map((req) => (
              <div key={req.id} className="flex justify-between items-center bg-slate-200/50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-300 dark:border-slate-900">
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase">
                    Match {req.id} ({req.stage})
                  </span>
                  <span className="text-[10px] text-slate-500 truncate mt-0.5">
                    {req.homeTeam} vs {req.awayTeam}
                  </span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleApproveAnonymityRequest(req.id, true)}
                    className="py-1 px-2.5 bg-emerald-500 text-slate-950 text-[10px] font-extrabold rounded-lg hover:bg-emerald-400 cursor-pointer"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleApproveAnonymityRequest(req.id, false)}
                    className="py-1 px-2.5 bg-slate-300 dark:bg-slate-900 text-slate-700 dark:text-slate-400 hover:bg-slate-400 dark:hover:bg-slate-800 text-[10px] font-extrabold rounded-lg cursor-pointer border border-slate-400 dark:border-slate-800"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 1. Global Settings */}
      <div className="glass-card rounded-2xl border p-5 shadow-xl">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-slate-350 dark:border-slate-850 pb-2.5">
          <Settings className="w-4 h-4 text-emerald-500" /> Global Pool Settings
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col pr-4">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Anonymous Mode (Global)
              </span>
              <span className="text-[10px] text-slate-500 leading-normal mt-0.5">
                Hide individual predictions for *all* matches post-kickoff.
              </span>
            </div>
            <input
              type="checkbox"
              checked={anonymousMode}
              onChange={(e) => setAnonymousMode(e.target.checked)}
              className="w-10 h-6 shrink-0 accent-emerald-500 cursor-pointer bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded"
            />
          </div>



          {settingsSuccess && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Settings updated successfully!</span>
            </div>
          )}

          <button
            onClick={handleSaveSettings}
            disabled={settingsLoading}
            className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-xs font-bold text-slate-950 bg-emerald-450 hover:bg-emerald-400 transition-all cursor-pointer disabled:opacity-50"
          >
            {settingsLoading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* 2. Match Results Management */}
      <div className="glass-card rounded-2xl border p-5 shadow-xl">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-slate-350 dark:border-slate-850 pb-2.5">
          <Calendar className="w-4 h-4 text-emerald-500" /> Enter Match Results & Moderation
        </h2>

        {/* Filter matches */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => {
              setMatchesFilter('unfinished');
              setSelectedMatchId('');
            }}
            className={`flex-1 py-1 px-2 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
              matchesFilter === 'unfinished'
                ? 'bg-slate-200 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border-slate-300 dark:border-slate-700/60 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-450 dark:text-slate-500 border-slate-200 dark:border-slate-900'
            }`}
          >
            Unfinished
          </button>
          <button
            onClick={() => {
              setMatchesFilter('finished');
              setSelectedMatchId('');
            }}
            className={`flex-1 py-1 px-2 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
              matchesFilter === 'finished'
                ? 'bg-slate-200 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border-slate-300 dark:border-slate-700/60 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-450 dark:text-slate-500 border-slate-200 dark:border-slate-900'
            }`}
          >
            Finished
          </button>
          <button
            onClick={() => {
              setMatchesFilter('all');
              setSelectedMatchId('');
            }}
            className={`flex-1 py-1 px-2 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
              matchesFilter === 'all'
                ? 'bg-slate-200 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border-slate-300 dark:border-slate-700/60 shadow-sm'
                : 'bg-white dark:bg-slate-900 text-slate-450 dark:text-slate-500 border-slate-200 dark:border-slate-900'
            }`}
          >
            All
          </button>
        </div>

        {/* Dropdown */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-550 dark:text-slate-350 uppercase tracking-wider">
              Select Match
            </label>
            <select
              value={selectedMatchId}
              onChange={(e) => handleMatchSelectChange(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-850 rounded-xl text-slate-800 dark:text-slate-100 text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="">-- Choose a Match --</option>
              {filteredMatches.map((m) => (
                <option key={m.id} value={m.id}>
                  M{m.id} ({m.stage === 'group' ? `Grp ${m.group}` : m.stage.toUpperCase()}) :{' '}
                  {m.homeTeam} vs {m.awayTeam} {m.finished ? `(${m.homeScore}-${m.awayScore})` : ''}
                </option>
              ))}
            </select>
          </div>

          {selectedMatchId !== '' && selectedMatch && (
            <form onSubmit={handleSaveMatch} className="space-y-4 pt-2 border-t border-slate-300 dark:border-slate-900">
              {matchError && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-450 border border-rose-500/20 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{matchError}</span>
                </div>
              )}

              {matchSuccess && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{matchSuccess}</span>
                </div>
              )}

              {/* Manual Lock */}
              <div className="flex justify-between items-center bg-slate-200/50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-300 dark:border-slate-900 flex-wrap gap-2">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Manual Lock override
                </span>
                {selectedMatch.isLockedManually ? (
                  <button
                    type="button"
                    onClick={() => handleToggleManualLock(selectedMatch.id, false)}
                    className="flex items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-bold border bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20 cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5" /> Unlock Match
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleToggleManualLock(selectedMatch.id, true)}
                    className="flex items-center gap-1 py-1 px-2.5 rounded-lg text-[10px] font-bold border bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5" /> Lock Match
                  </button>
                )}
              </div>

              {/* Edit teams if knockout */}
              {selectedMatch.stage !== 'group' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-200/50 dark:bg-slate-950/40 border border-slate-300 dark:border-slate-900 rounded-xl">
                  <div className="col-span-2 text-[10px] text-emerald-600 dark:text-emerald-450 font-bold uppercase tracking-wider mb-1">
                    🏆 Set Qualified Teams (Knockout)
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      Home Team Label
                    </label>
                    <input
                      type="text"
                      required
                      value={matchEditHomeTeam}
                      onChange={(e) => setMatchEditHomeTeam(e.target.value)}
                      className="mt-1 block w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-850 rounded-lg text-slate-800 dark:text-slate-100 text-xs"
                      placeholder="e.g. Mexico"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase">
                      Away Team Label
                    </label>
                    <input
                      type="text"
                      required
                      value={matchEditAwayTeam}
                      onChange={(e) => setMatchEditAwayTeam(e.target.value)}
                      className="mt-1 block w-full px-2.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-850 rounded-lg text-slate-800 dark:text-slate-100 text-xs"
                      placeholder="e.g. South Africa"
                    />
                  </div>
                </div>
              )}

              {/* Match-level Anonymity Toggle */}
              <div className="flex items-center justify-between bg-slate-200/50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-300 dark:border-slate-900">
                <div className="flex flex-col pr-4">
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1">
                    Match Anonymity
                  </span>
                  <span className="text-[9px] text-slate-550 dark:text-slate-500 leading-none mt-1">
                    If checked, individual picks remain hidden after kickoff.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={matchEditIsAnonymous}
                  onChange={(e) => setMatchEditIsAnonymous(e.target.checked)}
                  className="w-10 h-6 shrink-0 accent-emerald-500 cursor-pointer bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded"
                />
              </div>

              {/* Enter Score and Winner */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1 justify-center">
                      {getTeamFlagUrl(matchEditHomeTeam) && (
                        <img src={getTeamFlagUrl(matchEditHomeTeam)!} alt="" className="w-5 h-3 object-cover rounded" />
                      )}
                      {matchEditHomeTeam || 'Home'} Score
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={matchEditHomeScore}
                      onChange={(e) => setMatchEditHomeScore(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-850 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-bold text-center"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1 justify-center">
                      {getTeamFlagUrl(matchEditAwayTeam) && (
                        <img src={getTeamFlagUrl(matchEditAwayTeam)!} alt="" className="w-5 h-3 object-cover rounded" />
                      )}
                      {matchEditAwayTeam || 'Away'} Score
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={matchEditAwayScore}
                      onChange={(e) => setMatchEditAwayScore(e.target.value)}
                      className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-850 rounded-xl text-slate-800 dark:text-slate-100 text-sm font-bold text-center"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-550 dark:text-slate-350 uppercase tracking-wider mb-1.5">
                    Winner (Outcome for Points)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setMatchEditWinner('home')}
                      className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all cursor-pointer truncate ${
                        matchEditWinner === 'home'
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                          : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-800'
                      }`}
                    >
                      {matchEditHomeTeam || 'Home'}
                    </button>

                    {selectedMatch.stage === 'group' ? (
                      <button
                        type="button"
                        onClick={() => setMatchEditWinner('draw')}
                        className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                          matchEditWinner === 'draw'
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                            : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-800'
                        }`}
                      >
                        Draw
                      </button>
                    ) : (
                      <div className="bg-slate-200/50 dark:bg-slate-950 border border-dashed border-slate-300 dark:border-slate-900 rounded-lg flex items-center justify-center text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase">
                        No Draw
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setMatchEditWinner('away')}
                      className={`py-2 px-1 text-xs font-bold rounded-lg border transition-all cursor-pointer truncate ${
                        matchEditWinner === 'away'
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                          : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-800'
                      }`}
                    >
                      {matchEditAwayTeam || 'Away'}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-300 dark:border-slate-900 pt-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      Match Finished
                    </span>
                    <span className="text-[9px] text-slate-550 dark:text-slate-500 leading-none mt-1">
                      Check to lock picks permanently, calculate standings, and award points.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={matchEditFinished}
                    onChange={(e) => setMatchEditFinished(e.target.checked)}
                    className="w-10 h-6 shrink-0 accent-emerald-400 cursor-pointer bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={matchLoading}
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-sm text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-350 transition-all cursor-pointer disabled:opacity-50"
              >
                {matchLoading ? 'Saving...' : 'Save Match Results'}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* 3. Friend Password Resets */}
      <div className="glass-card rounded-2xl border p-5 shadow-xl">
        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-4 flex items-center gap-1.5 border-b border-slate-350 dark:border-slate-850 pb-2.5">
          <Users className="w-4 h-4 text-emerald-500" /> Reset Friend Password
        </h2>

        <form onSubmit={handleResetPassword} className="space-y-4">
          {userError && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-450 border border-rose-500/20 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{userError}</span>
            </div>
          )}

          {userSuccess && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{userSuccess}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-550 dark:text-slate-350 uppercase tracking-wider">
              Friend / Account
            </label>
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-850 rounded-xl text-slate-800 dark:text-slate-100 text-xs focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="">-- Choose Account --</option>
              {users
                .filter((u) => u.id !== currentUserId)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} (@{u.username})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-550 dark:text-slate-355 uppercase tracking-wider">
              New Password
            </label>
            <input
              type="text"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 text-xs placeholder-slate-400"
              placeholder="e.g. tempPass126"
              disabled={userLoading}
            />
          </div>

          <button
            type="submit"
            disabled={userLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-xl shadow-sm text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-355 transition-all cursor-pointer disabled:opacity-50"
          >
            {userLoading ? 'Resetting...' : 'Reset Friend Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
