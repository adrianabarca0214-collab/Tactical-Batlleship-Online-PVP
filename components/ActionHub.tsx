

import React from 'react';
import { Player, ShipType, GameState } from '../types';
import MothershipIcon from './icons/MothershipIcon';
import RadarshipIcon from './icons/RadarshipIcon';
import RepairshipIcon from './icons/RepairshipIcon';
import CommandshipIcon from './icons/CommandshipIcon';
import DecoyshipIcon from './icons/DecoyshipIcon';
import JamshipIcon from './icons/JamshipIcon';
import CamoshipIcon from './icons/CamoshipIcon';
import ScoutshipIcon from './icons/ScoutshipIcon';
import SupportshipIcon from './icons/SupportshipIcon';
import TargetIcon from './icons/TargetIcon';
import ShieldshipIcon from './icons/ShieldshipIcon';

interface ActionHubProps {
    player: Player;
    activeAction: GameState['activeAction'];
    onActionSelect: (actionType: ShipType | 'ATTACK') => void;
}

const skillConfig: { type: ShipType, name: string, Icon: React.FC<any> }[] = [
    { type: 'Mothership', name: 'Escape', Icon: MothershipIcon },
    { type: 'Camoship', name: 'Camouflage', Icon: CamoshipIcon },
    { type: 'Scoutship', name: 'Target Lock', Icon: ScoutshipIcon },
    { type: 'Radarship', name: 'Radar', Icon: RadarshipIcon },
    { type: 'Shieldship', name: 'Shield', Icon: ShieldshipIcon },
    { type: 'Repairship', name: 'Repair', Icon: RepairshipIcon },
    { type: 'Jamship', name: 'Jam', Icon: JamshipIcon },
    { type: 'Commandship', name: 'Relocate', Icon: CommandshipIcon },
    { type: 'Decoyship', name: 'Decoy', Icon: DecoyshipIcon },
];

const ActionHub: React.FC<ActionHubProps> = ({ player, activeAction, onActionSelect }) => {

    const availableSkills = skillConfig.filter(skill => 
        player.ships.some(ship => ship.type === skill.type)
    );

    const getActionStatus = (shipType: ShipType) => {
        const ship = player.ships.find(s => s.type === shipType);
        if (!ship || ship.isSunk) {
            return { disabled: true, label: 'SUNK' };
        }

        if ((shipType === 'Commandship' || shipType === 'Camoship' || shipType === 'Shieldship') && ship.isDamaged) {
            return { disabled: true, label: 'DAMAGED' };
        }

        // Check if Jammed
        if (player.jammedPositions && player.jammedPositions.length > 0) {
            const isJammed = ship.positions.some(shipPos =>
                player.jammedPositions?.some(jamPos => jamPos.x === shipPos.x && jamPos.y === shipPos.y)
            );
            if (isJammed) {
                return { disabled: true, label: 'JAMMED' };
            }
        }
        
        // Mothership Escape Skill Logic
        if (shipType === 'Mothership') {
            if (!player.escapeSkillUnlocked) {
                return { disabled: true, label: 'Locked' };
            }
            if (player.skillUses?.Mothership === 0) {
                return { disabled: true, label: 'Used' };
            }
             return { disabled: false, label: 'Ready' };
        }


        const cooldown = player.skillCooldowns[shipType];
        if (cooldown !== undefined && cooldown > 0) {
            return { disabled: true, label: `${cooldown}T CD` };
        }

        const uses = player.skillUses[shipType];
        if (uses !== undefined) {
            if (uses > 0) {
                return { disabled: false, label: `${uses} Left` };
            }
            return { disabled: true, label: 'No Uses' };
        }
        
        return { disabled: false, label: 'Ready' };
    };

    const isAttackActive = activeAction?.type === 'ATTACK';
    const canAffordAttack = player.actionPoints >= 1;
    const canAffordSkill = player.actionPoints >= 2;

    const attackButtonClasses = `btn-angular flex flex-col items-center justify-center gap-1 p-1 w-16 h-16 text-center ${
        isAttackActive
            ? "selected"
            : "bg-slate-700 hover:bg-slate-600 text-slate-200"
    }`;


    return (
        <div className="action-hub-component">
            <div className="flex justify-center items-center flex-wrap gap-1 sm:gap-1.5">
                <button
                    key="attack"
                    onClick={() => onActionSelect('ATTACK')}
                    className={attackButtonClasses}
                    disabled={!canAffordAttack}
                >
                    <TargetIcon className="w-5 h-5" />
                    <span className="text-[11px] font-bold leading-tight mt-1">Attack</span>
                    <span className={`text-[9px] font-mono px-1 rounded bg-slate-800/70 mt-0.5`}>
                        1 AP
                    </span>
                </button>
                {availableSkills.map(({ type, name, Icon }) => {
                    const status = getActionStatus(type);
                    const isActive = activeAction?.shipType === type;
                    const isJammed = status.label === 'JAMMED';
                    
                    let baseClasses = "btn-angular flex flex-col items-center justify-center gap-1 p-1 w-16 h-16 text-center ";
                    if (status.disabled || !canAffordSkill) {
                        baseClasses += "bg-slate-700/50 text-slate-500 cursor-not-allowed opacity-70";
                    } else if (isActive) {
                        baseClasses += "selected";
                    } else {
                        baseClasses += "bg-slate-700 text-slate-200 hover:bg-slate-600";
                    }

                    if (isJammed) {
                        baseClasses += " jam-electric-ui";
                    }

                    return (
                        <button
                            key={type}
                            disabled={status.disabled || !canAffordSkill}
                            onClick={() => onActionSelect(type)}
                            className={baseClasses}
                        >
                            <Icon className="w-5 h-5" />
                            <span className="text-[11px] font-bold leading-tight mt-1">{name}</span>
                            <span className={`text-[9px] font-mono px-1 rounded mt-0.5 ${status.disabled || !canAffordSkill ? 'bg-slate-800/50' : 'bg-slate-800/70'}`}>
                                {status.label}
                            </span>
                        </button>
                    )
                })}
            </div>
        </div>
    );
};

export default ActionHub;