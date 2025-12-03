import React, { useEffect, useState, useRef } from 'react';
import { useTutorial } from '../contexts/TutorialContext';

interface SpotlightPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TutorialOverlay() {
  const tutorial = useTutorial();
  const [spotlightPosition, setSpotlightPosition] = useState<SpotlightPosition | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const stepConfig = tutorial.getCurrentStepConfig();

  // Calculate spotlight and tooltip positions
  useEffect(() => {
    if (!tutorial.isActive || !stepConfig) {
      setSpotlightPosition(null);
      setTooltipPosition(null);
      return;
    }

    const updatePositions = () => {
      if (stepConfig.targetElement) {
        const element = document.querySelector(stepConfig.targetElement);
        if (element) {
          const rect = element.getBoundingClientRect();
          const padding = 8;

          setSpotlightPosition({
            top: rect.top - padding,
            left: rect.left - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
          });

          // Calculate tooltip position based on preferred position
          const tooltipWidth = 400;
          const tooltipHeight = 250;
          const spacing = 20;

          let top = 0;
          let left = 0;

          switch (stepConfig.position) {
            case 'right':
              top = rect.top + rect.height / 2 - tooltipHeight / 2;
              left = rect.right + spacing;
              break;
            case 'left':
              top = rect.top + rect.height / 2 - tooltipHeight / 2;
              left = rect.left - tooltipWidth - spacing;
              break;
            case 'top':
              top = rect.top - tooltipHeight - spacing;
              left = rect.left + rect.width / 2 - tooltipWidth / 2;
              break;
            case 'bottom':
              top = rect.bottom + spacing;
              left = rect.left + rect.width / 2 - tooltipWidth / 2;
              break;
            default:
              top = window.innerHeight / 2 - tooltipHeight / 2;
              left = window.innerWidth / 2 - tooltipWidth / 2;
          }

          // Keep tooltip within viewport
          top = Math.max(20, Math.min(top, window.innerHeight - tooltipHeight - 20));
          left = Math.max(20, Math.min(left, window.innerWidth - tooltipWidth - 20));

          setTooltipPosition({ top, left });
        } else {
          // Element not found, center the tooltip
          setSpotlightPosition(null);
          setTooltipPosition({
            top: window.innerHeight / 2 - 125,
            left: window.innerWidth / 2 - 200,
          });
        }
      } else {
        // No target element, center tooltip
        setSpotlightPosition(null);
        setTooltipPosition({
          top: window.innerHeight / 2 - 125,
          left: window.innerWidth / 2 - 200,
        });
      }
    };

    updatePositions();

    // Recalculate on window resize or scroll
    window.addEventListener('resize', updatePositions);
    window.addEventListener('scroll', updatePositions, true);

    return () => {
      window.removeEventListener('resize', updatePositions);
      window.removeEventListener('scroll', updatePositions, true);
    };
  }, [tutorial.isActive, stepConfig]);

  if (!tutorial.isActive || !stepConfig) {
    return null;
  }

  const progressPercentage = ((tutorial.currentStepIndex + 1) / tutorial.totalSteps) * 100;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-[9998] transition-opacity duration-300"
        style={{ pointerEvents: 'auto' }}
      />

      {/* Spotlight cutout */}
      {spotlightPosition && (
        <div
          className="fixed z-[9999] rounded-lg pointer-events-none"
          style={{
            top: `${spotlightPosition.top}px`,
            left: `${spotlightPosition.left}px`,
            width: `${spotlightPosition.width}px`,
            height: `${spotlightPosition.height}px`,
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.6), 0 0 20px rgba(59, 130, 246, 0.5)',
            transition: 'all 0.3s ease-in-out',
          }}
        />
      )}

      {/* Tutorial tooltip */}
      {tooltipPosition && (
        <div
          ref={tooltipRef}
          className="fixed z-[10000] bg-white rounded-xl shadow-2xl border border-gray-200 transition-all duration-300"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            width: '400px',
            maxHeight: '80vh',
            overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🎓</span>
                  <h3 className="text-lg font-bold text-gray-900">{stepConfig.title}</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{stepConfig.description}</p>
              </div>
              {stepConfig.canSkip && (
                <button
                  onClick={tutorial.skipTutorial}
                  className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Skip tutorial"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>
                  Step {tutorial.currentStepIndex + 1} of {tutorial.totalSteps}
                </span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Footer with navigation */}
          <div className="p-4 bg-gray-50 flex items-center justify-between rounded-b-xl">
            <div className="flex gap-2">
              {stepConfig.showBack && tutorial.currentStepIndex > 0 && (
                <button
                  onClick={tutorial.previousStep}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Back
                </button>
              )}
            </div>

            <div className="flex gap-2">
              {stepConfig.canSkip && (
                <button
                  onClick={tutorial.skipTutorial}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Skip Tutorial
                </button>
              )}

              {stepConfig.step === 'complete' ? (
                <button
                  onClick={tutorial.completeTutorial}
                  className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-green-500 to-green-600 rounded-lg hover:from-green-600 hover:to-green-700 transition-all shadow-md flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Finish Tutorial
                </button>
              ) : (
                stepConfig.showNext && (
                  <button
                    onClick={tutorial.nextStep}
                    className="px-6 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md flex items-center gap-2"
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Pointer arrow (optional, for better visual connection) */}
          {spotlightPosition && stepConfig.position && stepConfig.position !== 'center' && (
            <div
              className="absolute w-0 h-0"
              style={{
                ...(stepConfig.position === 'right' && {
                  left: '-8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  borderTop: '8px solid transparent',
                  borderBottom: '8px solid transparent',
                  borderRight: '8px solid white',
                }),
                ...(stepConfig.position === 'left' && {
                  right: '-8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  borderTop: '8px solid transparent',
                  borderBottom: '8px solid transparent',
                  borderLeft: '8px solid white',
                }),
                ...(stepConfig.position === 'top' && {
                  bottom: '-8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: '8px solid white',
                }),
                ...(stepConfig.position === 'bottom' && {
                  top: '-8px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderBottom: '8px solid white',
                }),
              }}
            />
          )}
        </div>
      )}
    </>
  );
}
