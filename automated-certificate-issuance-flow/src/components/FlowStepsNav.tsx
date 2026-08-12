import React from 'react';
import { ActiveTab } from '../types';
import { ArrowRight, CheckCircle2, FileSpreadsheet, Layout, SlidersHorizontal, Cpu, Send } from 'lucide-react';

interface FlowStepsNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const FlowStepsNav: React.FC<FlowStepsNavProps> = ({ activeTab, setActiveTab }) => {
  const steps: { id: ActiveTab; stepNumber: number; title: string; subtitle: string; icon: React.ReactNode }[] = [
    {
      id: 'spreadsheets',
      stepNumber: 1,
      title: 'Spreadsheet Data',
      subtitle: 'Google Sheets & Filters',
      icon: <FileSpreadsheet className="w-4 h-4" />
    },
    {
      id: 'template',
      stepNumber: 2,
      title: 'Cert Template',
      subtitle: 'Canva Design & Placeholders',
      icon: <Layout className="w-4 h-4" />
    },
    {
      id: 'mapping',
      stepNumber: 3,
      title: 'Bulk Field Mapping',
      subtitle: 'Column to Tag Bindings',
      icon: <SlidersHorizontal className="w-4 h-4" />
    },
    {
      id: 'generator',
      stepNumber: 4,
      title: 'Automated Rendering',
      subtitle: 'High-Res Batch Engine',
      icon: <Cpu className="w-4 h-4" />
    },
    {
      id: 'dispatch',
      stepNumber: 5,
      title: 'Email & Sync',
      subtitle: 'Dispatch & Sheet Status',
      icon: <Send className="w-4 h-4" />
    }
  ];

  const getCurrentStepIndex = () => {
    return steps.findIndex((s) => s.id === activeTab);
  };

  const currentIdx = getCurrentStepIndex();

  return (
    <div className="bg-neutral-950/80 backdrop-blur-md border-b border-white/5 py-3 px-4 sm:px-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between overflow-x-auto no-scrollbar gap-2">
        {steps.map((step, index) => {
          const isActive = activeTab === step.id;
          const isCompleted = currentIdx > index;

          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => setActiveTab(step.id)}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all whitespace-nowrap cursor-pointer text-left border ${
                  isActive
                    ? 'bg-orange-500/10 border-orange-500/40 text-white shadow-lg shadow-orange-500/10'
                    : isCompleted
                    ? 'bg-white/5 border-white/10 text-emerald-400 hover:bg-white/10'
                    : 'bg-black/40 border-white/5 text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-br from-orange-500 to-red-600 text-white shadow-[0_0_12px_rgba(249,115,22,0.5)]'
                      : isCompleted
                      ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/30'
                      : 'bg-neutral-800 text-neutral-400 border border-white/5'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : step.stepNumber}
                </div>
                <div>
                  <div className="text-xs font-semibold leading-tight flex items-center gap-1.5">
                    {step.title}
                  </div>
                  <div className="text-[10px] text-neutral-500 font-normal">{step.subtitle}</div>
                </div>
              </button>

              {index < steps.length - 1 && (
                <ArrowRight className="w-4 h-4 text-neutral-700 shrink-0 hidden md:block" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
