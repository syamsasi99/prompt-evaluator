import React, { useEffect, useState } from 'react';

export function Loader() {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('Initializing');

  useEffect(() => {
    // Simulate loading progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + Math.random() * 15;
      });
    }, 150);

    // Cycle through loading messages
    const messages = ['Initializing', 'Loading modules', 'Connecting services', 'Almost ready'];
    let messageIndex = 0;
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % messages.length;
      setLoadingText(messages[messageIndex]);
    }, 800);

    return () => {
      clearInterval(progressInterval);
      clearInterval(messageInterval);
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex flex-col items-center justify-center z-50 overflow-hidden">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.3) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          animation: 'grid-scroll 20s linear infinite'
        }}></div>
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-blue-400 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
              opacity: 0.6
            }}
          ></div>
        ))}
      </div>

      <div className="relative text-center z-10">
        {/* Logo with glow effect */}
        <div className="mb-12">
          <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 mb-2 animate-pulse">
            Prompt Evaluator
          </h1>
          <p className="text-blue-300 text-sm tracking-widest uppercase">Intelligent AI Testing Tool</p>
        </div>

        {/* Futuristic spinner */}
        <div className="relative w-32 h-32 mx-auto mb-8">
          {/* Outer ring */}
          <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full"></div>

          {/* Middle rotating ring */}
          <div className="absolute inset-2 border-4 border-transparent border-t-blue-400 border-r-blue-400 rounded-full animate-spin" style={{ animationDuration: '1.5s' }}></div>

          {/* Inner pulsing ring */}
          <div className="absolute inset-4 border-4 border-cyan-400/50 rounded-full animate-ping"></div>

          {/* Center core */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full animate-pulse shadow-lg shadow-blue-500/50"></div>
          </div>

          {/* Orbiting dots */}
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s' }}>
            <div className="absolute top-0 left-1/2 w-2 h-2 bg-blue-400 rounded-full -ml-1 shadow-lg shadow-blue-400/50"></div>
          </div>
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}>
            <div className="absolute bottom-0 left-1/2 w-2 h-2 bg-cyan-400 rounded-full -ml-1 shadow-lg shadow-cyan-400/50"></div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-64 mx-auto mb-6">
          <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300 ease-out shadow-lg shadow-blue-500/50"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Loading text with typing effect */}
        <div className="text-blue-200 text-sm h-6">
          <span className="inline-block animate-pulse">{loadingText}</span>
          <span className="inline-block animate-ping ml-1">.</span>
          <span className="inline-block animate-ping ml-1" style={{ animationDelay: '0.2s' }}>.</span>
          <span className="inline-block animate-ping ml-1" style={{ animationDelay: '0.4s' }}>.</span>
        </div>

        {/* Tech stats */}
        <div className="mt-8 flex gap-6 justify-center text-xs text-blue-300/70">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>System Online</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <span>AI Ready</span>
          </div>
        </div>
      </div>

      {/* Add keyframe animations via style tag */}
      <style>{`
        @keyframes grid-scroll {
          0% { transform: translateY(0); }
          100% { transform: translateY(50px); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-20px) translateX(10px); }
        }
      `}</style>
    </div>
  );
}
