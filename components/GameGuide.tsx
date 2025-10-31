
import React from 'react';
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

interface GameGuideProps {
    isOpen: boolean;
    onClose: () => void;
}

const ships = [
    { name: "Mothership (2 sq.)", icon: MothershipIcon, cost: 0, purpose: "The command center. Your most critical asset.", skill: "Escape (Active, 1 Use): Once damaged, you can use 2 AP to relocate and fully repair the Mothership." },
    { name: "Camoship (4 sq.)", icon: CamoshipIcon, cost: 7, purpose: "Stealth unit that conceals a large area of your grid.", skill: "Camouflage (Active, 1 Use): Place a permanent 4x4 blind spot on your grid. Enemy shots into this zone will not reveal if they were a HIT or MISS." },
    { name: "Commandship (5 sq.)", icon: CommandshipIcon, cost: 7, purpose: "Offers powerful strategic repositioning.", skill: "Relocate (Active): Move one of your non-damaged ships to a new location. Each ship can only be relocated once. Cooldown: 4 turns." },
    { name: "Scoutship (3 sq.)", icon: ScoutshipIcon, cost: 6, purpose: "Counter-intelligence ship that negates enemy stealth.", skill: "Target Lock (Active): Designate 4 enemy cells. For the next 3 of your turns, your shots on these cells will bypass Camouflage. Cooldown: 4 turns." },
    { name: "Shieldship (3 sq.)", icon: ShieldshipIcon, cost: 5, purpose: "A support vessel focused on protecting key assets.", skill: "Deploy Shield (Active): Project a single-use shield onto a healthy ship part to absorb the next hit. Can also be used on empty cells as a bluff. Cooldown: 5 turns." },
    { name: "Radarship (3 sq.)", icon: RadarshipIcon, cost: 4, purpose: "Provides intelligence on enemy positions.", skill: "Radar Bots (Active): Scan 4 cells for a one-time snapshot. Reveals if cells contain a ship/decoy (as a 'contact'), an asteroid, or are empty. Cooldown: 3 turns." },
    { name: "Repairship (3 sq.)", icon: RepairshipIcon, cost: 4, purpose: "Maintains your fleet's integrity.", skill: "Repair (Active): Remove one 'hit' from any ship. Each ship can only be repaired once. Cooldown: 3 turns." },
    { name: "Jamship (3 sq.)", icon: JamshipIcon, cost: 4, purpose: "Disrupts enemy special systems.", skill: "Deploy Jam Bots (Active): Jam 4 cells. For the opponent's entire next turn, any of their ships on a jammed cell have their active skills disabled. Cooldown: 4 turns." },
    { name: "Decoyship (4 sq.)", icon: DecoyshipIcon, cost: 3, purpose: "Deploys fake signals to mislead the enemy.", skill: "Deploy Decoy (Active): Place a decoy that registers as a 'HIT' to the enemy, wasting their shots. Max 2 uses." },
    { name: "Supportship (3 sq.)", icon: SupportshipIcon, cost: 3, purpose: "A resilient vessel that provides defensive support.", skill: "Reinforce (Passive): If an enemy hits this ship, you gain +1 Action Point on your next turn." },
];

