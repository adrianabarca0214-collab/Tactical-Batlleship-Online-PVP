
import React from 'react';
import { GameMode, GameState } from '../types';

interface TurnTransitionProps {
  game: GameState;
  onContinue: () => void;
  isLocalPlayerTurn: boolean;
}

const TurnTransition: React.FC<TurnTransitionProps> = ({ game, onContinue, isLocalPlayerTurn }) => {
  const nextPlayer = game.players.find(p => p.id === game.currentPlayerId);
  if (!nextPlayer) return null;

  const isSetupPhase = game.players.some(p => !p.isReady);
  const isFirstTurn = game.turn === 1 && game.players.every(p => p.isReady);

  let title = "TURN CHANGE";
  let message = isLocalPlayerTurn ? "It is now your turn." : `Waiting for ${nextPlayer.name}...`;
  let buttonText = "ACCEPT COMMAND";

  if (isSetupPhase) {
    title = "SETUP PHASE";
    message = isLocalPlayerTurn ? "Prepare your fleet for deployment." : `Waiting for ${nextPlayer.name} to deploy their fleet.`;
    buttonText = "COMMENCE SETUP";
  } else if (isFirstTurn) {
    title = "BATTLE STARTING";
    message = `All fleets deployed. Command transferred to ${nextPlayer.name}.`;
    buttonText = "START BATTLE";
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 text-center fade-in command-background">
      <div className="command-background-dots"></div>
      <div className="transition-alert-bg"></div>
      <div className="w-full max-w-lg command-panel transition-panel p-8 space-y-6 relative z-10">
        <h1 className="text-3xl font-bold transition-title text-red-400 tracking-widest">
            {title}
        </h1>
        <div className="text-lg text-slate-300 bg-slate-900/50 p-3 command-panel-header">
            <p className="text-sm text-slate-400">> System Log: {message}</p>
            <p className="mt-1">
                Awaiting command from: <strong className="text-yellow-300 text-xl tracking-wider">{nextPlayer.name}</strong>
            </p>
        </div>
        {isLocalPlayerTurn ? (
          <button
            onClick={onContinue}
            className="w-full btn-angular btn-start btn-accept-command text-white font-bold py-4 px-8 text-2xl transition-transform"
          >
            {buttonText}
          </button>
        ) : (
          <p className="text-slate-400 pt-4">Your opponent will advance the game.</p>
        )}
      </div>
    </div>
  );
};

export default TurnTransition;