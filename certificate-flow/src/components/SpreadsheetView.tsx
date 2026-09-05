import { ArrowRight, CheckCircle2, FileStack, Search, ShieldAlert, UploadCloud } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CertificateBatch } from '../types';

interface ProjectsHubProps {
  batches: CertificateBatch[];
  onOpenBatch: (batchId: string) => void;
}

export function ProjectsHub({ batches, onOpenBatch }: ProjectsHubProps) {
  const [query, setQuery] = useState('');
  const visibleBatches = useMemo(
    () => batches.filter((batch) => `${batch.title} ${batch.eventLabel}`.toLowerCase().includes(query.toLowerCase())),
    [batches, query],
  );

  return (
    <main className="projects-page">
      <section className="hub-heading" aria-labelledby="projects-title">
        <div>
          <span className="eyebrow">Synthetic workspace</span>
          <h1 id="projects-title">Certificate projects</h1>
          <p>Open a seeded batch to inspect the split-PDF, OCR matching, human review, and safe delivery workflow.</p>
        </div>
        <label className="search-field">
          <span className="sr-only">Search sample projects</span>
          <Search aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects" />
        </label>
      </section>

      <section className="project-grid" aria-label="Sample certificate projects">
        <article className="upload-card">
          <UploadCloud aria-hidden="true" />
          <div><strong>Upload is disabled here</strong><p>The public demo loads a safe sample PDF. No local file leaves your browser.</p></div>
          <span>Demo boundary</span>
        </article>

        {visibleBatches.map((batch) => {
          const reviewCount = batch.records.filter((record) => record.status === 'needs_review').length;
          const sentCount = batch.records.filter((record) => record.status === 'sent').length;
          const isDelivered = sentCount === batch.records.length;
          return (
            <article className="project-card" key={batch.id}>
              <div className="project-card-top">
                <span className="file-icon"><FileStack aria-hidden="true" /></span>
                <span className={reviewCount ? 'project-state attention' : 'project-state complete'}>
                  {reviewCount ? <ShieldAlert aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
                  {reviewCount ? `${reviewCount} to review` : isDelivered ? 'Delivered' : 'Reviewed'}
                </span>
              </div>
              <div>
                <span className="project-meta">{batch.eventLabel}</span>
                <h2>{batch.title}</h2>
                <p>{batch.sourceFile}</p>
              </div>
              <dl className="project-stats">
                <div><dt>Pages</dt><dd>{batch.records.length}</dd></div>
                <div><dt>Ready</dt><dd>{batch.records.filter((record) => record.status === 'ready').length}</dd></div>
                <div><dt>Sent</dt><dd>{sentCount}</dd></div>
              </dl>
              <button type="button" className="primary-button" onClick={() => onOpenBatch(batch.id)}>
                Open {isDelivered ? 'delivery history' : 'review workspace'} for {batch.title}<ArrowRight aria-hidden="true" />
              </button>
            </article>
          );
        })}
      </section>
    </main>
  );
}
