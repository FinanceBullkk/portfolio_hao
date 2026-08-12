import React from 'react';
import { ActiveTab, Participant } from '../types';
import { FileSpreadsheet, Layout, SlidersHorizontal, Cpu, Send, PlayCircle, ShieldCheck, RefreshCw } from 'lucide-react';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  participants: Participant[];
  onResetData: () => void;
  onLaunchDemoPlayer: () => void;
  isDemoPlaying: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  participants,
  onResetData,
  onLaunchDemoPlayer,
  isDemoPlaying,
}) => {
  const toPrintCount = participants.filter((p) => p.status === 'To be printed').length;
  const printedCount = participants.filter((p) => p.status === 'Printed').length;
  const missingEmailCount = participants.filter((p) => p.emailStatus === 'Missing Email').length;

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'spreadsheets', label: '1. Spreadsheet Data', icon: <FileSpreadsheet className="w-4 h-4" /> },
    { id: 'template', label: '2. Cert Template', icon: <Layout className="w-4 h-4" /> },
    { id: 'mapping', label: '3. Field Mapping', icon: <SlidersHorizontal className="w-4 h-4" /> },
    { id: 'generator', label: '4. Bulk Generator', icon: <Cpu className="w-4 h-4" />, count: toPrintCount },
    { id: 'dispatch', label: '5. Email Dispatch', icon: <Send className="w-4 h-4" />, count: printedCount },
  ];

  return (
    <header className="bg-black/60 backdrop-blur-md text-neutral-100 border-b border-white/10 sticky top-0 z-40 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between py-3.5 gap-3">
          {/* Logo / App Name & Back Link */}
          <div className="flex items-center gap-3">
            <a
              href="../../index.html"
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors border border-white/10"
              title="Return to Portfolio Homepage"
            >
              ← Portfolio
            </a>
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center font-bold text-sm shadow-lg shadow-orange-500/20 text-white tracking-wider">
              CLT
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-white tracking-tight uppercase">
                  FlowStudio <span className="text-orange-500">Cert Engine</span>
                </h1>
                <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-orange-500" /> AI POWERED
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                Google Sheets → Bulk Certificate Creation → Email Dispatch
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar & Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap justify-end">
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 text-xs text-neutral-300">
              <span className="text-neutral-400">To Print:</span>
              <span className="font-mono font-bold text-orange-400">{toPrintCount}</span>
              <span className="text-neutral-600">|</span>
              <span className="text-neutral-400">Printed:</span>
              <span className="font-mono font-bold text-emerald-400">{printedCount}</span>
              {missingEmailCount > 0 && (
                <>
                  <span className="text-neutral-600">|</span>
                  <span className="text-rose-400 font-medium">{missingEmailCount} Missing Email</span>
                </>
              )}
            </div>

            {/* Launch Demo Presentation Mode Button */}
            <button
              onClick={onLaunchDemoPlayer}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg ${
                isDemoPlaying
                  ? 'bg-orange-500 text-white shadow-orange-500/30 ring-2 ring-orange-400 animate-pulse'
                  : 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700 shadow-orange-500/20'
              }`}
            >
              <PlayCircle className="w-4 h-4" />
              <span>{isDemoPlaying ? 'Playing Presentation Mode...' : '🎬 Presentation Mode'}</span>
            </button>

            {/* Reset Data Button */}
            <button
              onClick={onResetData}
              title="Reset sample data"
              className="p-2 bg-white/5 hover:bg-white/10 text-neutral-300 rounded-xl text-xs transition-colors cursor-pointer border border-white/10"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar border-t border-white/5 pt-1.5 pb-2.5">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-sm shadow-orange-500/10'
                    : 'text-neutral-400 hover:text-neutral-100 hover:bg-white/5 border border-transparent'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isActive ? 'bg-orange-500 text-white' : 'bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
