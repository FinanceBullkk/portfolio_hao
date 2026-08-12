import React, { useState } from 'react';
import { CertTemplateConfig, Participant, ActiveTab } from '../types';
import { CertificateCard } from './CertificateCard';
import { Layout, Palette, Tag, ArrowRight, Check, Eye, Sparkles, RefreshCw } from 'lucide-react';
import { triggerConfetti } from '../utils/exportUtils';

interface TemplateEditorProps {
  config: CertTemplateConfig;
  setConfig: React.Dispatch<React.SetStateAction<CertTemplateConfig>>;
  sampleParticipant: Participant;
  setActiveTab: (tab: ActiveTab) => void;
  highlightedElementId?: string;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  config,
  setConfig,
  sampleParticipant,
  setActiveTab,
  highlightedElementId,
}) => {
  const [showTagOverlay, setShowTagOverlay] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const themeOptions: { id: CertTemplateConfig['themeStyle']; label: string; color: string }[] = [
    { id: 'classic_purple', label: 'CLT Royal Purple', color: '#7c3aed' },
    { id: 'modern_emerald', label: 'Emerald Executive', color: '#059669' },
    { id: 'navy_blue', label: 'Corporate Navy', color: '#2563eb' },
    { id: 'gold_executive', label: 'Prestige Gold', color: '#d97706' },
  ];

  const handleAiGenerateSubtitle = () => {
    setIsGeneratingAi(true);
    setTimeout(() => {
      const suggestions = [
        `In recognition of exceptional dedication and mastery demonstrated in ${sampleParticipant.skillName}`,
        `For distinguished excellence and professional performance in ${sampleParticipant.category}`,
        `Awarded for outstanding competency, strategic leadership, and skill mastery in ${sampleParticipant.subCategory}`
      ];
      const randomPicked = suggestions[Math.floor(Math.random() * suggestions.length)];
      setConfig((prev) => ({ ...prev, subtitle: randomPicked }));
      setIsGeneratingAi(false);
      triggerConfetti();
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-black/60 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-orange-500/10 text-orange-400 p-2 rounded-lg border border-orange-500/20">
              <Layout className="w-5 h-5 text-orange-400" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight uppercase">
              Canva Certificate Template Studio
            </h2>
            <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Canva Synced Template
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            Define layout structures, branding logos, colors, and place dynamic mapping variables for bulk certificate creation.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('mapping')}
          className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
        >
          <span>Next: Bulk Field Mapping</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Template Control Panel */}
        <div className="lg:col-span-4 bg-black/60 backdrop-blur-md rounded-2xl p-5 shadow-xl border border-white/10 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-orange-400" /> Style & Theme Settings
            </h3>
            <button
              onClick={() => setShowTagOverlay(!showTagOverlay)}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer border ${
                showTagOverlay
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white/5 text-neutral-300 border-white/10 hover:bg-white/10'
              }`}
            >
              <Tag className="w-3.5 h-3.5" /> Tags Overlay
            </button>
          </div>

          {/* Color Themes */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-2">Color Palette</label>
            <div className="grid grid-cols-2 gap-2">
              {themeOptions.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setConfig({ ...config, themeStyle: t.id })}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                    config.themeStyle === t.id
                      ? 'border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/30'
                      : 'border-white/10 hover:bg-white/5'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: t.color }} />
                  <span className="text-xs font-medium text-neutral-200 truncate">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Organization Code / Logo</label>
              <input
                type="text"
                value={config.organizationLogo}
                onChange={(e) => setConfig({ ...config, organizationLogo: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Organization Name</label>
              <input
                type="text"
                value={config.organizationName}
                onChange={(e) => setConfig({ ...config, organizationName: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-neutral-400">Certificate Subtitle / Citation</label>
                <button
                  type="button"
                  onClick={handleAiGenerateSubtitle}
                  disabled={isGeneratingAi}
                  className="text-[10px] text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1 cursor-pointer bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20"
                >
                  {isGeneratingAi ? (
                    <RefreshCw className="w-3 h-3 animate-spin text-orange-400" />
                  ) : (
                    <Sparkles className="w-3 h-3 text-orange-400" />
                  )}
                  AI Citation Generator
                </button>
              </div>
              <input
                type="text"
                value={config.subtitle}
                onChange={(e) => setConfig({ ...config, subtitle: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Signatory Name</label>
              <input
                type="text"
                value={config.signatoryName}
                onChange={(e) => setConfig({ ...config, signatoryName: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs font-semibold text-neutral-300">Verification QR Code</span>
              <button
                type="button"
                onClick={() => setConfig({ ...config, showQrCode: !config.showQrCode })}
                className={`w-10 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  config.showQrCode ? 'bg-orange-500 justify-end' : 'bg-neutral-800 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-md" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Certificate Canvas Preview */}
        <div
          id="certificate-canvas"
          className={`lg:col-span-8 bg-black/80 backdrop-blur-md rounded-2xl p-6 shadow-xl border transition-all flex flex-col items-center justify-center relative overflow-hidden ${
            highlightedElementId === 'certificate-canvas'
              ? 'ring-4 ring-orange-500/80 border-orange-500 bg-black/90 shadow-[0_0_20px_rgba(249,115,22,0.3)]'
              : 'border-white/10'
          }`}
        >
          <div className="w-full flex items-center justify-between text-xs text-neutral-400 mb-4 px-2">
            <span className="flex items-center gap-1.5 font-semibold text-neutral-200">
              <Eye className="w-4 h-4 text-orange-400" /> Live Certificate Preview Canvas
            </span>
            <span className="bg-white/5 border border-white/10 text-orange-400 px-2.5 py-1 rounded-full text-[11px]">
              Sample Record: {sampleParticipant.name}
            </span>
          </div>

          {/* Certificate Card Container */}
          <div className="w-full flex justify-center py-2 relative">
            <CertificateCard participant={sampleParticipant} config={config} />

            {/* Dynamic Tag Overlay View */}
            {showTagOverlay && (
              <div className="absolute inset-0 bg-black/85 backdrop-blur-xs rounded-xl p-8 flex flex-col justify-between pointer-events-none text-orange-400 font-mono text-xs border-2 border-orange-500/80 shadow-2xl">
                <div className="flex justify-between">
                  <span className="bg-orange-950/90 border border-orange-500/50 px-2.5 py-1 rounded">
                    {"{{Organization Logo}}"}
                  </span>
                  <span className="bg-orange-950/90 border border-orange-500/50 px-2.5 py-1 rounded">
                    {"{{Certificate Code}}"}
                  </span>
                </div>

                <div className="text-center space-y-2">
                  <span className="bg-orange-950/90 border border-orange-500/50 px-3 py-1.5 rounded inline-block">
                    {"{{Skill Name}}"}
                  </span>
                  <div>
                    <span className="bg-orange-950/90 border border-orange-500/50 px-3 py-1.5 rounded inline-block">
                      {"{{Level}}"}
                    </span>
                  </div>
                  <div>
                    <span className="bg-orange-950/90 border border-orange-500/50 px-4 py-2 rounded text-base font-bold text-white inline-block mt-2">
                      {"{{Full Name}}"}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between">
                  <span className="bg-orange-950/90 border border-orange-500/50 px-2.5 py-1 rounded">
                    {"{{Issue Date}}"}
                  </span>
                  <span className="bg-orange-950/90 border border-orange-500/50 px-2.5 py-1 rounded">
                    {"{{Signatory Name}}"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
