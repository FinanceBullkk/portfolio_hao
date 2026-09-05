import { WandSparkles } from 'lucide-react';
import { BatchMetrics } from './BulkGeneratorView';
import { CertificateQueue } from './CertificateCard';
import { CertificateInspector } from './VerificationModal';
import { CertificateBatch, RecordEdits, RecordFilter } from '../types';

interface ReviewWorkspaceProps {
  batch: CertificateBatch;
  filter: RecordFilter;
  selectedId: string;
  onFilterChange: (filter: RecordFilter) => void;
  onSelect: (recordId: string) => void;
  onApplySuggestion: (recordId: string) => void;
  onAutoMatch: () => void;
  onSave: (recordId: string, edits: RecordEdits) => void;
}

export function ReviewWorkspace(props: ReviewWorkspaceProps) {
  const selectedRecord = props.batch.records.find((record) => record.id === props.selectedId) ?? props.batch.records[0];
  const reviewCount = props.batch.records.filter((record) => record.status === 'needs_review').length;

  return (
    <main className="workspace-page">
      <section className="batch-heading">
        <div>
          <span className="eyebrow">{props.batch.eventLabel}</span>
          <h1>{props.batch.title}</h1>
          <p>{props.batch.sourceFile} · {props.batch.records.length} vector PDF pages · uploaded {props.batch.uploadedAt}</p>
        </div>
        <button type="button" className="secondary-button" onClick={props.onAutoMatch} disabled={reviewCount === 0}>
          <WandSparkles aria-hidden="true" />
          {reviewCount ? `Auto-match ${reviewCount} review items` : 'Roster matching complete'}
        </button>
      </section>
      <BatchMetrics records={props.batch.records} />
      <div className="review-layout">
        <CertificateQueue
          records={props.batch.records}
          filter={props.filter}
          selectedId={selectedRecord.id}
          onFilterChange={props.onFilterChange}
          onSelect={props.onSelect}
        />
        <CertificateInspector record={selectedRecord} onApplySuggestion={props.onApplySuggestion} onSave={props.onSave} />
      </div>
    </main>
  );
}
