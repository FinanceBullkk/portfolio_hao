import React from 'react';
import { Participant, CertTemplateConfig } from '../types';
import { Award, CheckCircle2, ShieldCheck, QrCode } from 'lucide-react';

interface CertificateCardProps {
  participant: Participant;
  config: CertTemplateConfig;
  scale?: number;
  interactive?: boolean;
  onDownload?: () => void;
  onVerify?: () => void;
}

export const CertificateCard: React.FC<CertificateCardProps> = ({
  participant,
  config,
  scale = 1,
  interactive = false,
  onDownload,
  onVerify
}) => {
  const getThemeGradient = () => {
    switch (config.themeStyle) {
      case 'modern_emerald':
        return 'from-emerald-700 via-teal-800 to-slate-900';
      case 'gold_executive':
        return 'from-amber-600 via-yellow-700 to-stone-900';
      case 'navy_blue':
        return 'from-blue-700 via-indigo-900 to-slate-950';
      case 'classic_purple':
      default:
        return 'from-purple-700 via-purple-900 to-indigo-950';
    }
  };

  const getAccentColor = () => {
    switch (config.themeStyle) {
      case 'modern_emerald':
        return '#059669';
      case 'gold_executive':
        return '#d97706';
      case 'navy_blue':
        return '#2563eb';
      case 'classic_purple':
      default:
        return '#7c3aed';
    }
  };

  return (
    <div
      style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}
      className="relative w-full max-w-[800px] aspect-[1.414/1] bg-white rounded-lg shadow-xl overflow-hidden border border-slate-200 text-slate-800 font-sans transition-all duration-300 hover:shadow-2xl flex flex-col justify-between p-8 sm:p-12 select-none"
    >
      {/* Outer Geometric Frame & Border Decoration */}
      <div className="absolute inset-0 pointer-events-none border-[12px] border-slate-100/80 m-2 rounded" />
      <div
        className="absolute top-0 right-0 w-64 h-64 opacity-15 pointer-events-none"
        style={{
          background: `radial-gradient(circle at top right, ${getAccentColor()}, transparent 70%)`
        }}
      />
      
      {/* Corner Geometric Accents like in Canva template video */}
      <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-40px] right-[-40px] w-32 h-32 rotate-45 opacity-25"
          style={{ backgroundColor: getAccentColor() }}
        />
        <div
          className="absolute top-[-10px] right-[-10px] w-16 h-16 rotate-45 opacity-40"
          style={{ backgroundColor: getAccentColor() }}
        />
      </div>

      <div className="absolute bottom-0 left-0 w-32 h-32 pointer-events-none overflow-hidden">
        <div
          className="absolute bottom-[-40px] left-[-40px] w-32 h-32 rotate-45 opacity-15"
          style={{ backgroundColor: getAccentColor() }}
        />
      </div>

      {/* Header Section */}
      <div className="relative z-10 flex justify-between items-start mb-4">
        {/* Organization Brand Logo / Badge */}
        <div className="flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-lg flex items-center justify-center font-bold text-white shadow-md text-xl tracking-wider"
            style={{ backgroundColor: getAccentColor() }}
          >
            {config.organizationLogo}
          </div>
          <div>
            <div className="text-xs font-bold tracking-widest text-slate-500 uppercase">
              {config.organizationName}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium mt-0.5">
              <ShieldCheck className="w-3 h-3" /> Officially Verified Credential
            </div>
          </div>
        </div>

        {/* Certificate ID */}
        <div className="text-right">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Certificate No.</div>
          <div className="text-sm font-mono font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 mt-0.5 inline-block">
            {participant.certCode || 'C-COM 26.01.000'}
          </div>
        </div>
      </div>

      {/* Main Certificate Title & Body */}
      <div className="relative z-10 text-center my-auto py-2">
        <div
          className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] mb-2"
          style={{ color: getAccentColor() }}
        >
          {config.title}
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          {participant.skillName}
        </h2>

        <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-800 border border-purple-200 px-4 py-1.5 rounded-full font-semibold text-sm sm:text-base mb-4">
          <Award className="w-4 h-4 text-purple-600" />
          <span>{participant.level}</span>
        </div>

        <div className="text-slate-500 text-xs sm:text-sm italic mb-1">
          {config.subtitle}
        </div>

        {/* Recipient Name - Big Display Font */}
        <div className="my-3 py-1 border-b-2 border-slate-200 inline-block px-8 max-w-full">
          <span className="text-2xl sm:text-4xl font-serif font-bold text-slate-900 tracking-wide drop-shadow-xs">
            {participant.name || 'Recipient Name'}
          </span>
        </div>

        <p className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed mt-2">
          For successfully demonstrating competence in {participant.subCategory} ({participant.category}) within the {participant.subCompany} organization.
        </p>
      </div>

      {/* Footer Section */}
      <div className="relative z-10 flex justify-between items-end pt-4 border-t border-slate-100">
        {/* Issue Date */}
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Date Issued</div>
          <div className="text-xs sm:text-sm font-semibold text-slate-800">{participant.issueDate}</div>
        </div>

        {/* Verification QR Code */}
        {config.showQrCode && (
          <button
            type="button"
            onClick={onVerify}
            className="flex flex-col items-center group cursor-pointer"
            title="Click to Verify Credential"
          >
            <div className="bg-slate-50 p-1.5 border border-slate-200 rounded shadow-xs group-hover:border-emerald-500 group-hover:bg-emerald-50 transition-colors">
              <QrCode className="w-10 h-10 text-slate-700 group-hover:text-emerald-600" />
            </div>
            <span className="text-[9px] text-slate-400 group-hover:text-emerald-600 mt-1 font-mono transition-colors">
              Click to verify
            </span>
          </button>
        )}

        {/* Signature Line */}
        <div className="text-right">
          <div className="font-serif italic text-base text-slate-800 font-semibold mb-1 tracking-wider border-b border-slate-300 pb-1 px-4 inline-block">
            {config.signatoryName}
          </div>
          <div className="text-[10px] uppercase font-bold text-slate-500">{config.signatoryTitle}</div>
        </div>
      </div>

      {/* Download Action Overlay if interactive */}
      {interactive && onDownload && (
        <div className="absolute inset-0 bg-slate-900/60 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-xs z-20">
          <button
            onClick={onDownload}
            className="px-5 py-2.5 bg-white text-slate-900 rounded-lg font-semibold text-sm shadow-lg hover:bg-slate-100 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Preview High-Res PDF
          </button>
        </div>
      )}
    </div>
  );
};
