import React from 'react';
import { ActiveTab, Participant } from '../types';
import { SlidersHorizontal, ArrowRight, CheckCircle2, AlertTriangle, Database, Sparkles, Link as LinkIcon } from 'lucide-react';

interface MappingViewProps {
  participants: Participant[];
  setActiveTab: (tab: ActiveTab) => void;
  highlightedElementId?: string;
}

export const MappingView: React.FC<MappingViewProps> = ({
  participants,
  setActiveTab,
  highlightedElementId,
}) => {
  const mappings = [
    { column: 'Full Name', tag: '{{Full Name}}', sample: participants[0]?.name || 'Demo Learner 01', required: true },
    { column: 'Skill Name', tag: '{{Skill Name}}', sample: participants[0]?.skillName || 'English Proficiency', required: true },
    { column: 'Level', tag: '{{Level}}', sample: participants[0]?.level || 'Level 3', required: true },
    { column: 'Issue Date', tag: '{{Issue Date}}', sample: participants[0]?.issueDate || '31 Dec 2025', required: true },
    { column: 'Cert Code', tag: '{{Certificate Code}}', sample: participants[0]?.certCode || 'C-COM 25.12.001', required: true },
    { column: 'Email', tag: '{{Email Address}}', sample: participants[0]?.email || 'learner-01@example.test', required: false },
  ];

  const missingEmailsCount = participants.filter((p) => !p.email).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-black/60 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-orange-500/10 text-orange-400 p-2 rounded-lg border border-orange-500/20">
              <SlidersHorizontal className="w-5 h-5 text-orange-400" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight uppercase">
              Canva Bulk Create Column Mapping
            </h2>
            <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Automated Data Binding
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            Connect spreadsheet data columns directly to Canva template dynamic placeholders.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('generator')}
          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
        >
          <span>Run Bulk Generator</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Field Mapping Table */}
        <div
          id="mapping-panel"
          className={`lg:col-span-8 bg-black/60 backdrop-blur-md rounded-2xl p-6 shadow-xl border transition-all ${
            highlightedElementId === 'mapping-panel'
              ? 'ring-4 ring-orange-500/80 border-orange-500 bg-black/90 shadow-[0_0_20px_rgba(249,115,22,0.3)]'
              : 'border-white/10'
          }`}
        >
          <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-orange-400" /> Active Field Bindings
            </h3>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 6 / 6 Fields Mapped
            </span>
          </div>

          <div className="space-y-3">
            {mappings.map((m, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-white/5 rounded-xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/10 transition-colors"
              >
                {/* Column Name */}
                <div className="flex items-center gap-2.5 sm:w-1/3">
                  <div className="bg-white/10 text-neutral-300 p-1.5 rounded-md text-xs font-mono border border-white/10">
                    <Database className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{m.column}</div>
                    <div className="text-[10px] text-neutral-500">Sheet Column</div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="text-orange-400 font-bold hidden sm:block">→</div>

                {/* Target Placeholder Tag */}
                <div className="sm:w-1/3">
                  <div className="text-xs font-mono font-bold text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2.5 py-1 rounded inline-block">
                    {m.tag}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">Template Field Tag</div>
                </div>

                {/* Sample Value */}
                <div className="sm:w-1/3 text-right">
                  <div className="text-xs font-medium text-neutral-200 truncate">{m.sample}</div>
                  <div className="text-[10px] text-neutral-500">Sample Row Value</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Info Box & AI Integrity Pre-check */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-black/80 backdrop-blur-md text-white rounded-2xl p-5 shadow-xl border border-white/10 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-orange-400">
              <Sparkles className="w-4 h-4 text-orange-400" /> AI Data Pre-flight Check
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2 bg-white/5 p-3 rounded-xl border border-white/10">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-neutral-200">Name & Skill Format</span>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    100% of selected recipient names and skill titles are formatted properly.
                  </p>
                </div>
              </div>

              {missingEmailsCount > 0 ? (
                <div className="flex items-start gap-2 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-amber-300">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-amber-300">
                      {missingEmailsCount} Record(s) Missing Email
                    </span>
                    <p className="text-[11px] text-amber-400/80 mt-0.5">
                      Certificates will be generated, but email dispatch will require manual address input.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2 bg-white/5 p-3 rounded-xl border border-white/10">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-neutral-200">Email Addresses Valid</span>
                    <p className="text-[11px] text-neutral-400 mt-0.5">All participant emails present.</p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setActiveTab('generator')}
              className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold rounded-xl text-xs shadow-lg shadow-orange-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Confirm & Start Bulk Generation</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
