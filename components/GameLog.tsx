
import React, { useState, useRef, useEffect } from 'react';
import { GameLogEntry, Player, GameMode } from '../types';
import ExplosionIcon from './icons/ExplosionIcon';
import WaterIcon from './icons/WaterIcon';
import ShipIcon from './icons/ShipIcon';
import AsteroidDestroyedIcon from './icons/AsteroidDestroyedIcon';
import CamoHitIcon from './icons/CamoHitIcon';
import ShieldIcon from './icons/ShieldIcon';

interface GameLogProps {
    log: GameLogEntry[];
    players: Player[];
    currentUserId: string;
    gameMode: GameMode;
}

const getColumnLetter = (col: number) => String.fromCharCode(65 + col);

const GameLog: React.FC<GameLogProps> = ({ log, players, currentUserId, gameMode }) => {
    const [toasts, setToasts] = useState<{ id: number; entry: GameLogEntry }[]>([]);
    const prevLogLengthRef = useRef(log.length);

    useEffect(() => {
        if (log.length > prevLogLengthRef.current) {
            const newEntryCount = log.length - prevLogLengthRef.current;
            const newEntries = log.slice(0, newEntryCount);

            const newToasts = newEntries.map(entry => {
                const id = Math.random();
                setTimeout(() => {
                    setToasts(currentToasts => currentToasts.filter(t => t.id !== id));
                }, 7000); // 7 seconds lifetime
                return { id, entry };
            }).reverse(); // Display in the order they occurred

            setToasts(currentToasts => [...currentToasts, ...newToasts]);
        }
        prevLogLengthRef.current = log.length;
    }, [log]);

    const formatLogEntry = (entry: GameLogEntry) => {
        const isCurrentUser = entry.playerId === currentUserId;
        const playerName = isCurrentUser ? "You" : entry.playerName;
        const targetName = entry.targetId === currentUserId ? "your" : (entry.targetName ? `${entry.targetName}'s` : '');
        const coords = entry.coords ? `${getColumnLetter(entry.coords.x)}${entry.coords.y + 1}` : '';

        switch (entry.result) {
            case 'MISS':
                return (
                    <>
                        <WaterIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        <span className="flex-1">
                            <strong>{playerName}</strong> fired at {coords} and missed.
                        </span>
                    </>
                );
            case 'HIT':
                const shipName = entry.hitShipName || 'ship';
                return (
                    <>
                        <ExplosionIcon className="w-4 h-4 text-orange-400 flex-shrink-0" />
                        <span className="flex-1">
                            <strong>{playerName}</strong> hit {targetName} <strong>{shipName}</strong> at {coords}!
                        </span>
                    </>
                );
            case 'SUNK_SHIP':
                 return (
                    <>
                        <ShipIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span className="flex-1">
                            <strong>{playerName}</strong> sunk {targetName} <strong>{entry.sunkShipName}</strong>!
                        </span>
                    </>
                );
            case 'ASTEROID_DESTROYED':
                 return (
                    <>
                        <AsteroidDestroyedIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="flex-1">
                            <strong>{playerName}</strong> destroyed an asteroid at {coords}.
                        </span>
                    </>
                );
            case 'CAMO_HIT':
                return (
                    <>
                        <CamoHitIcon className="w-4 h-4 text-purple-400 flex-shrink-0" />
                        <span className="flex-1">
                             <strong>{playerName}</strong> fired into a camo field at {coords}. Hit status unknown.
                        </span>
                    </>
                );
            case 'SHIELD_BROKEN':
                return (
                    <>
                        <ShieldIcon className="w-4 h-4 text-cyan-300 flex-shrink-0" />
                        <span className="flex-1">
                            {entry.message}
                        </span>
                    </>
                );
             case 'SKILL_USED':
                return (
                   <>
                      <ShipIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span className="flex-1">
                          {entry.message || `${playerName} used a ship skill.`}
                      </span>
                  </>
              );
            case 'SHOT_FIRED':
                // This log type is not currently used, so we render nothing.
                return null;
            default:
                // This should be unreachable if all result types are handled.
                // It's a safeguard against future errors.
                const _exhaustiveCheck: never = entry.result;
                return <span>{`Unknown event: ${JSON.stringify(entry)}`}</span>;
        }
    };

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] w-full max-w-xl px-4 flex flex-col items-center gap-2 pointer-events-none">
            {toasts.map(({ id, entry }) => {
                const isCurrentUser = entry.playerId === currentUserId;
                const content = formatLogEntry(entry);
                if (!content) return null;

                return (
                    <div key={id} className="w-full max-w-lg command-panel p-0 fade-in pointer-events-auto">
                        <div className={`p-3 border-l-4 ${isCurrentUser ? 'border-cyan-400' : 'border-slate-500'}`}>
                            <div className="flex items-start gap-3 text-slate-300 text-sm">
                                <span className="font-mono text-slate-500 text-xs pt-0.5">{`T${entry.turn}`}</span>
                                <div className="flex-1 flex items-center gap-2">
                                    {content}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default GameLog;