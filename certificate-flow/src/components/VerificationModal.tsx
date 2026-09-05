import { Check, FileText, Sparkles } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { CertificateRecord, RecordEdits } from '../types';

interface CertificateInspectorProps {
  record: CertificateRecord;
  onApplySuggestion: (recordId: string) => void;
  onSave: (recordId: string, edits: RecordEdits) => void;
}

export function CertificateInspector({ record, onApplySuggestion, onSave }: CertificateInspectorProps) {
  const isDelivered = record.status === 'sent';
  const [edits, setEdits] = useState<RecordEdits>({
    detectedName: record.detectedName,
    certificateCode: record.certificateCode,
    email: record.email,
  });

  useEffect(() => {
    setEdits({ detectedName: record.detectedName, certificateCode: record.certificateCode, email: record.email });
  }, [record]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (isDelivered) return;
    onSave(record.id, edits);
  }

  return (
    <aside className="inspector-panel" aria-labelledby="inspector-title">
      <div className="panel-heading">
        <div><span className="eyebrow">{isDelivered ? 'Delivery record' : 'Human review'}</span><h2 id="inspector-title">Certificate inspector</h2></div>
        <span>Page {record.pageNumber}</span>
      </div>

      <div className="certificate-preview" aria-label={`Preview for ${record.detectedName}`}>
        <FileText aria-hidden="true" />
        <span>Certificate of completion</span>
        <strong>{record.detectedName}</strong>
        <small>{record.certificateCode}</small>
      </div>

      {record.status === 'needs_review' && (
        <button type="button" className="suggestion" onClick={() => onApplySuggestion(record.id)}>
          <Sparkles aria-hidden="true" />
          <span><small>Roster suggestion</small><strong>{record.rosterName}</strong><em>{record.suggestedEmail}</em></span>
          <span className="suggestion-action"><Check aria-hidden="true" />Use match</span>
        </button>
      )}

      <form className="inspector-form" onSubmit={handleSubmit}>
        <label><span>Recipient name</span><input value={edits.detectedName} readOnly={isDelivered} onChange={(event) => setEdits({ ...edits, detectedName: event.target.value })} /></label>
        <label><span>Certificate ID</span><input value={edits.certificateCode} readOnly={isDelivered} onChange={(event) => setEdits({ ...edits, certificateCode: event.target.value })} /></label>
        <label><span>Delivery email</span><input type="email" value={edits.email} readOnly={isDelivered} onChange={(event) => setEdits({ ...edits, email: event.target.value })} placeholder="Required before delivery" /></label>
        <div className="confidence-row"><span>OCR confidence</span><strong>{record.confidence}%</strong></div>
        {isDelivered ? (
          <div className="inspector-locked"><Check aria-hidden="true" /><span><strong>Delivery recorded</strong><small>Historical records are read-only in this public demo.</small></span></div>
        ) : <button type="submit" className="primary-button"><Check aria-hidden="true" />Save review</button>}
      </form>
    </aside>
  );
}
