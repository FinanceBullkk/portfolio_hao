import { AlertTriangle, CheckCircle2, MailCheck, Play, ShieldCheck } from 'lucide-react';
import { CertificateBatch, DeliveryLogEntry } from '../types';

interface DeliveryPanelProps {
  batch: CertificateBatch;
  deliveryLog: DeliveryLogEntry[];
  onRunDryRun: () => void;
}

export function DeliveryPanel({ batch, deliveryLog, onRunDryRun }: DeliveryPanelProps) {
  const readyRecords = batch.records.filter((record) => record.status === 'ready');
  const blockedRecords = batch.records.filter((record) => record.status === 'needs_review');
  const sentRecords = batch.records.filter((record) => record.status === 'sent');
  const isHistoricalBatch = sentRecords.length === batch.records.length;

  return (
    <main className="delivery-page">
      <section className="delivery-heading">
        <div><span className="eyebrow">Controlled dispatch</span><h1>Delivery preflight</h1><p>Validate the queue before any certificate email can leave the production system.</p></div>
        <span className="mode-badge"><ShieldCheck aria-hidden="true" />Simulation only</span>
      </section>

      <div className="delivery-layout">
        <section className="preflight-card" aria-labelledby="preflight-title">
          <div className="panel-heading"><div><span className="eyebrow">Preflight</span><h2 id="preflight-title">{batch.title}</h2></div><MailCheck aria-hidden="true" /></div>
          <div className="preflight-summary">
            <div className="preflight-row pass"><CheckCircle2 aria-hidden="true" /><span><strong>{readyRecords.length} certificates ready</strong><small>Names, IDs, and example.test emails are present.</small></span></div>
            <div className={blockedRecords.length ? 'preflight-row block' : 'preflight-row pass'}>
              {blockedRecords.length ? <AlertTriangle aria-hidden="true" /> : <CheckCircle2 aria-hidden="true" />}
              <span><strong>{blockedRecords.length ? `${blockedRecords.length} blocked for review` : 'No review blockers'}</strong><small>{blockedRecords.length ? 'Resolve them in the review queue; they will not be simulated.' : 'Every page passed human review.'}</small></span>
            </div>
            {sentRecords.length > 0 && (
              <div className="preflight-row history"><CheckCircle2 aria-hidden="true" /><span><strong>{sentRecords.length} deliveries already recorded</strong><small>Delivered sample records remain read-only and are excluded from new simulations.</small></span></div>
            )}
          </div>
          <div className="delivery-boundary"><strong>Public demo boundary</strong><p>This action creates an in-memory delivery log. It does not authenticate, call SMTP, upload files, or contact the production API.</p></div>
          <button type="button" className="primary-button run-button" onClick={onRunDryRun} disabled={readyRecords.length === 0}>
            <Play aria-hidden="true" />{isHistoricalBatch ? 'No pending certificates' : 'Run safe delivery simulation'}
          </button>
        </section>

        <section className="delivery-console" aria-labelledby="delivery-console-title" aria-live="polite">
          <div className="panel-heading"><div><span className="eyebrow">Run log</span><h2 id="delivery-console-title">Delivery console</h2></div><span>{deliveryLog.length} entries</span></div>
          {deliveryLog.length === 0 ? (
            <div className="console-empty">
              <span>{isHistoricalBatch ? 'HISTORY' : 'READY'}</span>
              <p>{isHistoricalBatch ? `${sentRecords.length} seeded deliveries are already recorded. Open Review queue to inspect the read-only records.` : 'Run the simulation to produce a recipient-by-recipient audit trail.'}</p>
            </div>
          ) : (
            <div className="log-list">
              <p className="run-result"><CheckCircle2 aria-hidden="true" />Dry-run complete · {deliveryLog.length} emails simulated</p>
              {deliveryLog.map((entry) => (
                <div className="log-entry" key={entry.id}>
                  <span className="log-code">SIM</span>
                  <span><strong>{entry.recipient}</strong><small>{entry.email}</small></span>
                  <em>{entry.message}</em>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
