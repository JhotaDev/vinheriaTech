import React, { useState, useEffect } from 'react';
import { Sparkles, Wine, ShieldCheck } from 'lucide-react';

interface PrismaIntroSplashProps {
  onComplete: () => void;
}

export const PrismaIntroSplash: React.FC<PrismaIntroSplashProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [stepText, setStepText] = useState('EQUIPE PRISMA');
  const [subText, setSubText] = useState('Arquiteturas Disruptivas • IoT & Cloud');
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Stage 1: Equipe Prisma (0ms - 1200ms)
    // Stage 2: Vinheria Tech (1200ms - 2600ms)
    const textTimer = setTimeout(() => {
      setStepText('VINHERIA TECH');
      setSubText('Supervisão Global de Adegas • Check Point 5');
    }, 1300);

    // Progress bar animation
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2.5;
      });
    }, 50);

    // Fade out and close after 2.8s
    const endTimer = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        onComplete();
      }, 700);
    }, 2800);

    return () => {
      clearTimeout(textTimer);
      clearInterval(interval);
      clearTimeout(endTimer);
    };
  }, [onComplete]);

  const handleSkip = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070205] transition-opacity duration-700 ease-in-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Radial Glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-rose-600/15 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute w-[350px] h-[350px] rounded-full bg-amber-500/10 blur-[100px] pointer-events-none" />

      {/* Skip Button */}
      <button
        onClick={handleSkip}
        className="absolute top-6 right-6 z-20 text-xs font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 px-3.5 py-1.5 rounded-full border border-white/10 transition backdrop-blur-md cursor-pointer"
      >
        Pular Abertura ➔
      </button>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-md w-full">
        {/* Animated Logo Container */}
        <div className="relative mb-6">
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-rose-600 to-amber-500 opacity-30 blur-xl animate-pulse" />
          <div className="relative w-28 h-28 md:w-32 md:h-32 rounded-3xl p-3 bg-gradient-to-b from-[#1a0714] to-[#0d0309] border border-rose-500/40 shadow-2xl flex items-center justify-center animate-logo-entrance">
            <img
              src="/logo.png"
              alt="Logo Equipe Prisma"
              className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(225,29,72,0.6)]"
              onError={(e) => {
                // Fallback icon if logo not loaded
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* Dynamic Titles */}
        <div className="space-y-1.5 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/70 border border-rose-800/40 text-[11px] font-bold tracking-widest text-rose-300 uppercase">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>FIAP • 2026</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black tracking-wider text-white transition-all duration-500">
            {stepText}
          </h1>

          <p className="text-xs md:text-sm font-normal text-zinc-400 transition-all duration-500 max-w-xs mx-auto">
            {subText}
          </p>
        </div>

        {/* Loading Progress Bar */}
        <div className="w-64 max-w-full space-y-2">
          <div className="w-full bg-zinc-900/90 rounded-full h-2 p-0.5 border border-white/10 overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-400 rounded-full transition-all duration-100 ease-out shadow-[0_0_12px_rgba(225,29,72,0.8)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
            <span>Sincronizando Sensores...</span>
            <span className="font-bold text-zinc-300">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

