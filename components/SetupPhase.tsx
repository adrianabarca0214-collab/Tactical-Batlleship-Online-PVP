
import React, { useState, useCallback, useEffect } from 'react';
import { GameState, Player, CellState, Ship } from '../types';
import { canPlaceShip, placeShip, createEmptyGrid, placeShipsForAI } from '../services/gameLogic';
import Grid from './Grid';
import RotateIcon from './icons/RotateIcon';
import UndoIcon from './icons/UndoIcon';
import RedoIcon from './icons/RedoIcon';
import FullscreenIcon from './icons/FullscreenIcon';
import ShipSetupPods from './ShipSetupPods';
import XIcon from './icons/XIcon';

interface SetupPhaseProps {
  game: GameState;
  playerToSetup: Player;
  onReady: (player: Player) => void;
  showToast: (message: string, type: 'error' | 'info' | 'success') => void;
}

const SetupPhase: React.FC<SetupPhaseProps> = ({ game, playerToSetup, onReady, showToast }) => {
  const [history, setHistory] = useState<Player[]>([playerToSetup]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const localPlayer = history[historyIndex];

  const [isHorizontal, setIsHorizontal] = useState(true);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);
  const [draggedShipInfo, setDraggedShipInfo] = useState<{ ship: Ship; partIndex: number; isHorizontal: boolean; } | null>(null);
  const [selectedShipName, setSelectedShipName] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);

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


  useEffect(() => {
    // When the playerToSetup prop changes, reset the component's internal state
    setHistory([playerToSetup]);
    setHistoryIndex(0);
    setIsHorizontal(true);
    setHoveredCell(null);
    setDraggedShipInfo(null);
    const firstUnplaced = playerToSetup.ships.find(s => s.positions.length === 0);
    setSelectedShipName(firstUnplaced ? firstUnplaced.name : playerToSetup.ships[0]?.name || null);
  }, [playerToSetup.id, playerToSetup.ships]);

  const { gridDimensions } = game;
  const unplacedShips = localPlayer.ships.filter(s => s.positions.length === 0);
  const selectedShipForPlacement = unplacedShips.find(s => s.name === selectedShipName);
  const selectedShipOnGrid = localPlayer.ships.find(s => s.positions.length > 0 && s.name === selectedShipName);
  
  const recordHistory = useCallback((newPlayerState: Player) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newPlayerState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const handleUndo = () => historyIndex > 0 && setHistoryIndex(historyIndex - 1);
  const handleRedo = () => historyIndex < history.length - 1 && setHistoryIndex(historyIndex + 1);

  const handleCellClick = useCallback((x: number, y: number) => {
    if (!selectedShipForPlacement || draggedShipInfo) return;

    if (canPlaceShip(localPlayer.grid, selectedShipForPlacement, x, y, isHorizontal, gridDimensions)) {
      const { newGrid, newShip } = placeShip(localPlayer.grid, selectedShipForPlacement, x, y, isHorizontal);
      const updatedShips = localPlayer.ships.map(ship => ship.name === newShip.name ? newShip : ship);
      
      const newPlayerState = { ...localPlayer, grid: newGrid, ships: updatedShips };
      recordHistory(newPlayerState);

      const nextUnplacedShips = newPlayerState.ships.filter(s => s.positions.length === 0);
      setSelectedShipName(nextUnplacedShips.length > 0 ? nextUnplacedShips[0].name : null);
    } else {
      showToast("Cannot place ship there. It may overlap another ship or an asteroid.", "error");
    }
  }, [localPlayer, selectedShipForPlacement, isHorizontal, gridDimensions, draggedShipInfo, recordHistory, showToast]);

  const handleReset = () => {
      const resetPlayer: Player = {
          ...playerToSetup,
          grid: playerToSetup.grid, // Keep original grid with asteroids
          ships: playerToSetup.ships.map(s => ({ ...s, positions: [] })),
      };
      setHistory([resetPlayer]);
      setHistoryIndex(0);
      setSelectedShipName(resetPlayer.ships[0]?.name || null);
  };

  const handleSuggestPlacement = () => {
    // This will replace all current placements with a new random layout for all drafted ships.
    const playerForPlacing = {
      ...localPlayer,
      grid: playerToSetup.grid, // Start with the original grid (with asteroids)
      ships: localPlayer.ships.map(s => ({ ...s, positions: [] })) // Use drafted ships, but un-placed
    };

    const playerWithPlacedShips = placeShipsForAI(playerForPlacing, playerForPlacing.ships, playerForPlacing.grid, gridDimensions);
    recordHistory({ ...playerWithPlacedShips, isReady: false }); // Don't automatically set to ready
    setSelectedShipName(null);
  };
  
  const handleShipDragStart = (ship: Ship, partIndex: number) => {
    const isHorizontal = ship.positions.length > 1 ? ship.positions[0].y === ship.positions[1].y : true;
    const gridWithoutShip = localPlayer.grid.map(row => [...row]);
    ship.positions.forEach(pos => { gridWithoutShip[pos.y][pos.x] = CellState.EMPTY; });
    setDraggedShipInfo({ ship, partIndex, isHorizontal });
    const tempPlayer = { ...localPlayer, grid: gridWithoutShip };
    setHistory([...history.slice(0, historyIndex + 1), tempPlayer]);
    setHistoryIndex(historyIndex + 1);
  };

  const handleCellDragOver = (e: React.DragEvent, x: number, y: number) => {
    e.preventDefault();
    if (draggedShipInfo) setHoveredCell({ x, y });
  };
  
  const handleCellDrop = (x: number, y: number) => {
    if (!draggedShipInfo) return;
    const preDragPlayerState = history[historyIndex - 1];
    const { ship, partIndex, isHorizontal } = draggedShipInfo;
    const shipX = isHorizontal ? x - partIndex : x;
    const shipY = isHorizontal ? y : y - partIndex;
    const abortDrag = () => {
        setHistory(history.slice(0, historyIndex));
        setHistoryIndex(historyIndex - 1);
        setDraggedShipInfo(null);
        setHoveredCell(null);
    }
    if (canPlaceShip(preDragPlayerState.grid, ship, shipX, shipY, isHorizontal, gridDimensions)) {
      const { newGrid, newShip } = placeShip(preDragPlayerState.grid, ship, shipX, shipY, isHorizontal);
      const updatedShips = preDragPlayerState.ships.map(s => s.name === newShip.name ? newShip : s);
      const newPlayerState = { ...preDragPlayerState, grid: newGrid, ships: updatedShips };
      const newHistory = history.slice(0, historyIndex);
      newHistory.push(newPlayerState);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setSelectedShipName(newShip.name);
    } else {
      abortDrag();
      showToast("Cannot place ship there.", "error");
    }
    setDraggedShipInfo(null);
    setHoveredCell(null);
  };

  const handleShipDragEnd = () => {
    if (draggedShipInfo) {
        setHistory(history.slice(0, historyIndex));
        setHistoryIndex(historyIndex - 1);
        setDraggedShipInfo(null);
        setHoveredCell(null);
    }
  };
  
  const handleRotate = useCallback(() => {
    if (selectedShipOnGrid) {
        const gridWithoutShip = localPlayer.grid.map(row => [...row]);
        selectedShipOnGrid.positions.forEach(pos => { gridWithoutShip[pos.y][pos.x] = CellState.EMPTY; });
        const currentIsHorizontal = selectedShipOnGrid.positions.length > 1 ? selectedShipOnGrid.positions[0].y === selectedShipOnGrid.positions[1].y : isHorizontal;
        const newIsHorizontal = !currentIsHorizontal;
        const anchor = selectedShipOnGrid.positions[0];
        if (canPlaceShip(gridWithoutShip, selectedShipOnGrid, anchor.x, anchor.y, newIsHorizontal, gridDimensions)) {
            const { newGrid, newShip } = placeShip(gridWithoutShip, selectedShipOnGrid, anchor.x, anchor.y, newIsHorizontal);
            const updatedShips = localPlayer.ships.map(s => s.name === newShip.name ? newShip : s);
            recordHistory({ ...localPlayer, grid: newGrid, ships: updatedShips });
            setSelectedShipName(newShip.name);
        } else {
            showToast("Cannot rotate ship: Path is blocked.", "error");
        }
    } else {
        setIsHorizontal(prev => !prev);
    }
  }, [selectedShipOnGrid, localPlayer, isHorizontal, gridDimensions, recordHistory, showToast]);

  const handleRemoveSelected = useCallback(() => {
    if (!selectedShipOnGrid) return;
    const newGrid = localPlayer.grid.map(row => [...row]);
    selectedShipOnGrid.positions.forEach(pos => {
      newGrid[pos.y][pos.x] = CellState.EMPTY;
    });
    const updatedShips = localPlayer.ships.map(ship =>
      ship.name === selectedShipOnGrid.name
        ? { ...ship, positions: [] }
        : ship
    );
    const newPlayerState = { ...localPlayer, grid: newGrid, ships: updatedShips };
    recordHistory(newPlayerState);
  }, [selectedShipOnGrid, localPlayer, recordHistory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key.toLowerCase() === 'r') handleRotate(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRotate]);


  const shipToPreview = draggedShipInfo ? draggedShipInfo.ship : selectedShipForPlacement;
  const previewIsHorizontal = draggedShipInfo ? draggedShipInfo.isHorizontal : isHorizontal;
  let previewX = hoveredCell?.x ?? 0, previewY = hoveredCell?.y ?? 0;
  if (draggedShipInfo && hoveredCell) {
    previewX = draggedShipInfo.isHorizontal ? hoveredCell.x - draggedShipInfo.partIndex : hoveredCell.x;
    previewY = draggedShipInfo.isHorizontal ? hoveredCell.y : hoveredCell.y - draggedShipInfo.partIndex;
  }
  const hoverPreview = hoveredCell && shipToPreview ? {
      x: previewX, y: previewY, length: shipToPreview.length, isHorizontal: previewIsHorizontal,
      isValid: canPlaceShip(draggedShipInfo ? history[historyIndex-1].grid : localPlayer.grid, shipToPreview, previewX, previewY, previewIsHorizontal, gridDimensions)
  } : null;

  const allShipsPlaced = unplacedShips.length === 0;
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-8 sm:pt-12 command-background p-2 sm:p-4 fade-in relative">
      <div className="command-background-dots"></div>
      <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
        <button
            onClick={toggleFullscreen}
            className="p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-full text-slate-200 transition-colors"
            aria-label={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
            <FullscreenIcon className="w-6 h-6" isFullscreen={isFullscreen} />
        </button>
      </div>

      <div className="text-center mb-6">
        <h1 className="text-5xl md:text-6xl font-bold command-title tracking-widest">FLEET DEPLOYMENT</h1>
        <p className="text-cyan-300 mt-1 text-xl tracking-[0.2em]">Commander: {playerToSetup.name}</p>
      </div>
      
      <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-6 items-center lg:items-start">
        <div className="w-full max-w-md lg:max-w-sm mx-auto flex flex-col gap-6">
            <div className="command-panel p-6 space-y-4 w-full">
                <div className="bg-slate-900/50 p-3 text-center command-panel-header mb-2">
                    <h2 className="text-3xl font-semibold text-white">Fleet Roster</h2>
                </div>
                
                <ShipSetupPods
                  ships={localPlayer.ships}
                  selectedShipName={selectedShipName}
                  onSelectShip={setSelectedShipName}
                  gameMode={game.gameMode}
                />

                <div className="pt-4 border-t border-slate-700 grid grid-cols-2 gap-3">
                    <button
                        onClick={handleRotate}
                        className="col-span-2 btn-angular bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 font-bold py-3 px-4 flex items-center justify-center gap-2"
                    >
                        <RotateIcon className="w-5 h-5" />
                        <div className="text-left">
                          <span className="leading-tight">
                            {selectedShipOnGrid ? 'Rotate Selected' : `Rotate (${isHorizontal ? 'H' : 'V'})`}
                          </span>
                          <span className="text-xs font-normal text-cyan-300 block leading-tight">Press 'R' key</span>
                        </div>
                    </button>
                    <button
                        onClick={handleRemoveSelected}
                        disabled={!selectedShipOnGrid}
                        className="col-span-2 btn-angular btn-orange text-white font-bold py-3 px-4 flex items-center justify-center gap-2"
                    >
                       <XIcon className="w-5 h-5" /> Remove Selected
                    </button>
                   <button onClick={handleUndo} disabled={!canUndo} className="btn-angular bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 font-bold py-3 px-4 flex items-center justify-center gap-2">
                      <UndoIcon className="w-5 h-5" /> Undo
                   </button>
                   <button onClick={handleRedo} disabled={!canRedo} className="btn-angular bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 font-bold py-3 px-4 flex items-center justify-center gap-2">
                      <RedoIcon className="w-5 h-5" /> Redo
                   </button>
                   <button onClick={handleSuggestPlacement} className="btn-angular btn-indigo text-white font-bold py-3 px-4">
                      Suggest Placement
                  </button>
                  <button onClick={handleReset} className="btn-angular btn-red text-white font-bold py-3 px-4">
                      Reset
                  </button>
                </div>
            </div>
            <button
              onClick={() => onReady(localPlayer)}
              disabled={!allShipsPlaced || playerToSetup.isReady}
              className={`w-full btn-angular btn-start font-bold py-4 text-2xl ${allShipsPlaced && !playerToSetup.isReady ? 'btn-accept-command' : ''}`}
            >
              CONFIRM FLEET
            </button>
        </div>
        
        <div className="w-full lg:flex-1 command-panel p-4">
            <div className="bg-slate-900/50 p-2 text-center command-panel-header mb-4">
                <h2 className="text-2xl font-semibold text-white">Deployment Grid</h2>
            </div>
          <Grid
            grid={localPlayer.grid}
            ships={localPlayer.ships}
            isSetup={true}
            onCellClick={handleCellClick}
            onCellMouseEnter={(x, y) => setHoveredCell({x, y})}
            onCellMouseLeave={() => setHoveredCell(null)}
            hoverPreview={hoverPreview}
            gridDimensions={gridDimensions}
            onShipDragStart={handleShipDragStart}
            onCellDrop={handleCellDrop}
            onCellDragOver={handleCellDragOver}
            onShipDragEnd={handleShipDragEnd}
            selectedShipName={selectedShipName}
          />
        </div>
      </div>
    </div>
  );
};

export default SetupPhase;
