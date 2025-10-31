
import React from 'react';
import HelpIcon from './icons/HelpIcon';
import XIcon from './icons/XIcon';
import MothershipIcon from './icons/MothershipIcon';
import RadarshipIcon from './icons/RadarshipIcon';
import RepairshipIcon from './icons/RepairshipIcon';
import CommandshipIcon from './icons/CommandshipIcon';
import DecoyshipIcon from './icons/DecoyshipIcon';
import JamshipIcon from './icons/JamshipIcon';
import CamoshipIcon from './icons/CamoshipIcon';
import ScoutshipIcon from './icons/ScoutshipIcon';
import SupportshipIcon from './icons/SupportshipIcon';
import ShieldshipIcon from './icons/ShieldshipIcon';

interface HelpTabProps {
    isOpen: boolean;
    onClose: () => void;
}

const HelpTab: React.FC<HelpTabProps> = ({ isOpen, onClose }) => {

    const ships = [
        {
            name: "Mothership (2 sq.)",
            icon: MothershipIcon,
            purpose: "The command center. If it's sunk, you lose the game.",
            skill: "Escape (Active, 1 Use): Once damaged, this skill lets you relocate and fully repair the Mothership. Costs 2 AP (your entire turn)."
        },
        {
            name: "Camoship (4 sq.)",
            icon: CamoshipIcon,
            purpose: "Stealth unit that conceals a large area of your grid.",
            skill: "Camouflage (Active, 1 Use): Place a permanent 4x4 blind spot on your grid. Enemy shots into this zone will not reveal if they were a HIT or MISS."
        },
        {
            name: "Scoutship (3 sq.)",
            icon: ScoutshipIcon,
            purpose: "Counter-intelligence ship that negates enemy stealth.",
            skill: "Target Lock (Active): Designate 4 enemy cells. For the next 3 of your turns, your shots on these cells will always reveal their true status, bypassing Camouflage. Cooldown: 4 turns."
        },
        {
            name: "Commandship (5 sq.)",
            icon: CommandshipIcon,
            purpose: "Offers powerful strategic repositioning capabilities.",
            skill: "Relocate (Active): Move one of your non-damaged ships to a new location. Each ship can only be relocated once. Cooldown: 4 turns."
        },
        {
            name: "Decoyship (4 sq.)",
            icon: DecoyshipIcon,
            purpose: "Deploys fake signals to mislead the enemy.",
            skill: "Deploy Decoy (Active): Place a decoy that registers as a 'HIT' to the enemy, wasting their shots. Max 2 uses."
        },
        {
            name: "Radarship (3 sq.)",
            icon: RadarshipIcon,
            purpose: "Provides intelligence on enemy positions.",
            skill: "Radar Bots (Active): Scan 4 cells for a one-time intelligence snapshot. Reveals if cells contain a ship/decoy (as a 'contact'), an asteroid, or are empty. Cooldown: 3 turns."
        },
         {
            name: "Shieldship (3 sq.)",
            icon: ShieldshipIcon,
            purpose: "A support vessel focused on protecting key assets.",
            skill: "Deploy Shield (Active): Project a single-use energy shield onto a healthy ship part or an empty water cell. A shielded location completely absorbs the next hit, then dissipates. Cooldown: 5 turns."
        },
        {
            name: "Jamship (3 sq.)",
            icon: JamshipIcon,
            purpose: "Disrupts enemy special systems.",
            skill: "Deploy Jam Bots (Active): Select and jam 4 cells. For the opponent's entire next turn, any of their ships on a jammed cell have their active skills disabled. The jam expires after their turn ends. Cooldown: 4 turns."
        },
        {
            name: "Repairship (3 sq.)",
            icon: RepairshipIcon,
            purpose: "Maintains your fleet's integrity.",
            skill: "Repair (Active): Remove one 'hit' from any ship. Each ship can only be repaired once. Cooldown: 3 turns."
        },
        {
            name: "Supportship (3 sq.)",
            icon: SupportshipIcon,
            purpose: "A resilient vessel that provides defensive support.",
            skill: "Reinforce (Passive): If an enemy hits this ship, you gain +1 Action Point on your next turn."
        },
    ];

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4 fade-in">
            <div className="bg-slate-800 border-2 border-slate-600 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                 <div className="flex justify-between items-center p-4 border-b border-slate-600">
                    <h2 className="text-3xl font-bold text-cyan-400">Tactical Guide</h2>
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full text-slate-200"
                        aria-label="Close Help"
                    >
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-6">
                    <div className="text-center bg-slate-900/50 p-3 rounded-lg">
                        <h3 className="text-xl font-bold text-yellow-400">Objective</h3>
                        <p className="text-slate-300">Be the first to find and sink the opponent's <strong>Mothership</strong>.</p>
                    </div>
                    <div className="bg-slate-900/50 p-3 rounded-lg">
                        <h3 className="text-xl font-bold text-slate-200 mb-3">Core Combat Rules</h3>
                        <div className="space-y-2 text-sm text-slate-300">
                            <p>
                                <strong className="text-green-400">ACTION POINTS (AP):</strong> You get <strong>2 AP</strong> per turn.
                                <br />- Attacking costs <strong>1 AP</strong>.
                                <br />- Using any Skill costs <strong>2 AP</strong> (your entire turn).
                            </p>
                             <p>
                                <strong className="text-yellow-400">SINK BONUS:</strong> Sinking an enemy ship grants you <strong>+1 bonus AP</strong> on your next turn.
                            </p>
                            <p>
                                <strong className="text-cyan-400">INCOGNITO REPAIR:</strong> If you fully repair a ship (remove all HIT markers), it will become invisible to your opponent again.
                            </p>
                        </div>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-200 mb-3">Ship Classes & Skills</h3>
                        <div className="space-y-4">
                            {ships.map(ship => {
                                const Icon = ship.icon;
                                return (
                                <div key={ship.name} className="flex items-start gap-4 p-3 bg-slate-700/50 rounded-lg">
                                    <Icon className="w-8 h-8 text-cyan-300 flex-shrink-0 mt-1" />
                                    <div className="whitespace-pre-wrap">
                                        <h4 className="font-bold text-lg text-white">{ship.name}</h4>
                                        <p className="text-sm text-slate-300 italic mb-1">{ship.purpose}</p>
                                        <p className="text-sm text-slate-200"><strong className="text-cyan-400">Skill:</strong> {ship.skill}</p>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HelpTab;
