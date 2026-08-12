import React, { useState, useEffect } from 'react';
import { DemoStep, ActiveTab } from '../types';
import { DEMO_STEPS } from '../data/mockData';
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Sparkles, Monitor, Globe, CheckCircle2 } from 'lucide-react';

interface InteractiveDemoPlayerProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  setHighlightedElementId: (id: string | undefined) => void;
  onCloseDemo: () => void;
}

export const InteractiveDemoPlayer: React.FC<InteractiveDemoPlayerProps> = ({
  activeTab,
  setActiveTab,
  setHighlightedElementId,
  onCloseDemo,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<number>(1);
  const [lang, setLang] = useState<'vi' | 'en'>('vi');
  const [isMuted, setIsMuted] = useState(false);

  const currentStep: DemoStep = DEMO_STEPS[currentStepIdx];

  // Auto-switch active tab & highlight corresponding element on step change
  useEffect(() => {
    if (currentStep) {
      setActiveTab(currentStep.tab);
      setHighlightedElementId(currentStep.targetHighlight);

      // Speech narration if not muted
      if (!isMuted && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const textToSpeak = lang === 'vi' ? currentStep.narrationVi : currentStep.narrationEn;
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = lang === 'vi' ? 'vi-VN' : 'en-US';
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [currentStepIdx, lang, isMuted, setActiveTab, setHighlightedElementId]);

  // Timer loop for auto progression
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = (8000 / speed);
    const timer = setInterval(() => {
      setCurrentStepIdx((prev) => {
        if (prev < DEMO_STEPS.length - 1) {
          return prev + 1;
        } else {
          setIsPlaying(false);
          return prev;
        }
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, speed]);

  const handleNext = () => {
    if (currentStepIdx < DEMO_STEPS.length - 1) {
      setCurrentStepIdx(currentStepIdx + 1);
    }
  };

  const handlePrev = () => {
    if (currentStepIdx > 0) {
      setCurrentStepIdx(currentStepIdx - 1);
    }
  };

  return (
    <div className="bg-black/90 backdrop-blur-xl text-neutral-100 border-b-2 border-orange-500/80 shadow-2xl sticky top-14 z-30 transition-all">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-4">
        {/* Top Control Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center font-bold text-white shadow-lg shadow-orange-500/20 animate-pulse">
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                  Interactive Video Demo Mode
                </span>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" /> Step {currentStepIdx + 1} / {DEMO_STEPS.length}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                {currentStep.title}
              </h2>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Language Switch */}
            <button
              onClick={() => setLang(lang === 'vi' ? 'en' : 'vi')}
              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-neutral-200 border border-white/10 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-orange-400" />
              <span>{lang === 'vi' ? '🇻🇳 tiếng Việt' : '🇺🇸 English'}</span>
            </button>

            {/* Mute Voiceover */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? 'Unmute voiceover' : 'Mute voiceover'}
              className="p-1.5 bg-white/5 hover:bg-white/10 text-neutral-200 border border-white/10 rounded-xl text-xs transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* Play/Pause */}
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-orange-500/20 cursor-pointer transition-all"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'Pause Demo' : 'Play Demo'}</span>
            </button>

            {/* Prev / Next */}
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-0.5">
              <button
                onClick={handlePrev}
                disabled={currentStepIdx === 0}
                className="p-1 text-neutral-400 hover:text-white disabled:opacity-40 cursor-pointer"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                disabled={currentStepIdx === DEMO_STEPS.length - 1}
                className="p-1 text-neutral-400 hover:text-white disabled:opacity-40 cursor-pointer"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Close Demo Player */}
            <button
              onClick={onCloseDemo}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 rounded-xl text-xs font-medium cursor-pointer"
            >
              Exit Presentation
            </button>
          </div>
        </div>

        {/* Step Progress Timeline Bar */}
        <div className="grid grid-cols-5 gap-2">
          {DEMO_STEPS.map((step, idx) => {
            const isCurrent = idx === currentStepIdx;
            const isPassed = idx < currentStepIdx;

            return (
              <button
                key={step.id}
                onClick={() => {
                  setCurrentStepIdx(idx);
                  setIsPlaying(false);
                }}
                className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-orange-500/15 border-orange-500 text-white ring-2 ring-orange-500/30 shadow-lg shadow-orange-500/10'
                    : isPassed
                    ? 'bg-white/5 border-emerald-500/30 text-emerald-400'
                    : 'bg-black/40 border-white/5 text-neutral-500 hover:text-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono mb-0.5">
                  <span>STEP 0{step.id}</span>
                  {isPassed && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                </div>
                <div className="text-xs font-bold truncate">{step.subtitle}</div>
              </button>
            );
          })}
        </div>

        {/* Dynamic Voiceover Subtitle & Feature Spotlight Banner */}
        <div className="bg-white/5 border border-orange-500/30 rounded-xl p-3.5 flex items-start gap-3 shadow-inner">
          <div className="bg-orange-500/20 text-orange-400 p-2 rounded-lg shrink-0 mt-0.5">
            <Sparkles className="w-4 h-4 text-orange-400" />
          </div>
          <div>
            <div className="text-[11px] uppercase font-mono font-semibold text-orange-400 tracking-wider">
              {lang === 'vi' ? 'Lời thuyết minh tính năng (Demo Narration)' : 'Feature Commentary'}
            </div>
            <p className="text-xs sm:text-sm text-neutral-100 font-medium leading-relaxed mt-0.5">
              "{lang === 'vi' ? currentStep.narrationVi : currentStep.narrationEn}"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
