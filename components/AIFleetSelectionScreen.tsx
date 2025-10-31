
import React, { useEffect } from 'react';
import Spinner from './Spinner';

interface AIFleetSelectionScreenProps {
  onDone: () => void;
}

const AIFleetSelectionScreen: React.FC<AIFleetSelectionScreenProps> = ({ onDone }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDone();
    }, 3000); // Simulate AI thinking for 3 seconds

    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 text-center command-background relative">
        <div className="command-background-dots"></div>
        <div className="relative w-full max-w-lg command-panel p-8 space-y-6">
            <div className="ai-classified-overlay">
                <div className="ai-scan-bar"></div>
            </div>
            <div className="relative z-20 flex flex-col items-center justify-center">
                <Spinner />
                <h1 
                    className="mt-6 text-3xl font-bold text-red-400 tracking-widest relative ai-glitch-text"
                    data-text="AI IS ASSEMBLING FLEET..."
                >
                    AI IS ASSEMBLING FLEET...
                </h1>
                <p className="text-slate-400 mt-2">Analyzing optimal combat configuration.</p>
            </div>
        </div>
    </div>
  );
};

export default AIFleetSelectionScreen;
