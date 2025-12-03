import React, { useState, useRef, useEffect } from 'react';

interface InfoTooltipProps {
  title: string;
  description: string;
  calculation?: string;
}

export function InfoTooltip({ title, description, calculation }: InfoTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<'right' | 'left' | 'top'>('right');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && buttonRef.current && tooltipRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Check if tooltip would overflow bottom (prioritize this check)
      const wouldOverflowBottom = buttonRect.bottom + tooltipRect.height / 2 + 10 > viewportHeight;

      if (wouldOverflowBottom) {
        // Show above if near bottom
        setPosition('top');
      } else {
        // Check if tooltip fits to the right
        if (buttonRect.right + tooltipRect.width + 10 > viewportWidth) {
          // Try left
          if (buttonRect.left - tooltipRect.width - 10 > 0) {
            setPosition('left');
          } else {
            // Use top if neither left nor right fits
            setPosition('top');
          }
        } else {
          setPosition('right');
        }
      }
    }
  }, [isOpen]);

  const getPositionClasses = () => {
    switch (position) {
      case 'left':
        return 'right-6 top-1/2 -translate-y-1/2';
      case 'top':
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
      default: // right
        return 'left-6 top-1/2 -translate-y-1/2';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'left':
        return '-right-1 top-1/2 -translate-y-1/2';
      case 'top':
        return 'top-full left-1/2 -translate-x-1/2 -mt-1';
      default: // right
        return '-left-1 top-1/2 -translate-y-1/2';
    }
  };

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="ml-1 text-gray-400 hover:text-gray-600 focus:outline-none"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {isOpen && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 w-72 p-3 text-sm bg-gray-900 text-white rounded-lg shadow-lg whitespace-normal break-words ${getPositionClasses()}`}
        >
          <div className="font-semibold mb-1 break-words">{title}</div>
          <div className="text-gray-300 mb-2 break-words">{description}</div>
          {calculation && (
            <div className="text-xs text-gray-400 border-t border-gray-700 pt-2 mt-2 break-words">
              <span className="font-semibold">Calculation:</span> {calculation}
            </div>
          )}
          {/* Arrow */}
          <div className={`absolute w-2 h-2 bg-gray-900 transform rotate-45 ${getArrowClasses()}`}></div>
        </div>
      )}
    </div>
  );
}
