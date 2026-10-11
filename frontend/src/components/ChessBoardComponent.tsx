'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const Chessboard = dynamic(
  () => import('react-chessboard').then((mod) => mod.Chessboard),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-square w-full max-w-[540px] items-center justify-center rounded-2xl bg-slate-900 border border-slate-800">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#f97304] border-t-transparent" />
      </div>
    ),
  },
);

interface ChessBoardComponentProps {
  position: string;
  boardOrientation: 'white' | 'black';
  arePiecesDraggable: boolean;
  onPieceDrop: (sourceSquare: string, targetSquare: string) => boolean;
  onSquareClick?: (square: string) => void;
  customSquareStyles?: Record<string, React.CSSProperties>;
}

export function ChessBoardComponent({
  position,
  boardOrientation,
  arePiecesDraggable,
  onPieceDrop,
  onSquareClick,
  customSquareStyles,
}: ChessBoardComponentProps) {
  return (
    <div className="mx-auto aspect-square w-full max-w-[min(100vw-24px,520px)] overflow-hidden rounded-xl sm:rounded-2xl border-4 border-[#0c2340] shadow-xl ring-2 ring-orange-500/20 touch-none select-none">
      <Chessboard
        position={position}
        boardOrientation={boardOrientation}
        arePiecesDraggable={arePiecesDraggable}
        onPieceDrop={onPieceDrop}
        onSquareClick={onSquareClick}
        customSquareStyles={customSquareStyles}
        customDarkSquareStyle={{ backgroundColor: '#0A2942' }}
        customLightSquareStyle={{ backgroundColor: '#FFF3DF' }}
        customBoardStyle={{
          borderRadius: '0.5rem',
          touchAction: 'none',
        }}
      />
    </div>
  );
}
