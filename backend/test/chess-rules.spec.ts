import { Chess } from 'chess.js';

describe('Authoritative Chess Rules & Move Legality', () => {
  it('accepts valid opening moves and switches turns', () => {
    const chess = new Chess();
    expect(chess.turn()).toBe('w');

    // Legal move for White: e2 -> e4
    const move = chess.move({ from: 'e2', to: 'e4' });
    expect(move).toBeDefined();
    expect(move.san).toBe('e4');
    expect(chess.turn()).toBe('b');
  });

  it('rejects illegal moves without corrupting board position', () => {
    const chess = new Chess();
    const initialFen = chess.fen();

    // Illegal move: moving pawn backwards or moving bishop through pawns
    expect(() => {
      chess.move({ from: 'c1', to: 'c4' });
    }).toThrow();

    expect(chess.fen()).toBe(initialFen);
    expect(chess.turn()).toBe('w');
  });

  it('detects checkmate properly (Scholar\'s mate)', () => {
    const chess = new Chess();
    chess.move('e4'); // 1. e4
    chess.move('e5'); // 1... e5
    chess.move('Bc4'); // 2. Bc4
    chess.move('Nc6'); // 2... Nc6
    chess.move('Qh5'); // 3. Qh5
    chess.move('Nf6'); // 3... Nf6??
    chess.move('Qxf7#'); // 4. Qxf7#

    expect(chess.isCheckmate()).toBe(true);
    expect(chess.isGameOver()).toBe(true);
  });

  it('detects stalemate properly', () => {
    // Known stalemate position: White Kh8, Black Kf7, Black Qc7 (White has no legal moves, not in check)
    const stalemateFen = '7k/2q2K2/8/8/8/8/8/8 w - - 0 1';
    // Actually White: Kh8, Black: Qc7, Kf7
    const chess = new Chess('k7/2Q5/8/8/8/8/8/K7 b - - 0 1');
    expect(chess.isStalemate()).toBe(true);
    expect(chess.isDraw()).toBe(true);
    expect(chess.isGameOver()).toBe(true);
  });
});
