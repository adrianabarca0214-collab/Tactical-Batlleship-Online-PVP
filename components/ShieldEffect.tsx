import React from 'react';
import ShieldIcon from './icons/ShieldIcon';

interface ShieldEffectProps {
  rect: DOMRect;
  type: 'form' | 'break';
}

const ShieldEffect: React.FC<ShieldEffectProps> = ({ rect, type }) => {
    const containerStyle: React.CSSProperties = {
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        zIndex: 102,
        pointerEvents: 'none',
    };

    const animationClass = type === 'form' ? 'shield-form-effect' : 'shield-break-effect';

    return (
        <div style={containerStyle} className="flex items-center justify-center">
            <ShieldIcon className={`w-full h-full text-cyan-300 ${animationClass}`} />
        </div>
    );
};

export default ShieldEffect;