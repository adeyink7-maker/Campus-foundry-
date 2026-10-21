import React, { useState } from 'react';

export interface TactileScaleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  scaleDownRatio?: number; // Default 0.92
  className?: string;
  onPress?: () => void;
}

export const TactileScaleButton: React.FC<TactileScaleButtonProps> = ({
  children,
  scaleDownRatio = 0.94,
  className = '',
  onPress,
  onClick,
  ...rest
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const handlePointerDown = () => {
    setIsPressed(true);
  };

  const handlePointerUp = () => {
    setIsPressed(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    onPress?.();
  };

  return (
    <button
      {...rest}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        transform: isPressed ? `scale(${scaleDownRatio})` : 'scale(1)',
        transition: 'transform 0.12s cubic-bezier(0.2, 0.9, 0.3, 1.2), opacity 0.12s ease',
      }}
      className={`select-none cursor-pointer outline-none focus:outline-none ${className}`}
    >
      {children}
    </button>
  );
};

export default TactileScaleButton;
