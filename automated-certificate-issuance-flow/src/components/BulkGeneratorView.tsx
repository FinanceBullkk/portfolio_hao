import React, { useState, useEffect } from 'react';
import { Participant, CertTemplateConfig, ActiveTab } from '../types';
import { CertificateCard } from './CertificateCard';
import { VerificationModal } from './VerificationModal';
import { Cpu, Play, CheckCircle2, Download, ArrowRight, Eye, RefreshCw, Sparkles, FileText, FolderArchive } from 'lucide-react';
import { downloadSingleCertificate, exportCertificatesZip, triggerConfetti } from '../utils/exportUtils';

interface BulkGeneratorViewProps {
  participants: Participant[];
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  selectedIds: string[];
  config: CertTemplateConfig;
  setActiveTab: (tab: ActiveTab) => void;
  highlightedElementId?: string;
}

export const BulkGeneratorView: React.FC<BulkGeneratorViewProps> = ({
  participants,
  setParticipants,
  selectedIds,
  config,
  setActiveTab,
  highlightedElementId,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState({ count: 0, total: 0 });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [previewParticipant, setPreviewParticipant] = useState<Participant | null>(null);
  const [verifyingParticipant, setVerifyingParticipant] = useState<Participant | null>(null);

  // Filter participants to process
  const targetParticipants =
    selectedIds.length > 0
      ? participants.filter((p) => selectedIds.includes(p.id))
      : participants.filter((p) => p.status === 'To be printed');

  const startBatchProcess = () => {
    setIsProcessing(true);
    setCurrentIndex(0);
    setCompletedIds([]);
  };

  const handleExportZip = async () => {
    if (targetParticipants.length === 0) return;
    setIsExportingZip(true);
    try {
      await exportCertificatesZip(targetParticipants, config, (count, total) => {
        setZipProgress({ count, total });
      });
    } catch (err) {
      console.error('Export ZIP error:', err);
    } finally {
      setIsExportingZip(false);
    }
  };

  useEffect(() => {
    if (!isProcessing) return;

    if (currentIndex < targetParticipants.length) {
      const timer = setTimeout(() => {
        const currentItem = targetParticipants[currentIndex];
        setCompletedIds((prev) => [...prev, currentItem.id]);

        // Update main state status to Printed
        setParticipants((prev) =>
          prev.map((p) =>
            p.id === currentItem.id
              ? {
                  ...p,
                  status: 'Printed',
                  emailStatus: p.email ? 'To Send' : 'Missing Email',
                }
              : p
          )
        );

        setCurrentIndex((prev) => prev + 1);
      }, 700);

      return () => clearTimeout(timer);
    } else {
      setIsProcessing(false);
      triggerConfetti();
    }
  }, [isProcessing, currentIndex, targetParticipants, setParticipants]);

  const progressPercentage =
    targetParticipants.length > 0
      ? Math.round((completedIds.length / targetParticipants.length) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-black/60 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-orange-500/10 text-orange-400 p-2 rounded-lg border border-orange-500/20">
              <Cpu className="w-5 h-5 text-orange-400" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight uppercase">
              Automated Bulk Certificate Generator
            </h2>
            <span className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              High-Speed PDF Engine
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            Batch render high-resolution certificate PDFs for all selected participants automatically.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={startBatchProcess}
            disabled={isProcessing || targetParticipants.length === 0}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer ${
              isProcessing
                ? 'bg-orange-500/50 text-white cursor-wait'
                : 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white'
            }`}
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" /> Rendering Batch...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" /> Start Bulk Generation ({targetParticipants.length})
              </>
            )}
          </button>

          <button
            onClick={handleExportZip}
            disabled={isExportingZip || targetParticipants.length === 0}
            className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
            title="Export all rendered certificates into a compressed ZIP file"
          >
            {isExportingZip ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Zipping ({zipProgress.count}/{zipProgress.total})...</span>
              </>
            ) : (
              <>
                <FolderArchive className="w-4 h-4 text-emerald-400" />
                <span>Download All (ZIP)</span>
              </>
            )}
          </button>

          <button
            onClick={() => setActiveTab('dispatch')}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-neutral-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-white/10 transition-colors cursor-pointer"
          >
            <span>Go to Dispatch</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Dashboard */}
      <div
        id="batch-progress"
        className={`bg-black/80 backdrop-blur-md text-white rounded-2xl p-6 shadow-xl border transition-all ${
          highlightedElementId === 'batch-progress'
            ? 'ring-4 ring-orange-500/80 border-orange-500 bg-black/90 shadow-[0_0_20px_rgba(249,115,22,0.3)]'
            : 'border-white/10'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
              Batch Rendering Pipeline Status
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight mt-0.5">
              {completedIds.length} of {targetParticipants.length} Certificates Rendered
            </div>
          </div>

          <div className="text-right">
            <span className="text-3xl font-extrabold text-orange-400 font-mono">
              {progressPercentage}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden p-0.5 border border-white/10">
          <div
            className="bg-gradient-to-r from-orange-500 via-red-500 to-emerald-400 h-full rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(249,115,22,0.5)]"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-3">
          <span>Engine: High-Performance Canvas-to-PDF Vector Renderer</span>
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <Sparkles className="w-3 h-3" /> Auto Syncing with Google Sheet
          </span>
        </div>
      </div>

      {/* Generated Cards Gallery */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-400" /> Generated Certificates Gallery
          </h3>
          <span className="text-xs text-neutral-400 font-medium">
            Click any certificate to expand full high-res preview
          </span>
        </div>

        {targetParticipants.length === 0 ? (
          <div className="bg-black/60 rounded-2xl p-8 text-center text-neutral-500 border border-white/10">
            No pending certificates to print. Select records in the Spreadsheet tab or click "Start Bulk Generation".
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {targetParticipants.map((participant) => {
              const isDone = completedIds.includes(participant.id);

              return (
                <div
                  key={participant.id}
                  className={`bg-black/60 backdrop-blur-md rounded-2xl p-4 border transition-all shadow-xl relative flex flex-col justify-between ${
                    isDone
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-white/10 opacity-70'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-bold text-white text-sm">{participant.name}</div>
                      <div className="text-[11px] text-neutral-400">
                        {participant.skillName} • {participant.level}
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                        isDone
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}
                    >
                      {isDone ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Rendered
                        </>
                      ) : (
                        'Pending...'
                      )}
                    </span>
                  </div>

                  {/* Thumbnail Card Preview */}
                  <div className="relative group bg-neutral-900 rounded-xl overflow-hidden p-2 border border-white/10 my-2 flex items-center justify-center">
                    <CertificateCard
                      participant={participant}
                      config={config}
                      scale={0.42}
                      onVerify={() => setVerifyingParticipant(participant)}
                    />

                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-wrap items-center justify-center gap-2 p-2">
                      <button
                        onClick={() => setPreviewParticipant(participant)}
                        className="px-2.5 py-1.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl text-xs font-semibold shadow-lg flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Preview
                      </button>

                      <button
                        onClick={() => downloadSingleCertificate(participant, config)}
                        className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-lg flex items-center gap-1 cursor-pointer"
                        title="Download High-Res PNG"
                      >
                        <Download className="w-3.5 h-3.5" /> PNG
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-neutral-400">
                    <span className="font-mono">{participant.certCode}</span>
                    <span className="text-neutral-500">{participant.issueDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expanded Certificate Modal */}
      {previewParticipant && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-950 rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-2xl relative border border-white/10">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Certificate High-Resolution Preview
                </h3>
                <p className="text-xs text-neutral-400">{previewParticipant.name}</p>
              </div>
              <button
                onClick={() => setPreviewParticipant(null)}
                className="text-neutral-400 hover:text-white font-bold text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex justify-center py-2">
              <CertificateCard
                participant={previewParticipant}
                config={config}
                scale={0.9}
                onVerify={() => {
                  const target = previewParticipant;
                  setPreviewParticipant(null);
                  setVerifyingParticipant(target);
                }}
              />
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-white/10">
              <button
                onClick={() => downloadSingleCertificate(previewParticipant, config)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                <Download className="w-4 h-4" /> Download Certificate PNG
              </button>

              <button
                onClick={() => setPreviewParticipant(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-neutral-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Portal Modal */}
      {verifyingParticipant && (
        <VerificationModal
          participant={verifyingParticipant}
          config={config}
          onClose={() => setVerifyingParticipant(null)}
        />
      )}
    </div>
  );
};
