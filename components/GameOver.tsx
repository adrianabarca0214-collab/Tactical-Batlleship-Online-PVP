import React, { useState, useCallback, useEffect } from 'react';
// FIX: Removed unused 'Player' import.
import { GameState } from '../types';
import FullscreenIcon from './icons/FullscreenIcon';

interface GameOverProps {
  game: GameState;
  onExitGame: () => void;
}

const GameOver: React.FC<GameOverProps> = ({ game, onExitGame }) => {
  const winner = game.players.find(p => p.id === game.winner);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenEnabled) {
        console.warn("Fullscreen API is not supported by this browser.");
        return;
    }
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);


  // FIX: Removed unused 'sortedPlayers' and 'getRankColor' variables and logic related
  // to 'SCORE_ATTACK' game mode, which is not defined in the GameMode type.
  // This resolves the TypeScript error.

  const renderWinMessage = () => {
    if (game.gameMode === 'TACTICAL') {
        return winner ? (
            <h2 className="text-2xl sm:text-4xl text-white mb-8">
                <span className="font-bold text-yellow-300">{winner.name}</span> has destroyed the enemy Mothership!
            </h2>
        ) : (
            <h2 className="text-2xl sm:text-4xl text-white mb-8">The battle ended in a stalemate.</h2>
        )
    }
    return winner ? (
        <h2 className="text-2xl sm:text-4xl text-white mb-8">
            <span className="font-bold text-yellow-300">{winner.name}</span> is the winner!
        </h2>
    ) : (
        <h2 className="text-2xl sm:text-4xl text-white mb-8">The game ended in a draw.</h2>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center fade-in command-background relative">
        <div className="command-background-dots"></div>
        <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-full text-slate-200 transition-colors z-20"
            aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
            <FullscreenIcon className="w-6 h-6" isFullscreen={isFullscreen} />
        </button>
      <div className="command-panel p-8 md:p-12 space-y-6 w-full max-w-2xl">
        <h1 className="text-5xl sm:text-7xl font-extrabold command-title mb-4">
          ENGAGEMENT OVER
        </h1>
        {renderWinMessage()}
        <button
          onClick={onExitGame}
          className="btn-angular btn-start font-bold py-4 px-10 text-xl transition-transform transform hover:scale-105"
        >
          Return to Fleet Command
        </button>
      </div>
    </div>
  );
};

export default GameOver;