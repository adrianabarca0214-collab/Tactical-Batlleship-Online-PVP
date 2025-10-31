import React, { useMemo } from 'react';

interface RepairEffectProps {
  rect: DOMRect;
}

const RepairEffect: React.FC<RepairEffectProps> = ({ rect }) => {
    const containerStyle: React.CSSProperties = {
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
    };

    const NUM_PARTICLES = 12;
    const particles = useMemo(() => {
        return Array.from({ length: NUM_PARTICLES }).map((_, i) => {
            const angle = (i / NUM_PARTICLES) * 2 * Math.PI;
            const radius = (rect.width / 2) + 10; // Start from just outside the cell
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            const delay = Math.random() * 0.2;

            const style: React.CSSProperties & { [key: string]: any } = {
                '--particle-x': `${x}px`,
                '--particle-y': `${y}px`,
                animationDelay: `${delay}s`,
            };
            return <div key={i} className="repair-particle" style={style}></div>;
        });
    }, [rect.width]);

    return (
        <div style={containerStyle} className="repair-effect-container">
            <div className="welding-flash-effect" style={{ animationDelay: '0.4s' }}></div>
            {particles}
        </div>
    );
};

export default RepairEffect;