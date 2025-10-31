import React, { useState, useCallback, useEffect } from 'react';
// FIX: Imported 'GamePhase' to resolve reference error.
import { GameMode, MapType, OpponentType, GameState, GamePhase } from '../types';
import FullscreenIcon from './icons/FullscreenIcon';
import Spinner from './Spinner';
import GameGuide from './GameGuide';
import { createGame, joinGame } from '../services/realtimeService';
import CopyIcon from './icons/CopyIcon';

interface LobbyProps {
  onGameCreated: (game: any, sessionId: string) => void;
  onGameJoined: (game: any, sessionId: string) => void;
  initialGameId?: string;
  game: GameState | null;
}

const Lobby: React.FC<LobbyProps> = ({ game, onGameCreated, onGameJoined, initialGameId }) => {
  const [gameMode, setGameMode] = useState<GameMode>('TACTICAL');
  const [mapType, setMapType] = useState<MapType>('STANDARD');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [playerName, setPlayerName] = useState('Player 1');
  const [player2Name, setPlayer2Name] = useState('Player 2');
  const [opponentType, setOpponentType] = useState<OpponentType>('AI');
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  const [sessionId] = useState(() => crypto.randomUUID());
  const [joinGameId, setJoinGameId] = useState(initialGameId || '');

  const isWaiting = game?.phase === GamePhase.LOBBY && game.players?.length === 1 && game.opponentType === 'ONLINE';

  useEffect(() => {
    if(initialGameId) {
      setOpponentType('ONLINE');
      setJoinGameId(initialGameId);
    }
  }, [initialGameId]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenEnabled) return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.error(err));
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const handleCreateGame = async () => {
    if (!playerName.trim()) { setError('Your callsign cannot be empty.'); return; }
    setError('');
    setIsLoading(true);
    try {
      const newGame = await createGame(playerName.trim(), sessionId, gameMode, mapType);
      onGameCreated(newGame, sessionId);
    } catch (e: any) {
      setError(e.message || 'Could not create game.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!playerName.trim()) { setError('Your callsign cannot be empty.'); return; }
    if (!joinGameId.trim()) { setError('Game ID cannot be empty.'); return; }
    setError('');
    setIsLoading(true);
    try {
      const joinedGame = await joinGame(joinGameId.trim().toUpperCase(), playerName.trim(), sessionId);
      onGameJoined(joinedGame, sessionId);
    } catch (e: any) {
      setError(e.message || 'Could not join game. Check the ID and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!game?.gameId) return;
    const url = `${window.location.origin}${window.location.pathname}?gameId=${game.gameId}`;
    navigator.clipboard.writeText(url);
    // You can add a toast notification here to confirm the copy
  };

  const getGameModeDescription = () => {
      if (gameMode === 'TACTICAL') return "Assemble your fleet and sink the enemy Mothership using unique ship skills.";
      return "The original naval combat game. Place your ships and be the last fleet standing.";
  }
  
  const getMapTypeDescription = () => {
      if (mapType === 'ASTEROID_FIELD') return "A hazardous battlefield with impassable asteroids that block shots and movement.";
      return "A standard, open-water combat zone. No environmental hazards.";
  }

  const renderOnlineMenu = () => (
    <>
      <div className="fade-in">
        <label htmlFor="player_name" className="block text-slate-300 mb-1 text-sm tracking-wider">Your Callsign:</label>
        <input id="player_name" type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="> Enter Callsign_" className="w-full px-4 py-2 command-input rounded-sm text-cyan-300 text-2xl placeholder-slate-500 focus:outline-none transition" />
      </div>
      <div className="grid grid-cols-1 gap-4">
        <button onClick={handleCreateGame} disabled={isLoading} className="w-full btn-angular btn-start font-bold py-4 text-2xl">
          {isLoading ? <Spinner /> : 'Create New Game'}
        </button>
        <div className="space-y-2">
            <h3 className="text-center text-slate-400">OR</h3>
             <input type="text" value={joinGameId} onChange={(e) => setJoinGameId(e.target.value)} placeholder="ENTER GAME ID" className="w-full px-4 py-2 command-input rounded-sm text-cyan-300 text-2xl placeholder-slate-500 focus:outline-none transition text-center tracking-widest"/>
            <button onClick={handleJoinGame} disabled={isLoading} className="w-full btn-angular btn-indigo font-bold py-3 text-xl">
             {isLoading ? <Spinner /> : 'Join Game'}
            </button>
        </div>
      </div>
    </>
  );

  const renderWaitingScreen = () => (
    <div className="text-center fade-in space-y-4">
        <h3 className="text-2xl text-cyan-300">Game Created</h3>
        <p className="text-slate-400">Share this Game ID with your opponent:</p>
        <div className="bg-slate-900/50 p-4 rounded-md flex items-center justify-center gap-4">
            <p className="text-4xl font-mono tracking-widest text-yellow-300">{game?.gameId}</p>
            <button onClick={handleCopyLink} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-md" title="Copy Sharable Link">
                <CopyIcon className="w-6 h-6 text-slate-200" />
            </button>
        </div>
        <div className="flex items-center justify-center gap-3 pt-4">
            <Spinner/>
            <p className="text-lg text-slate-300">Waiting for opponent to join...</p>
        </div>
    </div>
  );


  return (
    <>
      {isGuideOpen && <GameGuide isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />}
      <div className="min-h-screen flex items-center justify-center p-4 fade-in command-background relative">
         <div className="command-background-dots"></div>
         <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-full text-slate-200 transition-colors z-20"
          aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          <FullscreenIcon className="w-6 h-6" isFullscreen={isFullscreen} />
        </button>

        <div className="w-full max-w-lg space-y-6 relative z-10">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold command-title tracking-widest">
              GEMINI BATTLESHIP
            </h1>
            <p className="text-center text-cyan-300 mt-2 text-xl tracking-[0.2em]">FLEET COMMAND</p>
          </div>
          
          <div className="command-panel p-6 md:p-8 space-y-6">
              <div className="bg-slate-900/50 p-3 text-center command-panel-header">
                  <h2 className="text-3xl font-semibold text-white">New Engagement</h2>
              </div>

              {error && <p className="text-red-400 text-center bg-red-900/50 p-3 rounded-md">{error}</p>}
              
               <div>
                <label className="block text-slate-300 mb-2 text-lg text-center font-semibold tracking-wider">Opponent:</label>
                <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => setOpponentType('AI')} className={`btn-angular py-3 text-lg font-bold transition-colors ${opponentType === 'AI' ? 'selected' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}>vs. AI</button>
                    <button onClick={() => setOpponentType('Human')} className={`btn-angular py-3 text-lg font-bold transition-colors ${opponentType === 'Human' ? 'selected' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}>vs. Player (Local)</button>
                    <button onClick={() => setOpponentType('ONLINE')} className={`btn-angular py-3 text-lg font-bold transition-colors ${opponentType === 'ONLINE' ? 'selected' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}>Online</button>
                </div>
              </div>

              {opponentType === 'ONLINE' ? (
                isWaiting ? renderWaitingScreen() : renderOnlineMenu()
              ) : (
                <>
                  <div>
                    <label htmlFor="player1_name" className="block text-slate-300 mb-1 text-sm tracking-wider">{opponentType === 'Human' ? 'Player 1 Callsign:' : 'Your Callsign:'}</label>
                    <input id="player1_name" type="text" value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="> Enter Callsign_" className="w-full px-4 py-2 command-input rounded-sm text-cyan-300 text-2xl placeholder-slate-500 focus:outline-none transition"/>
                  </div>
                  {opponentType === 'Human' && (
                    <div className="fade-in">
                      <label htmlFor="player2_name" className="block text-slate-300 mb-1 text-sm tracking-wider">Player 2 Callsign:</label>
                      <input id="player2_name" type="text" value={player2Name} onChange={(e) => setPlayer2Name(e.target.value)} placeholder="> Enter Callsign_" className="w-full px-4 py-2 command-input rounded-sm text-cyan-300 text-2xl placeholder-slate-500 focus:outline-none transition"/>
                    </div>
                  )}
                </>
              )}

              <div className="pt-4 border-t border-slate-600">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-slate-300 mb-2 text-lg text-center font-semibold tracking-wider">Game Mode:</label>
                      <div className="grid grid-cols-1 gap-3">
                          <button onClick={() => setGameMode('TACTICAL')} className={`btn-angular py-3 text-lg font-bold transition-colors ${gameMode === 'TACTICAL' ? 'selected' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}>Tactical</button>
                          <button onClick={() => setGameMode('CLASSIC')} className={`btn-angular py-3 text-lg font-bold transition-colors ${gameMode === 'CLASSIC' ? 'selected' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`}>Classic</button>
                      </div>
                    </div>
                     <div>
                      <label className="block text-slate-300 mb-2 text-lg text-center font-semibold tracking-wider">Map Type:</label>
                      <div className="grid grid-cols-1 gap-3">
                          <button onClick={() => setMapType('STANDARD')} className={`btn-angular py-3 text-lg font-bold transition-colors ${mapType === 'STANDARD' ? 'selected' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`} disabled={gameMode === 'CLASSIC'}>Standard</button>
                          <button onClick={() => setMapType('ASTEROID_FIELD')} className={`btn-angular py-3 text-lg font-bold transition-colors ${mapType === 'ASTEROID_FIELD' ? 'selected' : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'}`} disabled={gameMode === 'CLASSIC'}>Asteroids</button>
                      </div>
                    </div>
                </div>
                <p className="text-center text-xs text-slate-400 mt-4 px-2 min-h-[2.5rem] flex items-center justify-center">{getGameModeDescription()}</p>
                <p className="text-center text-xs text-slate-400 mt-1 px-2 min-h-[2.5rem] flex items-center justify-center">{gameMode === 'TACTICAL' ? getMapTypeDescription() : ''}</p>
              </div>
              
              {opponentType !== 'ONLINE' && (
                <div className="flex gap-3">
                    <button onClick={() => setIsGuideOpen(true)} className="w-full btn-angular btn-indigo font-bold py-4 text-2xl">Game Guide</button>
                    <button
                      onClick={() => {
                        // This button is now only for local/AI games
                        if (!playerName.trim()) { setError('Player 1 name cannot be empty.'); return; }
                        if (opponentType === 'Human' && !player2Name.trim()) { setError('Player 2 name cannot be empty.'); return; }
                        if (opponentType === 'Human' && playerName.trim() === player2Name.trim()) { setError('Player names must be unique.'); return; }
                        setError('');
                        // The parent component (`App.tsx`) is expected to handle the actual game creation now.
                        // We pass a placeholder function.
                        const createLocalGame = (window as any).createLocalGame;
                        if(createLocalGame) createLocalGame(playerName, gameMode, opponentType, mapType, opponentType === 'Human' ? player2Name : undefined);
                      }}
                      className="w-full btn-angular btn-start font-bold py-4 text-2xl"
                    >
                      DEPLOY FLEET
                    </button>
                </div>
              )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Lobby;