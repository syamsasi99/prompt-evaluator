import React, { useEffect, useState } from 'react';

interface LoadingOverlayProps {
  message?: string;
  progress?: number; // 0-100
  onTimeout?: () => void;
  timeoutMs?: number; // Default 2 minutes
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  message = 'Processing with AI...',
  progress,
  onTimeout,
  timeoutMs = 120000, // 2 minutes default
}) => {
  const [dots, setDots] = useState('');
  const [timeoutTriggered, setTimeoutTriggered] = useState(false);

  // Animated dots effect
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 500);

    return () => clearInterval(interval);
  }, []);

  // Timeout handler
  useEffect(() => {
    if (!onTimeout) return;

    const timeout = setTimeout(() => {
      setTimeoutTriggered(true);
      onTimeout();
    }, timeoutMs);

    return () => clearTimeout(timeout);
  }, [onTimeout, timeoutMs]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
        {/* Animated gradient border effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-20 animate-pulse"></div>

        <div className="relative z-10">
          {/* Spinner */}
          <div className="flex justify-center mb-6">
            <div className="relative w-24 h-24">
              {/* Outer rotating ring */}
              <div className="absolute inset-0 border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>

              {/* Animated gradient ring */}
              <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-purple-500 rounded-full animate-spin"></div>

              {/* Inner pulsing circle */}
              <div className="absolute inset-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full opacity-20 animate-pulse"></div>

              {/* AI Icon in center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-pulse"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Message */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {message}
              <span className="inline-block w-8 text-left">{dots}</span>
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              AI is analyzing your prompts and generating results
            </p>
          </div>

          {/* Progress bar (if progress is provided) */}
          {progress !== undefined && (
            <div className="mb-6">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-2">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Timeout warning */}
          {timeoutTriggered && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center">
                ⚠️ Request is taking longer than expected...
              </p>
            </div>
          )}

          {/* Floating particles animation */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-blue-400 dark:bg-blue-500 rounded-full opacity-30 animate-float"
                style={{
                  left: `${20 + i * 15}%`,
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: `${3 + i * 0.5}s`,
                }}
              ></div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 0.3;
          }
          50% {
            transform: translateY(-100px) translateX(20px);
            opacity: 0.3;
          }
          90% {
            opacity: 0.3;
          }
          100% {
            transform: translateY(-200px) translateX(-10px);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};
