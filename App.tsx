import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GamePhase, Player, GameMode, CellState, ShipType, Ship, GameLogEntry, MapType, OpponentType } from './types';
import Lobby from './components/Lobby';
import SetupPhase from './components/SetupPhase';
import GamePhaseComponent from './components/GamePhase';
import GameOver from './components/GameOver';
import { createEmptyGrid, generateAsteroids } from './services/gameLogic';
import { executeAITurn } from './services/geminiService';
import Spinner from './components/Spinner';
import Toast from './components/Toast';
import { getGameConfig } from './constants';
import TurnTransition from './components/TurnTransition';
import FleetSetup from './components/FleetSetup';
import AIFleetSelectionScreen from './components/AIFleetSelectionScreen';
import { getModeLogic } from './services/gameModeStrategy';
import { getOpponentLogic } from './services/opponentStrategy';
import * as realtimeService from './services/realtimeService';

const getSessionId = (): string => {
    let id = sessionStorage.getItem('sessionId');
    if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem('sessionId', id);
    }
    return id;
};

const App: React.FC = () => {
  const [game, setGame] = useState<GameState | null>(null);
  const [sessionId] = useState(getSessionId);
  const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
  const [playerIndexToSetup, setPlayerIndexToSetup] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'info' | 'success' } | null>(null);
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  
  // FIX: Use ReturnType<typeof setTimeout> for browser compatibility instead of NodeJS.Timeout
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, type: 'error' | 'info' | 'success' = 'info') => {
    setToast({ message, type });
  }, []);

  const clearPolling = () => {
      if(pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
  };
  
  // Polling effect for online games
  useEffect(() => {
      clearPolling();
      if (game?.opponentType === 'ONLINE' && game.phase !== GamePhase.GAME_OVER) {
          const poll = async () => {
              if (game?.gameId) { // Ensure gameId exists before polling
                const serverState = await realtimeService.getGameState(game.gameId);
                if (serverState && serverState.lastUpdated !== game.lastUpdated) {
                    setGame(serverState);
                }
              }
              pollTimeoutRef.current = setTimeout(poll, 2000);
          };
          pollTimeoutRef.current = setTimeout(poll, 2000);
      }
      return clearPolling;
  }, [game]);
  
  const updateGameOnServer = async (moveType: string, payload: any) => {
    if (!game || !localPlayerId) return;
    setIsLoading(true);
    try {
        const newGameState = await realtimeService.updateGameState(game.gameId, localPlayerId, sessionId, { type: moveType, payload });
        setGame(newGameState);
    } catch (e: any) {
        showToast(e.message, 'error');
    } finally {
        setIsLoading(false);
    }
  };

  const handleCreateLocalGame = (playerName: string, gameMode: GameMode, opponentType: OpponentType, mapType: MapType, player2Name?: string) => {
    setIsLoading(true);
    const { gridDimensions, shipsConfig, fleetBudget } = getGameConfig(gameMode);
    const modeLogic = getModeLogic(gameMode);
    let initialGrid = createEmptyGrid(gridDimensions.rows, gridDimensions.cols);
    if (mapType === 'ASTEROID_FIELD') initialGrid = generateAsteroids(initialGrid, 10);
    const player1 = modeLogic.initializePlayer(crypto.randomUUID(), playerName, false, initialGrid, gameMode);
    const players = [player1];
    if (opponentType === 'AI') {
        players.push(modeLogic.initializePlayer(crypto.randomUUID(), 'Gemini AI', true, initialGrid, gameMode));
    } else {
        players.push(modeLogic.initializePlayer(crypto.randomUUID(), player2Name!, false, initialGrid, gameMode));
    }
    setPlayerIndexToSetup(0);
    if (gameMode === 'CLASSIC') {
        const classicShips = shipsConfig.map(c => ({...c, positions:[], isSunk:false, isDamaged:false, hasBeenRepaired: false, hasBeenRelocated: false}));
        players.forEach(p => p.ships = JSON.parse(JSON.stringify(classicShips)));
    }
    players.forEach(p => players.forEach(o => { if (p.id !== o.id) p.shots[o.id] = createEmptyGrid(gridDimensions.rows, gridDimensions.cols); }));
    const newGame: GameState = { gameId: crypto.randomUUID(), phase: gameMode === 'TACTICAL' ? GamePhase.FLEET_SELECTION : GamePhase.SETUP, players, currentPlayerId: player1.id, winner: null, maxPlayers: 2, turn: 1, gridDimensions, shipsConfig: shipsConfig as any, gameMode, mapType, opponentType, fleetBudget, log: [], lastShot: null };
    setLocalPlayerId(player1.id);
    setGame(newGame);
    setIsLoading(false);
  };
  (window as any).createLocalGame = handleCreateLocalGame;

  const handleGameCreatedOrJoined = (newGame: GameState, currentSessionId: string) => {
      const localP = newGame.players.find(p => p.sessionId === currentSessionId)!;
      setLocalPlayerId(localP.id);
      setGame(newGame);
      // Update URL for sharing/reloading
      const url = new URL(window.location.href);
      url.searchParams.set('gameId', newGame.gameId);
      window.history.pushState({}, '', url);
  };

  const handleFleetReady = async (playerWithFleet: Player) => {
    if (!game) return;
    if (game.opponentType === 'ONLINE') {
        await updateGameOnServer('fleetReady', { playerWithFleet });
    } else {
        const opponentLogic = getOpponentLogic(game);
        const { newState, nextPlayerIndexToSetup: nextIndex } = opponentLogic.handleFleetReady(game, playerWithFleet);
        setGame(newState);
        if (nextIndex !== undefined) setPlayerIndexToSetup(nextIndex);
    }
  };

  const handleReady = async (playerWithShips: Player) => {
    if (!game) return;
    if (game.opponentType === 'ONLINE') {
        await updateGameOnServer('setupReady', { playerWithShips });
    } else {
        const opponentLogic = getOpponentLogic(game);
        const { newState, nextPlayerIndexToSetup: nextIndex } = opponentLogic.handleSetupReady(game, playerWithShips);
        setGame(newState);
        if (nextIndex !== undefined) setPlayerIndexToSetup(nextIndex);
    }
  };
  
  const handleFireShot = (targetPlayerId: string | null, x: number, y: number) => updateGameOnServer('fireShot', { targetPlayerId, x, y });
  const onSetActiveAction = (action: any) => updateGameOnServer('setActiveAction', { action });
  const onUseSkill = async (skillType: ShipType, options: any): Promise<boolean> => { await updateGameOnServer('useSkill', { skillType, options }); return true; };
  const onEndTurn = () => updateGameOnServer('endTurn', {});
  const onActivateMothershipEscape = () => updateGameOnServer('activateMothershipEscape', {});
  const onSelectShipForRelocation = (ship: Ship) => updateGameOnServer('selectShipForRelocation', { ship });
  const handleTurnTransitionContinue = () => updateGameOnServer('transitionContinue', {});


  const handleAISelectionDone = () => {
    if (!game) return;
    setPlayerIndexToSetup(0);
    setGame({ ...game, phase: GamePhase.SETUP });
  };

  useEffect(() => {
    const handleResize = () => setViewMode(window.innerWidth < 1024 ? 'mobile' : 'desktop');
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const aiTurnHandler = useCallback(async (currentGame: GameState) => {
    if (currentGame.players.find(p => p.id === currentGame.currentPlayerId)?.isAI) {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      const finalGameState = await executeAITurn(currentGame, (intermediateState) => setGame(intermediateState));
      setGame(finalGameState);
      if (finalGameState.phase !== 'GAME_OVER') {
        setTimeout(() => {
            setGame(g => {
                if (!g) return null;
                const modeLogic = getModeLogic(g.gameMode);
                return modeLogic.advanceTurn(g);
            });
        }, 1200);
      }
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (game?.phase === GamePhase.PLAYING && game.opponentType !== 'ONLINE') {
      aiTurnHandler(game);
    }
  }, [game?.phase, game?.currentPlayerId, game?.opponentType, aiTurnHandler]);


  const handleExitGame = () => {
    window.history.pushState({}, '', window.location.pathname);
    // Use window.location.reload() to ensure a full state reset
    window.location.reload();
  };
  
  const renderContent = () => {
    if (!game) {
      const urlParams = new URLSearchParams(window.location.search);
      const gameId = urlParams.get('gameId');
      return <Lobby game={null} onGameCreated={handleGameCreatedOrJoined} onGameJoined={handleGameCreatedOrJoined} initialGameId={gameId || undefined} />;
    }

    const localPlayer = game.players.find(p => p.id === localPlayerId);

    if (isLoading && !game.activeAction) {
        return <div className="min-h-screen flex items-center justify-center command-background"><Spinner /></div>;
    }
    
    const playerToSetup = (playerIndexToSetup !== null && game.players[playerIndexToSetup]) ? game.players[playerIndexToSetup] : game.players.find(p => p.id === game.currentPlayerId)!;

    switch (game.phase) {
      case GamePhase.LOBBY:
        // This case now handles the waiting screen for the game creator and joining for the opponent.
        return <Lobby game={game} onGameCreated={handleGameCreatedOrJoined} onGameJoined={handleGameCreatedOrJoined} initialGameId={game.gameId} />;
      
      case GamePhase.FLEET_SELECTION:
        if (!localPlayer || localPlayer.id !== game.currentPlayerId) {
             return <div className="min-h-screen flex flex-col items-center justify-center command-background text-white text-xl"><Spinner/> <p className="mt-4">Waiting for {game.players.find(p=>p.id===game.currentPlayerId)?.name} to select their fleet...</p></div>;
        }
        return <FleetSetup game={game} playerToSetup={localPlayer} onFleetReady={handleFleetReady} />;

      case GamePhase.AI_FLEET_SELECTION: return <AIFleetSelectionScreen onDone={handleAISelectionDone} />;

      case GamePhase.SETUP:
        const currentPlayerForSetup = game.players.find(p => !p.isReady);
        if (!localPlayer || (currentPlayerForSetup && localPlayer.id !== currentPlayerForSetup.id)) {
            return <div className="min-h-screen flex flex-col items-center justify-center command-background text-white text-xl"><Spinner/> <p className="mt-4">Waiting for {currentPlayerForSetup?.name || 'opponent'} to deploy their fleet...</p></div>;
        }
        return <SetupPhase game={game} playerToSetup={localPlayer} onReady={handleReady} showToast={showToast} />;

      case GamePhase.TURN_TRANSITION:
        return <TurnTransition game={game} onContinue={handleTurnTransitionContinue} isLocalPlayerTurn={game.currentPlayerId === localPlayerId} />;

      case GamePhase.PLAYING:
        return <GamePhaseComponent game={game} playerId={localPlayerId!} onFireShot={handleFireShot} onSurrender={handleExitGame} onSetActiveAction={onSetActiveAction} onUseSkill={onUseSkill} onEndTurn={onEndTurn} onActivateMothershipEscape={onActivateMothershipEscape} onSelectShipForRelocation={onSelectShipForRelocation} viewMode={viewMode} setViewMode={setViewMode} showToast={showToast} />;
      case GamePhase.GAME_OVER:
        return <GameOver game={game} onExitGame={handleExitGame} />;
      default:
        return <div>Unknown game phase: {game.phase}</div>;
    }
  };

  return (
    <>
      {renderContent()}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
};

export default App;
