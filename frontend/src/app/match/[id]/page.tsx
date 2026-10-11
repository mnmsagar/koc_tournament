'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Chess } from 'chess.js';
import { useAuth } from '../../../context/AuthContext';
import { getSocket } from '../../../lib/socket';
import { apiRequest } from '../../../lib/api';
import { ChessBoardComponent } from '../../../components/ChessBoardComponent';
import { Match } from '../../../types';
import {
  Timer,
  Flag,
  Trophy,
  ArrowLeft,
  Swords,
  Crown,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';

function MatchPageContent() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useAuth();

  const [matchData, setMatchData] = useState<Match | null>(null);
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [turn, setTurn] = useState<'w' | 'b'>('w');
  const [side, setSide] = useState<'w' | 'b'>('w');
  const [whiteClock, setWhiteClock] = useState(300);
  const [blackClock, setBlackClock] = useState(300);
  const [status, setStatus] = useState<'waiting' | 'active' | 'completed'>('active');
  const [result, setResult] = useState<string | null>(null);
  const [terminationReason, setTerminationReason] = useState<string | null>(null);
  const [moves, setMoves] = useState<Array<{ moveNumber: number; san: string; from: string; to: string }>>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [showMobileScoresheet, setShowMobileScoresheet] = useState(false);

  // Local chess instance for move validation
  const chessRef = useRef(new Chess());

  // Join match via Socket.IO
  useEffect(() => {
    if (!user) return;

    const socket = getSocket();

    // Initial fetch
    apiRequest<Match>(`/matches/${id}`)
      .then((data) => {
        setMatchData(data);
        setFen(data.fen);
        setTurn(data.turn);
        setSide(data.whitePlayerId === user.id ? 'w' : 'b');
        setWhiteClock(data.whiteTimeRemaining);
        setBlackClock(data.blackTimeRemaining);
        setStatus(data.status);
        if (data.result) setResult(data.result);
        if (data.terminationReason) setTerminationReason(data.terminationReason);
        if (data.moves) {
          setMoves(
            data.moves.map((m: any) => ({
              moveNumber: m.moveNumber,
              san: m.san,
              from: m.fromSquare,
              to: m.toSquare,
            })),
          );
        }
        try {
          chessRef.current.load(data.fen);
        } catch {}
      })
      .catch((err) => {
        setErrorMessage(err.message || 'Failed to load match');
      })
      .finally(() => {
        setLoading(false);
      });

    socket.emit('match:join', { matchId: id });

    const onMatchState = (state: any) => {
      setFen(state.fen);
      setTurn(state.turn);
      if (state.side) setSide(state.side);
      setWhiteClock(state.whiteTimeRemaining);
      setBlackClock(state.blackTimeRemaining);
      setStatus(state.status);
      if (state.result) setResult(state.result);
      if (state.terminationReason) setTerminationReason(state.terminationReason);
      setSelectedSquare(null);
      try {
        chessRef.current.load(state.fen);
      } catch {}
    };

    const onMoveAccepted = (data: any) => {
      setFen(data.fen);
      setTurn(data.turn);
      setWhiteClock(data.whiteTimeRemaining);
      setBlackClock(data.blackTimeRemaining);
      if (data.status) setStatus(data.status);
      if (data.result) setResult(data.result);
      if (data.terminationReason) setTerminationReason(data.terminationReason);
      setSelectedSquare(null);

      try {
        chessRef.current.load(data.fen);
      } catch {}

      setMoves((prev) => [
        ...prev,
        {
          moveNumber: prev.length + 1,
          san: data.san,
          from: data.lastMove.from,
          to: data.lastMove.to,
        },
      ]);
    };

    const onMoveRejected = (data: any) => {
      setErrorMessage(`Move rejected: ${data.reason}`);
      setFen(data.fen || chessRef.current.fen());
      setSelectedSquare(null);
    };

    const onMatchEnded = (data: any) => {
      setStatus('completed');
      setResult(data.result);
      setTerminationReason(data.terminationReason);
      setSelectedSquare(null);
      if (data.fen) setFen(data.fen);
    };

    const onError = (data: any) => {
      setErrorMessage(data.message);
      setSelectedSquare(null);
    };

    socket.on('match:state', onMatchState);
    socket.on('match:move-accepted', onMoveAccepted);
    socket.on('match:move-rejected', onMoveRejected);
    socket.on('match:ended', onMatchEnded);
    socket.on('match:error', onError);

    return () => {
      socket.off('match:state', onMatchState);
      socket.off('match:move-accepted', onMoveAccepted);
      socket.off('match:move-rejected', onMoveRejected);
      socket.off('match:ended', onMatchEnded);
      socket.off('match:error', onError);
    };
  }, [id, user]);

  // Clocks ticker
  useEffect(() => {
    if (status !== 'active') return;

    const timer = setInterval(() => {
      if (turn === 'w') {
        setWhiteClock((prev) => {
          const next = Math.max(0, prev - 1);
          if (next === 0) {
            const socket = getSocket();
            socket.emit('match:timeout', { matchId: id });
          }
          return next;
        });
      } else {
        setBlackClock((prev) => {
          const next = Math.max(0, prev - 1);
          if (next === 0) {
            const socket = getSocket();
            socket.emit('match:timeout', { matchId: id });
          }
          return next;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [turn, status, id]);

  const handlePieceDrop = (sourceSquare: string, targetSquare: string): boolean => {
    if (status !== 'active') return false;
    if (turn !== side) {
      setErrorMessage("It is not your turn!");
      return false;
    }

    setErrorMessage(null);

    try {
      const move = chessRef.current.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (!move) return false;

      setSelectedSquare(null);
      setFen(chessRef.current.fen());
      setTurn(chessRef.current.turn());

      const socket = getSocket();
      socket.emit('match:move', {
        matchId: id,
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      return true;
    } catch {
      return false;
    }
  };

  const isMyTurn = status === 'active' && turn === side;
  const isWhite = side === 'w';

  // Tap-to-move square click handler
  const handleSquareClick = (square: string) => {
    if (status !== 'active' || !isMyTurn) {
      setSelectedSquare(null);
      return;
    }

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }

      const success = handlePieceDrop(selectedSquare, square);
      if (success) {
        setSelectedSquare(null);
        return;
      }

      // If clicked another piece belonging to user, switch selection
      const piece = chessRef.current.get(square as any);
      if (piece && piece.color === side) {
        setSelectedSquare(square);
        return;
      }

      setSelectedSquare(null);
      return;
    }

    // Select piece if it belongs to current player
    const piece = chessRef.current.get(square as any);
    if (piece && piece.color === side) {
      setSelectedSquare(square);
    }
  };

  // Custom square styles for highlights
  const getCustomSquareStyles = () => {
    const styles: Record<string, React.CSSProperties> = {};

    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: 'rgba(249, 115, 4, 0.45)',
        boxShadow: 'inset 0 0 0 2px #f97304',
      };

      try {
        const legalMoves = chessRef.current.moves({
          square: selectedSquare as any,
          verbose: true,
        });

        legalMoves.forEach((move: any) => {
          styles[move.to] = {
            background:
              chessRef.current.get(move.to)
                ? 'radial-gradient(circle, rgba(239, 68, 68, 0.6) 85%, transparent 85%)'
                : 'radial-gradient(circle, rgba(249, 115, 4, 0.5) 25%, transparent 25%)',
            borderRadius: '50%',
            cursor: 'pointer',
          };
        });
      } catch {}
    }

    return styles;
  };

  const handleResign = () => {
    if (status !== 'active') return;
    if (confirm('Are you sure you want to resign this match?')) {
      const socket = getSocket();
      socket.emit('match:resign', { matchId: id });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const opponent = isWhite ? matchData?.blackPlayer : matchData?.whitePlayer;
  const player = isWhite ? matchData?.whitePlayer : matchData?.blackPlayer;

  const opponentClock = isWhite ? blackClock : whiteClock;
  const playerClock = isWhite ? whiteClock : blackClock;
  const opponentTurn = isWhite ? turn === 'b' : turn === 'w';

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#f97304]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-2.5 py-3 sm:px-6 sm:py-6 lg:px-8 pb-24 md:pb-12">
      {/* Top Header */}
      <div className="mb-2.5 sm:mb-5 flex items-center justify-between gap-2 border-b border-slate-200 pb-2.5 sm:pb-4">
        <Link
          href={`/tournaments/${matchData?.tournamentId || ''}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0c2340] transition"
        >
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="truncate max-w-[170px] sm:max-w-none">
            {matchData?.tournament?.name || 'Tournament Arena'}
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {status === 'active' ? (
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 sm:px-3.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold text-emerald-700 shadow-2xs">
              <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Round
            </span>
          ) : (
            <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 sm:px-3.5 py-0.5 sm:py-1 text-[11px] sm:text-xs font-bold text-purple-700">
              🏆 Completed
            </span>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Game Layout */}
      <div className="grid gap-4 lg:gap-8 lg:grid-cols-12 items-start">
        {/* Left: Chessboard Arena */}
        <div className="lg:col-span-8 flex flex-col items-center">
          {/* Opponent Card (Top) */}
          <div
            className={`mb-1.5 sm:mb-2.5 flex w-full max-w-[min(100vw-20px,520px)] items-center justify-between rounded-xl sm:rounded-2xl border px-3 sm:px-4 py-2 sm:py-2.5 transition bg-white shadow-sm ${
              opponentTurn && status === 'active'
                ? 'border-[#f97316] ring-2 ring-orange-500/20 shadow-md'
                : 'border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={isWhite ? '/avatars/marcus.png' : '/avatars/alex.png'}
                  alt={opponent?.name || 'Opponent'}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover ring-2 ring-slate-200"
                />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-black border border-white shadow-2xs ${
                    isWhite ? 'bg-[#0c2340] text-white' : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {isWhite ? '♚' : '♔'}
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-[#0c2340] truncate max-w-[130px] sm:max-w-none">
                  {opponent?.name || 'Opponent'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono leading-none">
                  {isWhite ? 'Black (1615 Elo)' : 'White (1615 Elo)'}
                </div>
              </div>
            </div>

            {/* Opponent Clock */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <span
                className={`inline-flex items-center text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full ${
                  opponentTurn && status === 'active'
                    ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {opponentTurn && status === 'active' ? '● RUNNING' : '⏸ PAUSED'}
              </span>
              <div
                className={`flex items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-1 font-mono text-xs sm:text-base font-black transition ${
                  opponentTurn && status === 'active'
                    ? opponentClock < 30
                      ? 'border border-red-300 bg-red-50 text-red-600 animate-pulse'
                      : 'border border-orange-200 bg-orange-50 text-[#f97316]'
                    : 'bg-slate-50 text-slate-700 border border-slate-200'
                }`}
              >
                <Timer className="h-3.5 w-3.5" />
                {formatTime(opponentClock)}
              </div>
            </div>
          </div>

          {/* Slim Turn Indicator Strip */}
          <div
            className={`mb-1.5 sm:mb-2 flex w-full max-w-[min(100vw-20px,520px)] items-center justify-between rounded-lg sm:rounded-xl py-1 px-2.5 sm:px-3 text-center transition ${
              status !== 'active'
                ? 'bg-slate-100 text-slate-600 border border-slate-200'
                : isMyTurn
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            <div className="text-[10px] sm:text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
              {status !== 'active' ? (
                <span>Match Concluded</span>
              ) : isMyTurn ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>YOUR TURN ({isWhite ? 'White' : 'Black'})</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  <span>OPPONENT'S TURN ({isWhite ? 'Black' : 'White'})</span>
                </>
              )}
            </div>
            <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium">
              {status !== 'active'
                ? 'Game Finished'
                : isMyTurn
                ? 'Tap piece or drag'
                : 'Opponent thinking'}
            </span>
          </div>

          {/* Chessboard */}
          <ChessBoardComponent
            position={fen}
            boardOrientation={isWhite ? 'white' : 'black'}
            arePiecesDraggable={status === 'active' && isMyTurn}
            onPieceDrop={handlePieceDrop}
            onSquareClick={handleSquareClick}
            customSquareStyles={getCustomSquareStyles()}
          />

          {/* Player Card (Bottom) */}
          <div
            className={`mt-1.5 sm:mt-2.5 flex w-full max-w-[min(100vw-20px,520px)] items-center justify-between rounded-xl sm:rounded-2xl border px-3 sm:px-4 py-2 sm:py-2.5 transition bg-white shadow-sm ${
              isMyTurn && status === 'active'
                ? 'border-[#f97316] ring-2 ring-orange-500/20 shadow-md'
                : 'border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="relative shrink-0">
                <img
                  src={isWhite ? '/avatars/alex.png' : '/avatars/marcus.png'}
                  alt={player?.name || user?.name || 'You'}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover ring-2 ring-orange-200"
                />
                <span
                  className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-black border border-white shadow-2xs ${
                    isWhite ? 'bg-slate-100 text-slate-800' : 'bg-[#0c2340] text-white'
                  }`}
                >
                  {isWhite ? '♔' : '♚'}
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-xs sm:text-sm font-bold text-[#0c2340] flex items-center gap-1.5">
                  <span className="truncate max-w-[110px] sm:max-w-none">
                    {player?.name || user?.name}
                  </span>
                  <span className="rounded-full bg-orange-100 border border-orange-200 px-1.5 py-0.2 text-[9px] text-[#f97316] font-bold">
                    You
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono leading-none">
                  {isWhite ? 'White (1640 Elo)' : 'Black (1640 Elo)'}
                </div>
              </div>
            </div>

            {/* Player Clock */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <span
                className={`inline-flex items-center text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full ${
                  isMyTurn && status === 'active'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {isMyTurn && status === 'active' ? '● RUNNING' : '⏸ PAUSED'}
              </span>
              <div
                className={`flex items-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl px-2.5 sm:px-3 py-1 font-mono text-xs sm:text-base font-black transition ${
                  isMyTurn && status === 'active'
                    ? playerClock < 30
                      ? 'border border-red-300 bg-red-50 text-red-600 animate-pulse'
                      : 'border border-orange-200 bg-orange-50 text-[#f97316]'
                    : 'bg-slate-50 text-slate-700 border border-slate-200'
                }`}
              >
                <Timer className="h-3.5 w-3.5" />
                {formatTime(playerClock)}
              </div>
            </div>
          </div>

          {/* Mobile Quick Action Buttons & Scoresheet Accordion */}
          <div className="w-full max-w-[min(100vw-20px,520px)] mt-2 lg:hidden flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setShowMobileScoresheet(!showMobileScoresheet)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
              >
                <span>Official Scoresheet ({moves.length})</span>
                <span className="text-[10px] text-slate-400">
                  {showMobileScoresheet ? '▲ Hide' : '▼ View'}
                </span>
              </button>

              {status === 'active' ? (
                <button
                  onClick={handleResign}
                  className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-100 transition shadow-2xs"
                >
                  <Flag className="h-3.5 w-3.5" />
                  <span>Resign</span>
                </button>
              ) : (
                <Link
                  href={`/tournaments/${matchData?.tournamentId || ''}`}
                  className="koc-btn-primary flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold"
                >
                  <Swords className="h-3.5 w-3.5" />
                  <span>Radar</span>
                </Link>
              )}
            </div>

            {/* Mobile Expandable Scoresheet */}
            {showMobileScoresheet && (
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-md">
                <div className="text-[10px] font-mono text-slate-400 mb-2 border-b border-slate-100 pb-1 flex justify-between">
                  <span>SAN SCORESHEET</span>
                  <span>{moves.length} moves played</span>
                </div>
                <div className="max-h-[160px] overflow-y-auto font-mono text-xs">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {moves.map((m, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded px-1.5 py-0.5 hover:bg-slate-50 text-slate-700"
                      >
                        <span className="text-slate-400 text-[10px]">
                          {idx % 2 === 0 ? `${Math.floor(idx / 2) + 1}.` : ''}
                        </span>
                        <span className="font-bold">{m.san}</span>
                      </div>
                    ))}
                    {moves.length === 0 && (
                      <div className="col-span-2 py-4 text-center text-slate-400 text-xs">
                        No moves recorded yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Scorebook & Controls (Desktop) */}
        <div className="hidden lg:flex lg:col-span-4 flex-col gap-5">
          {/* Controls Card */}
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-[0_4px_20px_rgba(12,35,64,0.04)]">
            <h3 className="font-headline text-xs font-bold uppercase tracking-wider text-[#0c2340] mb-4 flex items-center gap-2">
              <Crown className="h-4 w-4 text-[#f97316]" />
              Match Controls
            </h3>

            {status === 'active' ? (
              <button
                onClick={handleResign}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-100 transition shadow-2xs"
              >
                <Flag className="h-4 w-4" />
                Resign Game
              </button>
            ) : (
              <Link
                href={`/tournaments/${matchData?.tournamentId || ''}`}
                className="koc-btn-primary flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-bold"
              >
                <Swords className="h-4 w-4" />
                Return to Tournament Radar
              </Link>
            )}
          </div>

          {/* Move History / Scoresheet */}
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-[0_4px_20px_rgba(12,35,64,0.04)] flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-100">
              <h3 className="font-headline text-xs font-bold uppercase tracking-wider text-[#0c2340]">
                Official Scoresheet ({moves.length} moves)
              </h3>
              <span className="text-[10px] font-mono text-slate-400">SAN PGN</span>
            </div>

            <div className="max-h-[360px] overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/60 p-3 font-mono text-xs">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {moves.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded px-2 py-1 hover:bg-slate-100 transition"
                  >
                    <span className="text-slate-400 text-[11px]">
                      {idx % 2 === 0 ? `${Math.floor(idx / 2) + 1}.` : ''}
                    </span>
                    <span className="font-bold text-slate-800">{m.san}</span>
                  </div>
                ))}

                {moves.length === 0 && (
                  <div className="col-span-2 py-10 text-center text-slate-400 text-xs">
                    No moves played yet. White makes the first move.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Game Over Modal */}
      {status === 'completed' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c2340]/70 p-3 sm:p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm sm:max-w-md rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative bg-white border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="mx-auto mb-3 sm:mb-4 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl sm:rounded-3xl bg-orange-50 border border-orange-200 text-[#f97316] shadow-sm">
              <Trophy className="h-8 w-8 sm:h-10 sm:w-10 animate-bounce" />
            </div>

            <h2 className="font-headline text-2xl sm:text-3xl font-black text-[#0c2340]">
              {result === (isWhite ? 'white' : 'black')
                ? '🎉 Victory!'
                : result === 'draw'
                ? '🤝 Match Drawn'
                : 'Match Finished'}
            </h2>

            <p className="mt-2 text-xs sm:text-sm text-slate-600">
              Outcome: <span className="font-bold text-[#f97316] uppercase">{result} Win</span> via{' '}
              <span className="text-[#0c2340] font-semibold">{terminationReason}</span>
            </p>

            <div className="mt-6 sm:mt-8 flex flex-col gap-2.5 sm:gap-3">
              <Link
                href={`/tournaments/${matchData?.tournamentId || ''}`}
                className="koc-btn-primary flex items-center justify-center gap-2 py-3 sm:py-3.5 text-xs sm:text-sm font-bold"
              >
                <Swords className="h-4 w-4" />
                Queue for Next Round
              </Link>

              <Link
                href={`/tournaments/${matchData?.tournamentId || ''}`}
                className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 sm:py-3 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
              >
                View Tournament Standings
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MatchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#f97316]" />
        </div>
      }
    >
      <MatchPageContent />
    </Suspense>
  );
}
