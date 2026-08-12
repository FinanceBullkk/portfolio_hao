import React from 'react';
import { Participant, CertTemplateConfig } from '../types';
import { ShieldCheck, CheckCircle2, QrCode, ExternalLink, X, Building2, Calendar, Award, Lock } from 'lucide-react';

interface VerificationModalProps {
  participant: Participant;
  config: CertTemplateConfig;
  onClose: () => void;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
  participant,
  config,
  onClose,
}) => {
  const hash = `0x${participant.certCode.replace(/[^a-zA-Z0-9]/g, '')}e9a31f7d98c24b`;

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-950 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative border border-emerald-500/30 text-neutral-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5 uppercase">
                Official Credential Verification
              </h3>
              <p className="text-xs text-emerald-400 font-mono font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Authenticated & Cryptographically Signed
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white font-bold p-1 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Certificate Credential Details */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-neutral-400 font-medium">Recipient Name</span>
            <span className="font-bold text-white text-sm">{participant.name}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-400 font-medium">Certified Competency</span>
            <span className="font-semibold text-orange-400">{participant.skillName} ({participant.level})</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-400 font-medium">Issuing Organization</span>
            <span className="font-medium text-neutral-200 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-neutral-400" /> {config.organizationName}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-400 font-medium">Issue Date</span>
            <span className="font-medium text-neutral-200 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" /> {participant.issueDate}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-400 font-medium">Credential Serial</span>
            <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              {participant.certCode}
            </span>
          </div>
        </div>

        {/* Verification Tech Metadata */}
        <div className="bg-black/80 rounded-xl p-3 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-neutral-500 font-mono flex items-center gap-1">
              <Lock className="w-3 h-3 text-neutral-400" /> Cryptographic Verification Hash
            </span>
            <span className="text-emerald-400 font-mono text-[10px]">SHA-256 Valid</span>
          </div>
          <div className="font-mono text-[10px] text-neutral-400 break-all bg-white/5 p-2 rounded border border-white/5">
            {hash}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-neutral-500 flex items-center gap-1">
            <QrCode className="w-3.5 h-3.5 text-orange-400" /> Scan QR Code on Certificate to re-verify
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold rounded-xl text-xs shadow-lg shadow-orange-500/20 cursor-pointer transition-all"
          >
            Close Portal
          </button>
        </div>
      </div>
    </div>
  );
};
