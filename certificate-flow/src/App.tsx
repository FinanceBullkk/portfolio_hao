import { useMemo, useState } from 'react';
import { AppHeader } from './components/Navbar';
import { WorkspaceNav } from './components/FlowStepsNav';
import { ProjectsHub } from './components/SpreadsheetView';
import { ReviewWorkspace } from './components/MappingView';
import { DeliveryPanel } from './components/EmailDispatchView';
import { createInitialBatches } from './data/mockData';
import { CertificateRecord, DeliveryLogEntry, RecordEdits, RecordFilter, WorkspaceSection } from './types';

function isRecordReady(record: CertificateRecord): boolean {
  return Boolean(record.detectedName.trim() && record.certificateCode.trim() && record.email.includes('@'));
}

export default function App() {
  const [batches, setBatches] = useState(createInitialBatches);
  const [activeBatchId, setActiveBatchId] = useState<string>();
  const [section, setSection] = useState<WorkspaceSection>('review');
  const [filter, setFilter] = useState<RecordFilter>('all');
  const [selectedId, setSelectedId] = useState('cert-02');
  const [deliveryLogs, setDeliveryLogs] = useState<Record<string, DeliveryLogEntry[]>>({});
  const [notice, setNotice] = useState('');
  const activeBatch = useMemo(() => batches.find((batch) => batch.id === activeBatchId), [activeBatchId, batches]);
  const activeDeliveryLog = activeBatchId ? deliveryLogs[activeBatchId] ?? [] : [];

  function resetDemo() {
    setBatches(createInitialBatches());
    setActiveBatchId(undefined);
    setSection('review');
    setFilter('all');
    setSelectedId('cert-02');
    setDeliveryLogs({});
    setNotice('Sample data reset.');
  }

  function openBatch(batchId: string) {
    const batch = batches.find((item) => item.id === batchId);
    setActiveBatchId(batchId);
    setSelectedId(batch?.records.find((record) => record.status === 'needs_review')?.id ?? batch?.records[0]?.id ?? '');
    setFilter('all');
    setSection(batch?.records.every((record) => record.status === 'sent') ? 'delivery' : 'review');
    setNotice('');
  }

  function updateRecords(updater: (record: CertificateRecord) => CertificateRecord, invalidateDryRun = false) {
    if (invalidateDryRun && activeBatchId) {
      setDeliveryLogs((current) => ({ ...current, [activeBatchId]: [] }));
    }
    setBatches((current) => current.map((batch) => batch.id === activeBatchId
      ? {
          ...batch,
          records: batch.records.map((record) => {
            const updated = updater(record);
            return invalidateDryRun && updated.deliveryState === 'simulated'
              ? { ...updated, deliveryState: 'not_run' }
              : updated;
          }),
        }
      : batch));
  }

  function applySuggestion(recordId: string) {
    updateRecords((record) => {
      if (record.id !== recordId || record.status === 'sent') return record;
      const matched = { ...record, detectedName: record.rosterName, email: record.email || record.suggestedEmail };
      return { ...matched, confidence: 99, status: isRecordReady(matched) ? 'ready' : 'needs_review' };
    }, true);
    setNotice('Roster match applied. Record is ready for delivery review.');
  }

  function saveRecord(recordId: string, edits: RecordEdits) {
    if (activeBatch?.records.find((record) => record.id === recordId)?.status === 'sent') {
      setNotice('Delivered records are read-only in this demo.');
      return;
    }
    updateRecords((record) => {
      if (record.id !== recordId) return record;
      const edited = { ...record, ...edits };
      return { ...edited, confidence: isRecordReady(edited) ? 100 : record.confidence, status: isRecordReady(edited) ? 'ready' : 'needs_review' };
    }, true);
    setNotice('Review saved. Required fields determine delivery readiness.');
  }

  function autoMatchReviewItems() {
    updateRecords((record) => {
      if (record.status !== 'needs_review') return record;
      const matched = { ...record, detectedName: record.rosterName, email: record.email || record.suggestedEmail };
      return { ...matched, confidence: 99, status: isRecordReady(matched) ? 'ready' : 'needs_review' };
    }, true);
    setNotice('Roster auto-match resolved every review item in this sample batch.');
  }

  function runDryRun() {
    if (!activeBatch) return;
    const readyRecords = activeBatch.records.filter((record) => record.status === 'ready');
    const nextLog = readyRecords.map((record) => ({
      id: record.id,
      recipient: record.detectedName,
      email: record.email,
      status: 'simulated' as const,
      message: 'Validated; no email sent.',
    }));
    setDeliveryLogs((current) => ({ ...current, [activeBatch.id]: nextLog }));
    updateRecords((record) => record.status === 'ready' ? { ...record, deliveryState: 'simulated' } : record);
    setNotice(`Dry-run complete. ${readyRecords.length} emails simulated; zero external requests.`);
  }

  return (
    <div className="app-shell">
      <AppHeader batchTitle={activeBatch?.title} onOpenProjects={() => setActiveBatchId(undefined)} onReset={resetDemo} />
      {activeBatch ? (
        <>
          <WorkspaceNav activeSection={section} onChange={setSection} />
          {section === 'review' ? (
            <ReviewWorkspace batch={activeBatch} filter={filter} selectedId={selectedId} onFilterChange={setFilter} onSelect={setSelectedId} onApplySuggestion={applySuggestion} onAutoMatch={autoMatchReviewItems} onSave={saveRecord} />
          ) : <DeliveryPanel batch={activeBatch} deliveryLog={activeDeliveryLog} onRunDryRun={runDryRun} />}
        </>
      ) : <ProjectsHub batches={batches} onOpenBatch={openBatch} />}
      <div className="toast" aria-live="polite" hidden={!notice}>{notice}</div>
    </div>
  );
}
