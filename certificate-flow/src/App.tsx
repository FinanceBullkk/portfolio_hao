import React, { useState } from 'react';
import { Participant, CertTemplateConfig, ActiveTab } from './types';
import { INITIAL_PARTICIPANTS, DEFAULT_TEMPLATE_CONFIG } from './data/mockData';
import { Navbar } from './components/Navbar';
import { FlowStepsNav } from './components/FlowStepsNav';
import { SpreadsheetView } from './components/SpreadsheetView';
import { TemplateEditor } from './components/TemplateEditor';
import { MappingView } from './components/MappingView';
import { BulkGeneratorView } from './components/BulkGeneratorView';
import { EmailDispatchView } from './components/EmailDispatchView';
import { InteractiveDemoPlayer } from './components/InteractiveDemoPlayer';

export default function App() {
  const [participants, setParticipants] = useState<Participant[]>(INITIAL_PARTICIPANTS);
  const [config, setConfig] = useState<CertTemplateConfig>(DEFAULT_TEMPLATE_CONFIG);
  const [activeTab, setActiveTab] = useState<ActiveTab>('spreadsheets');
  const [selectedIds, setSelectedIds] = useState<string[]>(
    INITIAL_PARTICIPANTS.filter((p) => p.status === 'To be printed').map((p) => p.id)
  );
  const [isDemoPlaying, setIsDemoPlaying] = useState<boolean>(false);
  const [highlightedElementId, setHighlightedElementId] = useState<string | undefined>(undefined);

  const handleResetData = () => {
    setParticipants(INITIAL_PARTICIPANTS);
    setConfig(DEFAULT_TEMPLATE_CONFIG);
    setSelectedIds(INITIAL_PARTICIPANTS.filter((p) => p.status === 'To be printed').map((p) => p.id));
    setActiveTab('spreadsheets');
    setIsDemoPlaying(false);
    setHighlightedElementId(undefined);
  };

  const sampleParticipant =
    participants.find((p) => p.name === 'Demo Learner 02') ||
    participants.find((p) => p.name === 'Demo Learner 01') ||
    participants[0];

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-100 font-sans selection:bg-orange-500 selection:text-white flex flex-col">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        participants={participants}
        onResetData={handleResetData}
        onLaunchDemoPlayer={() => setIsDemoPlaying(!isDemoPlaying)}
        isDemoPlaying={isDemoPlaying}
      />

      {/* Interactive Video Demo Player Header overlay if active */}
      {isDemoPlaying && (
        <InteractiveDemoPlayer
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          setHighlightedElementId={setHighlightedElementId}
          onCloseDemo={() => {
            setIsDemoPlaying(false);
            setHighlightedElementId(undefined);
          }}
        />
      )}

      {/* Flow Stage Stepper Navigation Bar */}
      <FlowStepsNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Studio Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'spreadsheets' && (
          <SpreadsheetView
            participants={participants}
            setParticipants={setParticipants}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            setActiveTab={setActiveTab}
            highlightedElementId={highlightedElementId}
          />
        )}

        {activeTab === 'template' && (
          <TemplateEditor
            config={config}
            setConfig={setConfig}
            sampleParticipant={sampleParticipant}
            setActiveTab={setActiveTab}
            highlightedElementId={highlightedElementId}
          />
        )}

        {activeTab === 'mapping' && (
          <MappingView
            participants={participants}
            setActiveTab={setActiveTab}
            highlightedElementId={highlightedElementId}
          />
        )}

        {activeTab === 'generator' && (
          <BulkGeneratorView
            participants={participants}
            setParticipants={setParticipants}
            selectedIds={selectedIds}
            config={config}
            setActiveTab={setActiveTab}
            highlightedElementId={highlightedElementId}
          />
        )}

        {activeTab === 'dispatch' && (
          <EmailDispatchView
            participants={participants}
            setParticipants={setParticipants}
            config={config}
            highlightedElementId={highlightedElementId}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-black/80 backdrop-blur-md text-neutral-500 text-xs py-4 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Center for Learning & Talent (CLT) — FlowStudio Certificate Engine
          </div>
          <div className="text-neutral-600">
            Powered by Google Sheets • Canva Bulk Engine • Email Dispatch API
          </div>
        </div>
      </footer>
    </div>
  );
}
