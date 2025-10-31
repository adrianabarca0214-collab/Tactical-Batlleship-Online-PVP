import { IOpponentLogic, GameState, Player, GamePhase } from '../../types';
import { getAIFleetSelection } from '../geminiService';
import { placeShipsForAI } from '../gameLogic';

const handleAIFleetReady = (gameState: GameState, player: Player): { newState: GameState, nextPlayerIndexToSetup?: number | null } => {
    const newGameState = JSON.parse(JSON.stringify(gameState));
    const humanPlayerIndex = newGameState.players.findIndex((p: Player) => p.id === player.id);
    newGameState.players[humanPlayerIndex] = { ...player };

    // AI selects its fleet immediately after the human
    const aiPlayer = newGameState.players.find((p: Player) => p.isAI)!;
    const aiFleet = getAIFleetSelection(newGameState.shipsConfig, newGameState.fleetBudget);
    aiPlayer.ships = aiFleet;

    newGameState.phase = GamePhase.AI_FLEET_SELECTION;
    
    return { newState: newGameState, nextPlayerIndexToSetup: 0 };
};

const handleAISetupReady = (gameState: GameState, player: Player): { newState: GameState, nextPlayerIndexToSetup?: number | null } => {
    const newGameState = JSON.parse(JSON.stringify(gameState));
    
    // Update human player state
    const humanPlayerIndex = newGameState.players.findIndex((p: Player) => p.id === player.id);
    newGameState.players[humanPlayerIndex] = { ...player, isReady: true };

    // AI places its ships
    const aiPlayerIndex = newGameState.players.findIndex((p: Player) => p.isAI);
    if (aiPlayerIndex !== -1) {
        const aiPlayer = newGameState.players[aiPlayerIndex];
        newGameState.players[aiPlayerIndex] = placeShipsForAI(aiPlayer, aiPlayer.ships, aiPlayer.grid, newGameState.gridDimensions);
    }
    
    newGameState.phase = GamePhase.PLAYING;
    newGameState.currentPlayerId = newGameState.players[humanPlayerIndex].id; // Human always goes first
    
    return { newState: newGameState, nextPlayerIndexToSetup: null };
};


export const aiOpponentLogic: IOpponentLogic = {
    handleFleetReady: handleAIFleetReady,
    handleSetupReady: handleAISetupReady,
};