const GameGuide: React.FC<GameGuideProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 fade-in">
            <div className="w-full max-w-3xl max-h-[90vh] flex flex-col command-panel">
                <div className="flex justify-between items-center p-4 bg-slate-900/50 command-panel-header">
                    <h2 className="text-4xl font-bold command-title">Game Guide</h2>
                    <button onClick={onClose} className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full text-slate-200" aria-label="Close Guide">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 overflow-y-auto space-y-8">

                    {/* Game Modes */}
                    <section>
                        <h3 className="text-2xl font-bold text-cyan-300 mb-3 tracking-wider">Game Modes</h3>
                        <div className="space-y-4">
                            <div className="p-3 bg-slate-900/50 rounded-lg">
                                <h4 className="font-bold text-lg text-white">Tactical Mode</h4>
                                <p className="text-slate-300 text-sm">The primary way to play. Assemble a custom fleet within a budget, utilize powerful ship skills, and hunt down the enemy <strong className="text-yellow-400">Mothership</strong>. The first to sink the opponent's Mothership wins instantly.</p>
                            </div>
                            <div className="p-3 bg-slate-900/50 rounded-lg">
                                <h4 className="font-bold text-lg text-white">Classic Mode</h4>
                                <p className="text-slate-300 text-sm">The original naval combat experience. You are given a standard fleet of five ships. The objective is to find and sink <strong className="text-yellow-400">ALL</strong> of your opponent's ships to achieve victory. There are no skills in this mode.</p>
                            </div>
                        </div>
                    </section>
                    
                     {/* Opponent & Maps */}
                    <section>
                        <h3 className="text-2xl font-bold text-cyan-300 mb-3 tracking-wider">Opponent & Map Types</h3>
                        <div className="space-y-4">
                             <div className="p-3 bg-slate-900/50 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="font-bold text-lg text-white">Player vs. Player</h4>
                                    <p className="text-slate-300 text-sm">Face off against a friend on the same device in "hot-seat" mode. A transition screen will ensure your fleet's position remains secret between turns.</p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-white">Player vs. AI</h4>
                                    <p className="text-slate-300 text-sm">Challenge the onboard Gemini AI, a formidable opponent that uses advanced tactics to hunt your fleet.</p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-white">Standard Map</h4>
                                    <p className="text-slate-300 text-sm">An open-water battlefield. No environmental hazards to consider.</p>
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg text-white">Asteroid Field Map</h4>
                                    <p className="text-slate-300 text-sm">(Tactical Only) A hazardous map dotted with impassable asteroids. They block shots and prevent ship placement, forcing new strategic approaches.</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Tactical Mechanics */}
                    <section>
                        <h3 className="text-2xl font-bold text-cyan-300 mb-3 tracking-wider">Tactical Mode Core Mechanics</h3>
                        <div className="p-3 bg-slate-900/50 rounded-lg space-y-3 text-slate-300 text-sm">
                             <p><strong className="text-white">Fleet Budget:</strong> You have <strong className="text-yellow-400">30 DP</strong> (Deployment Points) to build your fleet. Your Mothership is free. Choose your ships wisely to fit your strategy.</p>
                            <p><strong className="text-white">Action Points (AP):</strong> You get <strong className="text-green-400">2 AP</strong> per turn. An <strong className="text-orange-400">Attack</strong> costs 1 AP. Using any <strong className="text-cyan-400">Skill</strong> costs 2 AP (your entire turn).</p>
                            <p><strong className="text-white">Bonus AP:</strong> You gain <strong className="text-green-400">+1 bonus AP</strong> on your next turn for sinking an enemy ship. The Supportship's passive skill can also grant bonus AP.</p>
                            <p><strong className="text-white">Mothership Hit:</strong> Hitting an enemy Mothership immediately ends your turn, but any remaining AP you had is <strong className="text-yellow-400">carried over</strong> to your next turn as a bonus.</p>
                        </div>
                    </section>

                    {/* Ship Manifest */}
                    <section>
                        <h3 className="text-2xl font-bold text-cyan-300 mb-3 tracking-wider">Tactical Ship Manifest</h3>
                        <div className="space-y-4">
                            {ships.map(ship => {
                                const Icon = ship.icon;
                                return (
                                <div key={ship.name} className="flex items-start gap-4 p-3 bg-slate-800/60 rounded-lg">
                                    <Icon className="w-10 h-10 text-cyan-300 flex-shrink-0 mt-1" />
                                    <div className="whitespace-pre-wrap flex-1">
                                        <div className="flex justify-between items-baseline">
                                            <h4 className="font-bold text-lg text-white">{ship.name}</h4>
                                            {ship.cost > 0 && <span className="font-bold text-lg text-yellow-300">{ship.cost} DP</span>}
                                        </div>
                                        <p className="text-sm text-slate-400 italic mb-1">{ship.purpose}</p>
                                        <p className="text-sm text-slate-200">{ship.skill}</p>
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    </section>

                </div>
            </div>
        </div>
    );
};

export default GameGuide;
