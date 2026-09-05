import { AlertTriangle, CheckCircle2, Files, Send } from 'lucide-react';
import { CertificateRecord } from '../types';

interface BatchMetricsProps {
  records: CertificateRecord[];
}

export function BatchMetrics({ records }: BatchMetricsProps) {
  const metrics = [
    { label: 'Total pages', value: records.length, icon: Files, tone: 'blue' },
    { label: 'Ready to send', value: records.filter((record) => record.status === 'ready').length, icon: CheckCircle2, tone: 'green' },
    { label: 'Needs review', value: records.filter((record) => record.status === 'needs_review').length, icon: AlertTriangle, tone: 'amber' },
    { label: 'Delivered', value: records.filter((record) => record.status === 'sent').length, icon: Send, tone: 'violet' },
  ];

  return (
    <section className="metric-grid" aria-label="Batch status summary">
      {metrics.map(({ label, value, icon: Icon, tone }) => (
        <div className="metric" key={label}>
          <span className={`metric-icon ${tone}`}><Icon aria-hidden="true" /></span>
          <span><small>{label}</small><strong>{value}</strong></span>
        </div>
      ))}
    </section>
  );
}
