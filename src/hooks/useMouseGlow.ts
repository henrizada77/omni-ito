import { useState, useRef } from 'react';
import type { MouseEvent, CSSProperties } from 'react';


export interface MouseGlowProps {
  ref: React.RefObject<HTMLDivElement | null>;
  onMouseMove: (e: MouseEvent<HTMLDivElement>) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  style: CSSProperties & {
    '--mouse-x'?: string;
    '--mouse-y'?: string;
    '--glow-opacity'?: string;
  };
}

export function useMouseGlow(): MouseGlowProps {
  const containerRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  return {
    ref: containerRef,
    onMouseMove: handleMouseMove,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    style: {
      '--mouse-x': `${coords.x}px`,
      '--mouse-y': `${coords.y}px`,
      '--glow-opacity': isHovered ? '1' : '0',
    } as CSSProperties,
  };
}
