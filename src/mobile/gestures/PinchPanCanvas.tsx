import React, { useState, useRef } from 'react';

export interface PinchPanCanvasProps {
  children: React.ReactNode;
  minScale?: number;
  maxScale?: number;
  className?: string;
}

export const PinchPanCanvas: React.FC<PinchPanCanvasProps> = ({
  children,
  minScale = 1.0,
  maxScale = 4.0,
  className = '',
}) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number }>({
    x: 0,
    y: 0,
    posX: 0,
    posY: 0,
  });

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsPanning(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isPanning) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;

    setPosition({
      x: dragStartRef.current.posX + deltaX,
      y: dragStartRef.current.posY + deltaY,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsPanning(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    // Bounce back if zoomed out to 1.0
    if (scale <= 1.05) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const nextScale = Math.max(minScale, Math.min(maxScale, scale * zoomFactor));
    setScale(nextScale);

    if (nextScale <= 1.05) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div
      onWheel={handleWheel}
      className={`relative overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing ${className}`}
      onDoubleClick={handleReset}
    >
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
          transition: isPanning ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          transformOrigin: 'center center',
        }}
        className="w-full h-full flex items-center justify-center"
      >
        {children}
      </div>

      {/* Quick Zoom Indicator / Controls */}
      {scale > 1.05 && (
        <div className="absolute bottom-3 right-3 z-30 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-bold text-amber-400 border border-white/10 shadow-lg">
          {scale.toFixed(1)}x • Double-tap to reset
        </div>
      )}
    </div>
  );
};

export default PinchPanCanvas;
