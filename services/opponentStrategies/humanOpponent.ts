import { IOpponentLogic, GameState, Player, GamePhase } from '../../types';

const handleHumanFleetReady = (gameState: GameState, player: Player): { newState: GameState, nextPlayerIndexToSetup?: number | null } => {
    const newGameState = JSON.parse(JSON.stringify(gameState));
    const playerIndex = newGameState.players.findIndex((p: Player) => p.id === player.id);
    newGameState.players[playerIndex] = { ...player };

    if (playerIndex === 0) {
        // Player 1 is done, transition to Player 2 for fleet selection
        newGameState.phase = GamePhase.TURN_TRANSITION;
        newGameState.currentPlayerId = newGameState.players[1].id;
        return { newState: newGameState, nextPlayerIndexToSetup: 1 };
    } else {
        // Player 2 is done, transition to Player 1 for setup
        newGameState.phase = GamePhase.TURN_TRANSITION;
        newGameState.currentPlayerId = newGameState.players[0].id;
        return { newState: newGameState, nextPlayerIndexToSetup: 0 };
    }
};

const handleHumanSetupReady = (gameState: GameState, player: Player): { newState: GameState, nextPlayerIndexToSetup?: number | null } => {
    const newGameState = JSON.parse(JSON.stringify(gameState));
    const playerIndex = newGameState.players.findIndex((p: Player) => p.id === player.id);
    newGameState.players[playerIndex] = { ...player, isReady: true };

    if (playerIndex === 0) {
        // Player 1 is ready, transition to Player 2's setup
        newGameState.phase = GamePhase.TURN_TRANSITION;
        newGameState.currentPlayerId = newGameState.players[1].id;
        return { newState: newGameState, nextPlayerIndexToSetup: 1 };
    } else {
        // Player 2 is ready, start the game
        newGameState.phase = GamePhase.TURN_TRANSITION;
        newGameState.currentPlayerId = newGameState.players[0].id; // Player 1 starts
        return { newState: newGameState, nextPlayerIndexToSetup: null }; // Setup is complete
    }
};

export const humanOpponentLogic: IOpponentLogic = {
    handleFleetReady: handleHumanFleetReady,
    handleSetupReady: handleHumanSetupReady,
};
