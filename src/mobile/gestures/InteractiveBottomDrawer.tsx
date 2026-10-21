import React, { useState } from 'react';

export interface InteractiveBottomDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  snapPoints?: number[]; // Percentages e.g. [0.25, 0.5, 0.9]
  initialSnapIndex?: number;
  children: React.ReactNode;
  headerTitle?: string;
}

export const InteractiveBottomDrawer: React.FC<InteractiveBottomDrawerProps> = ({
  isOpen,
  onClose,
  snapPoints = [0.35, 0.65, 0.92],
  initialSnapIndex = 1,
  children,
  headerTitle,
}) => {
  const [currentSnapIndex, setCurrentSnapIndex] = useState(initialSnapIndex);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffsetY, setDragOffsetY] = useState(0);

  if (!isOpen) return null;

  const currentHeightPct = snapPoints[currentSnapIndex] * 100;

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    const startY = e.clientY;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientY - startY;
      setDragOffsetY(delta);
    };

    const handlePointerUp = (upEvent: PointerEvent) => {
      setIsDragging(false);
      const delta = upEvent.clientY - startY;
      setDragOffsetY(0);

      if (delta > 120) {
        // Dragged down
        if (currentSnapIndex > 0) {
          setCurrentSnapIndex(currentSnapIndex - 1);
        } else {
          onClose();
        }
      } else if (delta < -120) {
        // Dragged up
        if (currentSnapIndex < snapPoints.length - 1) {
          setCurrentSnapIndex(currentSnapIndex + 1);
        }
      }

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center pointer-events-none select-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto transition-opacity"
        onClick={onClose}
      />

      {/* Sheet Container */}
      <div
        style={{
          height: `${currentHeightPct}%`,
          transform: `translateY(${dragOffsetY}px)`,
          transition: isDragging ? 'none' : 'height 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="relative w-full max-w-lg bg-neutral-900 border-t border-white/10 rounded-t-3xl shadow-2xl flex flex-col pointer-events-auto overflow-hidden"
      >
        {/* Drag Handle & Header */}
        <div
          onPointerDown={handlePointerDown}
          className="w-full pt-3 pb-2 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none"
        >
          <div className="w-12 h-1.5 bg-neutral-600 rounded-full mb-2" />
          {headerTitle && (
            <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
              {headerTitle}
            </div>
          )}
        </div>

        {/* Scrollable Sheet Content */}
        <div className="flex-1 overflow-y-auto px-4 pb-6">{children}</div>
      </div>
    </div>
  );
};

export default InteractiveBottomDrawer;
