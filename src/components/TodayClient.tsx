'use client';

import React, { useState, useEffect } from 'react';
import { submitPrediction } from '@/app/actions';
import { getTeamFlagUrl } from '@/lib/flags';
import { Check, Clock, ShieldAlert, Trophy, ChevronLeft, ChevronRight, ShieldCheck, HelpCircle, Star } from 'lucide-react';

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
  isAdmin: boolean;
}

interface TodayClientProps {
  initialMatches: Match[];
  predictions: Prediction[];
  users: User[];
  currentUserId: number;
  settings: {
    anonymousMode: boolean;
    exactScoreBonus: boolean;
  };
  serverTime: string;
}

export default function TodayClient({
  initialMatches,
  predictions,
  users,
  currentUserId,
  settings,
  serverTime,
}: TodayClientProps) {
  const currentUser = users.find(u => u.id === currentUserId);
  const isAdmin = currentUser?.username.endsWith('_admin') || false;

  const [timeOffset, setTimeOffset] = useState(0);

  useEffect(() => {
    const clientTime = Date.now();
    const serverTimeMs = new Date(serverTime).getTime();
    setTimeOffset(serverTimeMs - clientTime);
  }, [serverTime]);

  const getNow = () => new Date(Date.now() + timeOffset);

  const getLocalDateString = (isoStr: string) => {
    return new Date(isoStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const matchesByDate: Record<string, Match[]> = {};
  initialMatches.forEach((m) => {
    const dStr = getLocalDateString(m.kickoffAt);
    if (!matchesByDate[dStr]) {
      matchesByDate[dStr] = [];
    }
    matchesByDate[dStr].push(m);
  });

  const dates = Object.keys(matchesByDate).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const getInitialDate = () => {
    const todayStr = getLocalDateString(getNow().toISOString());
    if (matchesByDate[todayStr]) return todayStr;

    const nowMs = getNow().getTime();
    let closestDate = dates[0] || '';
    let minDiff = Infinity;

    dates.forEach((d) => {
      const diff = Math.abs(new Date(d).getTime() - nowMs);
      if (diff < minDiff) {
        minDiff = diff;
        closestDate = d;
      }
    });

    return closestDate;
  };

  const [selectedDate, setSelectedDate] = useState<string>('');
  useEffect(() => {
    setSelectedDate(getInitialDate());
  }, [initialMatches]);

  const [savingMap, setSavingMap] = useState<Record<number, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<number, string>>({});
  const [localPreds, setLocalPreds] = useState<Record<number, Prediction>>({});

  useEffect(() => {
    const map: Record<number, Prediction> = {};
    predictions.forEach((p) => {
      if (p.userId === currentUserId) {
        map[p.matchId] = p;
      }
    });
    setLocalPreds(map);
  }, [predictions, currentUserId]);

  if (!selectedDate) {
    return (
      <div className="flex-1 flex flex-col justify-center items-center py-12 text-slate-400">
        <Clock className="w-12 h-12 text-emerald-500 mb-3 animate-spin" />
        <p className="text-slate-800 dark:text-slate-200">Loading matches...</p>
      </div>
    );
  }

  const matchesForDate = matchesByDate[selectedDate] || [];

  const handlePickChange = async (matchId: number, pick: string) => {
    const match = initialMatches.find((m) => m.id === matchId);
    if (!match) return;

    const current = localPreds[matchId];

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

  const handleDateChange = (direction: 'prev' | 'next') => {
    const idx = dates.indexOf(selectedDate);
    if (direction === 'prev' && idx > 0) {
      setSelectedDate(dates[idx - 1]);
    } else if (direction === 'next' && idx < dates.length - 1) {
      setSelectedDate(dates[idx + 1]);
    }
  };

  const userMap = new Map(users.map((u) => [u.id, u.name]));

  return (
    <div className="flex-1 flex flex-col space-y-5">
      {/* ⚽ World Cup Hero Greeting Header Banner */}
      <div className="bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 p-5 rounded-2xl shadow-xl flex items-center justify-between border border-emerald-400/20 text-slate-950 relative overflow-hidden">
        {/* Subtle soccer texture effect overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_60%)] pointer-events-none"></div>
        <div className="space-y-1 relative z-10">
          <h2 className="text-xl font-black tracking-tight uppercase text-white drop-shadow-md">
            World Cup 2026
          </h2>
          <p className="text-xs font-bold text-emerald-100 uppercase tracking-wide">
            Private Prediction Pool
          </p>
        </div>
        <div className="p-3 bg-white/10 rounded-full border border-white/20 relative z-10 shadow-inner">
          <Trophy className="w-8 h-8 text-amber-300 drop-shadow-[0_2px_8px_rgba(251,191,36,0.5)] animate-bounce" />
        </div>
      </div>

      {/* Date Header Selector */}
      <div className="flex items-center justify-between bg-white/60 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800/80 backdrop-blur-md shadow-sm">
        <button
          onClick={() => handleDateChange('prev')}
          disabled={dates.indexOf(selectedDate) === 0}
          className="p-1.5 rounded-lg bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-slate-100 disabled:opacity-20 transition-all border border-slate-200 dark:border-slate-800 shadow-sm"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">
          {selectedDate}
        </span>
        <button
          onClick={() => handleDateChange('next')}
          disabled={dates.indexOf(selectedDate) === dates.length - 1}
          className="p-1.5 rounded-lg bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-slate-100 disabled:opacity-20 transition-all border border-slate-200 dark:border-slate-800 shadow-sm"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Matches List */}
      <div className="space-y-4">
        {matchesForDate.length === 0 ? (
          <div className="text-center py-10 bg-white/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-900 rounded-2xl text-slate-500 dark:text-slate-400 font-bold shadow-inner">
            No matches scheduled for this day.
          </div>
        ) : (
          matchesForDate.map((match) => {
            const isKnockout = match.stage !== 'group';
            const kickoffTime = new Date(match.kickoffAt);
            
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

            const matchPredictions = predictions.filter((p) => p.matchId === match.id);
            const userPick = localPreds[match.id]?.pick;

            const votedUserIds = matchPredictions.map((p) => p.userId);
            const votedUsers = users.filter((u) => votedUserIds.includes(u.id));
            const pendingUsers = users.filter((u) => !votedUserIds.includes(u.id));


            const homeFlag = getTeamFlagUrl(match.homeTeam);
            const awayFlag = getTeamFlagUrl(match.awayTeam);

            return (
              <div
                key={match.id}
                className="glass-card rounded-2xl overflow-hidden shadow-lg transition-all p-4.5 space-y-4 relative"
              >
                {/* Header: Match ID, Stage, Locked Badge */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/60 pb-2.5 text-xs">
                  <span className="font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest text-[10px]">
                    Match {match.id} • {isKnockout ? match.stage.toUpperCase() : `Group ${match.group}`}
                  </span>
                  <div className="flex items-center gap-1.5">

                    {isNotOpenYet ? (
                      <span className="text-[9px] bg-slate-100 text-slate-500 font-extrabold uppercase tracking-widest px-2 py-0.5 rounded border border-slate-250 shadow-sm">
                        Not Open
                      </span>
                    ) : isLocked ? (
                      <span className="text-[9px] bg-slate-200 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-extrabold uppercase tracking-widest px-2 py-0.5 rounded border border-slate-300 dark:border-slate-900 shadow-sm">
                        Locked
                      </span>
                    ) : (
                      <span className="text-[9px] bg-amber-500/10 text-amber-700 dark:text-amber-400 font-extrabold uppercase tracking-widest px-2 py-0.5 rounded border border-amber-500/20 shadow-sm animate-pulse">
                        Open
                      </span>
                    )}
                  </div>
                </div>

                {/* Match Kickoff & Venue */}
                <div className="text-center space-y-0.5">
                  <div className="text-xl font-black text-slate-800 dark:text-emerald-300 tracking-tight">
                    {kickoffTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">{match.venue}</div>
                </div>

                {/* Country Flags & Names */}
                <div className="flex items-center justify-between px-1 gap-2">
                  {/* Home Team */}
                  <div className="flex flex-col items-center flex-1 text-center space-y-2 w-5/12 min-w-0">
                    {homeFlag ? (
                      <img
                        src={homeFlag}
                        alt=""
                        className="w-12 h-7.5 object-cover rounded-lg shadow-md border border-slate-200 dark:border-slate-800"
                      />
                    ) : (
                      <div className="w-12 h-7.5 bg-slate-200 dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-bold">TBD</div>
                    )}
                    <div className="text-xs font-black text-slate-800 dark:text-slate-100 leading-tight truncate w-full">
                      {match.homeTeam}
                    </div>
                  </div>

                  {/* Score result */}
                  <div className="px-2 text-center w-2/12 shrink-0">
                    {match.finished ? (
                      <div className="flex items-center justify-center gap-1.5 bg-slate-100 dark:bg-slate-950 py-1.5 px-2.5 rounded-xl border border-slate-250 dark:border-slate-900 shadow-inner">
                        <span className="text-xl font-black text-slate-850 dark:text-slate-50">{match.homeScore}</span>
                        <span className="text-xs text-slate-400 font-bold">:</span>
                        <span className="text-xl font-black text-slate-850 dark:text-slate-50">{match.awayScore}</span>
                      </div>
                    ) : (
                      <span className="text-[9px] text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest px-2.5 py-1.5 bg-slate-100 dark:bg-slate-950 rounded-full border border-slate-250 dark:border-slate-900 shadow-sm">VS</span>
                    )}
                  </div>

                  {/* Away Team */}
                  <div className="flex flex-col items-center flex-1 text-center space-y-2 w-5/12 min-w-0">
                    {awayFlag ? (
                      <img
                        src={awayFlag}
                        alt=""
                        className="w-12 h-7.5 object-cover rounded-lg shadow-md border border-slate-200 dark:border-slate-800"
                      />
                    ) : (
                      <div className="w-12 h-7.5 bg-slate-200 dark:bg-slate-900 rounded-lg border border-slate-300 dark:border-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-bold">TBD</div>
                    )}
                    <div className="text-xs font-black text-slate-800 dark:text-slate-100 leading-tight truncate w-full">
                      {match.awayTeam}
                    </div>
                  </div>
                </div>

                {/* Voting Area */}
                {isNotOpenYet ? (
                  <div className="text-center py-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-slate-500 text-xs font-bold uppercase tracking-wider">
                    Voting opens 24h before match starts
                  </div>
                ) : !isLocked ? (
                  <div className="space-y-3 bg-slate-100 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-250 dark:border-slate-900">
                    <div className="text-[10px] text-slate-600 dark:text-emerald-400 font-extrabold uppercase tracking-widest mb-1 text-center flex items-center justify-center gap-1.5">
                      Your Prediction
                      {isPrivilegeGrace && (
                        <span className="text-amber-600 dark:text-amber-400 text-[8px] bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded font-black animate-pulse">
                          grace window active
                        </span>
                      )}
                      {savingMap[match.id] && <span className="text-emerald-500 dark:text-emerald-400 animate-pulse text-[8px] lowercase">(saving...)</span>}
                    </div>

                    {isKnockout ? (
                      /* Knockout buttons: showing team names */
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handlePickChange(match.id, 'home_advance')}
                          className={`py-2.5 px-2 text-xs font-bold rounded-xl transition-all border cursor-pointer truncate ${
                            userPick === 'home_advance'
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md'
                              : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm'
                          }`}
                        >
                          {match.homeTeam}
                        </button>
                        <button
                          onClick={() => handlePickChange(match.id, 'away_advance')}
                          className={`py-2.5 px-2 text-xs font-bold rounded-xl transition-all border cursor-pointer truncate ${
                            userPick === 'away_advance'
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md'
                              : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm'
                          }`}
                        >
                          {match.awayTeam}
                        </button>
                      </div>
                    ) : (
                      /* Group Stage buttons: Country A, Draw, Country B */
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => handlePickChange(match.id, 'home')}
                          className={`py-2.5 px-1 text-xs font-bold rounded-xl transition-all border cursor-pointer truncate ${
                            userPick === 'home'
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md'
                              : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm'
                          }`}
                        >
                          {match.homeTeam}
                        </button>
                        <button
                          onClick={() => handlePickChange(match.id, 'draw')}
                          className={`py-2.5 px-1 text-xs font-bold rounded-xl transition-all border cursor-pointer ${
                            userPick === 'draw'
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md'
                              : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm'
                          }`}
                        >
                          Draw
                        </button>
                        <button
                          onClick={() => handlePickChange(match.id, 'away')}
                          className={`py-2.5 px-1 text-xs font-bold rounded-xl transition-all border cursor-pointer truncate ${
                            userPick === 'away'
                              ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black shadow-md'
                              : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm'
                          }`}
                        >
                          {match.awayTeam}
                        </button>
                      </div>
                    )}

                    {errorMap[match.id] && (
                      <div className="text-[10px] text-rose-500 font-bold text-center mt-1">
                        {errorMap[match.id]}
                      </div>
                    )}

                  </div>
                ) : (
                  /* Locked picks breakdown with nicknames */
                  <div className="bg-slate-100 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-250 dark:border-slate-900 space-y-2">
                    <div className="text-[10px] text-slate-550 dark:text-slate-400 font-extrabold uppercase tracking-widest text-center border-b border-slate-250 dark:border-slate-900 pb-1.5">
                      Picks Breakdown
                    </div>

                    <div className="space-y-1">
                        {matchPredictions.length === 0 ? (
                          <div className="text-[11px] text-slate-500 text-center italic">No one voted on this match</div>
                        ) : (
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                            {matchPredictions.map((pred) => {
                              const userName = userMap.get(pred.userId) || `User ${pred.userId}`;
                              let pickLabel = '';
                              
                              if (isKnockout) {
                                pickLabel = pred.pick === 'home_advance' ? match.homeTeam : match.awayTeam;
                              } else {
                                pickLabel = pred.pick === 'home' ? match.homeTeam : pred.pick === 'away' ? match.awayTeam : 'Draw';
                              }

                              const isSelf = pred.userId === currentUserId;

                              let isCorrect = false;
                              if (match.finished) {
                                if (isKnockout) {
                                  isCorrect = (pred.pick === 'home_advance' ? 'home' : 'away') === match.winner;
                                } else {
                                  isCorrect = pred.pick === match.winner;
                                }
                              }

                              return (
                                <div
                                  key={pred.userId}
                                  className={`flex justify-between items-center py-0.5 ${
                                    isSelf ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-800 dark:text-slate-200'
                                  }`}
                                >
                                  <span className="truncate">{userName}</span>
                                  <span
                                    className={`font-black shrink-0 text-[10px] px-2 py-0.5 rounded border ${
                                      match.finished
                                        ? isCorrect
                                          ? 'bg-emerald-500/10 text-emerald-605 dark:text-emerald-400 border-emerald-500/20'
                                          : 'bg-rose-500/10 text-rose-605 dark:text-rose-400 border-rose-500/20'
                                        : 'bg-white dark:bg-slate-900 border-slate-250 dark:border-slate-800 shadow-sm'
                                    }`}
                                  >
                                    {pickLabel}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                  </div>
                )}

                {/* Vote indicators */}
                {!isLocked && (
                  <div className="bg-slate-200/30 dark:bg-slate-950/20 border border-slate-250 dark:border-slate-900/40 p-2.5 rounded-xl space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-wider">
                      <span>Friends Voted</span>
                      <span className="text-slate-800 dark:text-slate-300 font-black">
                        {votedUsers.length} / {users.filter(u => !u.isAdmin).length}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1 mt-1">
                      {votedUsers.map((u) => (
                        <span
                          key={u.id}
                          className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${
                            u.id === currentUserId
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                              : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-305 border-slate-250 dark:border-slate-800 shadow-sm'
                          }`}
                        >
                          {u.name}
                        </span>
                      ))}
                      {pendingUsers.filter(u => !u.isAdmin).map((u) => (
                        <span
                          key={u.id}
                          className="text-[9px] px-2 py-0.5 rounded-full border border-dashed border-slate-300 dark:border-slate-850 text-slate-450 dark:text-slate-600 bg-transparent animate-pulse font-medium"
                        >
                          {u.name} (pending)
                        </span>
                      ))}
                    </div>
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
