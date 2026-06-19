'use client';

import React, { useState, useEffect } from 'react';
import { submitPrediction } from '@/app/actions';
import { getTeamFlagUrl } from '@/lib/flags';
import { Clock, Search } from 'lucide-react';

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
}

interface Prediction {
  userId: number;
  matchId: number;
  pick: string;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
}

interface User {
  id: number;
  name: string;
  username: string;
  hasSpecialPrivilege: boolean;
  specialPrivilegeUsed: boolean;
}

interface FixturesClientProps {
  initialMatches: Match[];
  predictions: Prediction[];
  users: User[];
  currentUserId: number;
  settings: {
    exactScoreBonus: boolean;
  };
  serverTime: string;
}

export default function FixturesClient({
  initialMatches,
  predictions,
  users,
  currentUserId,
  settings,
  serverTime,
}: FixturesClientProps) {
  const currentUser = users.find(u => u.id === currentUserId);
  const [activeTab, setActiveTab] = useState<'group' | 'knockout'>('group');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [localPreds, setLocalPreds] = useState<Record<number, Prediction>>({});
  const [savingMap, setSavingMap] = useState<Record<number, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<number, string>>({});

  const [timeOffset, setTimeOffset] = useState(0);

  useEffect(() => {
    const clientTime = Date.now();
    const serverTimeMs = new Date(serverTime).getTime();
    setTimeOffset(serverTimeMs - clientTime);
  }, [serverTime]);

  const getNow = () => new Date(Date.now() + timeOffset);

  useEffect(() => {
    const map: Record<number, Prediction> = {};
    predictions.forEach((p) => {
      if (p.userId === currentUserId) {
        map[p.matchId] = p;
      }
    });
    setLocalPreds(map);
  }, [predictions, currentUserId]);

  const handlePickChange = async (matchId: number, pick: string) => {
    const match = initialMatches.find((m) => m.id === matchId);
    if (!match) return;

    const current = localPreds[matchId];

    // Check special privilege parameters
    const now = getNow();
    const kickoff = new Date(match.kickoffAt);
    
    // Voting opens 24 hours before kickoff
    const openTime = new Date(kickoff.getTime() - 24 * 60 * 60 * 1000);
    if (now < openTime) {
      alert('Voting is not open yet! It opens 24 hours before kickoff.');
      return;
    }
    let isPrivilegeWindow = false;

    if (
      match.stage === 'group' &&
      currentUser?.hasSpecialPrivilege &&
      !currentUser?.specialPrivilegeUsed
    ) {
      const limit = new Date(kickoff.getTime() + 30 * 60 * 1000);
      if (now >= kickoff && now < limit) {
        isPrivilegeWindow = true;
      }
    }

    let usePrivilege = false;
    if (isPrivilegeWindow) {
      const confirmUse = window.confirm(
        'Do you want to use your special privilege? Warning: you can only do it once.'
      );
      if (!confirmUse) return;
      usePrivilege = true;
    }

    const updated = {
      userId: currentUserId,
      matchId,
      pick,
      predictedHomeScore: null,
      predictedAwayScore: null,
    };
    setLocalPreds((prev) => ({ ...prev, [matchId]: updated }));
    setSavingMap((prev) => ({ ...prev, [matchId]: true }));
    setErrorMap((prev) => ({ ...prev, [matchId]: '' }));

    try {
      await submitPrediction(matchId, pick, null, null, usePrivilege);
      if (usePrivilege) {
        alert('Special privilege successfully consumed!');
        window.location.reload();
      }
    } catch (err: any) {
      setErrorMap((prev) => ({ ...prev, [matchId]: err.message || 'Failed to save prediction' }));
      if (current) {
        setLocalPreds((prev) => ({ ...prev, [matchId]: current }));
      } else {
        setLocalPreds((prev) => {
          const clone = { ...prev };
          delete clone[matchId];
          return clone;
        });
      }
    } finally {
      setSavingMap((prev) => ({ ...prev, [matchId]: false }));
    }
  };

  const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  const filteredMatches = initialMatches.filter((m) => {
    const isGroupMatch = m.stage === 'group';
    if (activeTab === 'group' && !isGroupMatch) return false;
    if (activeTab === 'knockout' && isGroupMatch) return false;

    if (activeTab === 'group' && selectedGroup !== 'ALL' && m.group !== selectedGroup) return false;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = `${m.homeTeam} ${m.awayTeam} ${m.venue} ${m.group || ''}`.toLowerCase();
      if (!matchName.includes(q)) return false;
    }

    return true;
  });

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'group': return 'Group Stage';
      case 'r32': return 'Round of 32';
      case 'r16': return 'Round of 16';
      case 'qf': return 'Quarter-finals';
      case 'sf': return 'Semi-finals';
      case 'third': return '3rd Place Playoff';
      case 'final': return 'Final';
      default: return stage.toUpperCase();
    }
  };

  return (
    <div className="flex-1 flex flex-col space-y-5">
      {/* Search and Navigation Tabs */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative rounded-xl shadow-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search teams, stadiums..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-9 pr-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 text-xs placeholder-slate-400 focus:border-emerald-500"
          />
        </div>

        {/* Tabs: Group vs Knockout */}
        <div className="flex bg-slate-200/50 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-300 dark:border-slate-800/80">
          <button
            onClick={() => {
              setActiveTab('group');
              setSelectedGroup('ALL');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'group'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-300 dark:border-slate-700/60 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Group Stage
          </button>
          <button
            onClick={() => {
              setActiveTab('knockout');
              setSelectedGroup('ALL');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'knockout'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-300 dark:border-slate-700/60 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Knockouts
          </button>
        </div>

        {/* Group stage filters */}
        {activeTab === 'group' && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedGroup('ALL')}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-lg border shrink-0 transition-all cursor-pointer ${
                selectedGroup === 'ALL'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                  : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-450 border-slate-300 dark:border-slate-800 hover:text-slate-700'
              }`}
            >
              All Groups
            </button>
            {groups.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGroup(g)}
                className={`w-8 h-7 flex items-center justify-center text-[11px] font-bold rounded-lg border shrink-0 transition-all cursor-pointer ${
                  selectedGroup === g
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-450 border-slate-300 dark:border-slate-800 hover:text-slate-700'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Matches */}
      <div className="space-y-3">
        {filteredMatches.length === 0 ? (
          <div className="text-center py-10 bg-slate-200/30 dark:bg-slate-900/40 border border-slate-300 dark:border-slate-900 rounded-2xl text-slate-500">
            No matches found matching criteria.
          </div>
        ) : (
          filteredMatches.map((match) => {
            const isMatchKnockout = match.stage !== 'group';
            const kickoffTime = new Date(match.kickoffAt);
            
            // Check privilege eligibility
            const now = getNow();
            let isPrivilegeGrace = false;
            if (
              match.stage === 'group' &&
              currentUser?.hasSpecialPrivilege &&
              !currentUser?.specialPrivilegeUsed
            ) {
              const limit = new Date(kickoffTime.getTime() + 30 * 60 * 1000);
              if (now >= kickoffTime && now < limit) {
                isPrivilegeGrace = true;
              }
            }

            const isNotOpenYet = now.getTime() < kickoffTime.getTime() - 24 * 60 * 60 * 1000;
            const isLocked = (now >= kickoffTime && !isPrivilegeGrace) || match.isLockedManually;
            const userPick = localPreds[match.id]?.pick;

            const homeFlag = getTeamFlagUrl(match.homeTeam);
            const awayFlag = getTeamFlagUrl(match.awayTeam);

            return (
              <div
                key={match.id}
                className="glass-card rounded-xl border p-3.5 space-y-3 shadow-md"
              >
                {/* Header */}
                <div className="flex items-center justify-between text-[10px] text-slate-550 dark:text-slate-500 border-b border-slate-300 dark:border-slate-800/40 pb-1.5">
                  <span className="font-bold text-emerald-600 dark:text-emerald-500 tracking-wider uppercase flex items-center gap-1">
                    Match {match.id} • {isMatchKnockout ? getStageLabel(match.stage) : `Group ${match.group}`}
                  </span>
                  <span>
                    {kickoffTime.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} @{' '}
                    {kickoffTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
                  </span>
                </div>

                {/* Flags and Teams */}
                <div className="flex items-center justify-between px-1">
                  <div className="w-5/12 text-left font-bold text-slate-800 dark:text-slate-200 text-xs truncate flex items-center gap-1.5">
                    {homeFlag && (
                      <img src={homeFlag} alt="" className="w-5 h-3 object-cover rounded shadow-sm shrink-0" />
                    )}
                    <span className="truncate">{match.homeTeam}</span>
                  </div>
                  <div className="w-2/12 text-center text-[10px] font-bold text-slate-500">
                    {match.finished ? (
                      <span className="bg-slate-200 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-900 text-slate-800 dark:text-slate-200 font-extrabold text-xs">
                        {match.homeScore} - {match.awayScore}
                      </span>
                    ) : (
                      <span className="bg-slate-200 dark:bg-slate-950 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-900 text-[9px] uppercase tracking-wider">VS</span>
                    )}
                  </div>
                  <div className="w-5/12 text-right font-bold text-slate-800 dark:text-slate-200 text-xs truncate flex items-center justify-end gap-1.5">
                    <span className="truncate">{match.awayTeam}</span>
                    {awayFlag && (
                      <img src={awayFlag} alt="" className="w-5 h-3 object-cover rounded shadow-sm shrink-0" />
                    )}
                  </div>
                </div>

                {/* Vote layout (Country Names on buttons) */}
                {isNotOpenYet ? (
                  <div className="text-center py-2 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    Voting opens 24h before match starts
                  </div>
                ) : !isLocked ? (
                  <div className="space-y-2.5 pt-1">
                    {isMatchKnockout ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handlePickChange(match.id, 'home_advance')}
                          className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border transition-all cursor-pointer truncate ${
                            userPick === 'home_advance'
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-sm'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-850'
                          }`}
                        >
                          {match.homeTeam}
                        </button>
                        <button
                          onClick={() => handlePickChange(match.id, 'away_advance')}
                          className={`py-1.5 px-2 text-[10px] font-bold rounded-lg border transition-all cursor-pointer truncate ${
                            userPick === 'away_advance'
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-sm'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-850'
                          }`}
                        >
                          {match.awayTeam}
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick={() => handlePickChange(match.id, 'home')}
                          className={`py-1.5 px-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer truncate ${
                            userPick === 'home'
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-sm'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-850'
                          }`}
                        >
                          {match.homeTeam}
                        </button>
                        <button
                          onClick={() => handlePickChange(match.id, 'draw')}
                          className={`py-1.5 px-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                            userPick === 'draw'
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-sm'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-850'
                          }`}
                        >
                          Draw
                        </button>
                        <button
                          onClick={() => handlePickChange(match.id, 'away')}
                          className={`py-1.5 px-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer truncate ${
                            userPick === 'away'
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-extrabold shadow-sm'
                              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-850'
                          }`}
                        >
                          {match.awayTeam}
                        </button>
                      </div>
                    )}



                    {errorMap[match.id] && (
                      <div className="text-[10px] text-rose-500 text-center font-medium mt-0.5">
                        {errorMap[match.id]}
                      </div>
                    )}
                  </div>
                ) : (
                  /* Locked picks summary */
                  <div className="flex justify-between items-center text-[10px] text-slate-500 bg-slate-200/20 dark:bg-slate-950/20 p-2 rounded-lg border border-slate-300 dark:border-slate-900/50">
                    <span className="italic">
                      {match.finished ? 'Match Completed' : 'Match Locked'}
                    </span>
                    <span className="font-semibold text-slate-500 dark:text-slate-400">
                      Your Pick:{' '}
                      <span className="text-emerald-600 dark:text-emerald-450 uppercase font-black">
                        {userPick
                          ? isMatchKnockout
                            ? userPick === 'home_advance'
                              ? match.homeTeam
                              : match.awayTeam
                            : userPick === 'home'
                            ? match.homeTeam
                            : userPick === 'away'
                            ? match.awayTeam
                            : 'Draw'
                          : 'None'}

                      </span>
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
