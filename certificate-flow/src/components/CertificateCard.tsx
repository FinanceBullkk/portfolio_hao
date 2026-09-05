import { AlertTriangle, CheckCircle2, Search, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CertificateRecord, RecordFilter } from '../types';

interface CertificateQueueProps {
  records: CertificateRecord[];
  filter: RecordFilter;
  selectedId: string;
  onFilterChange: (filter: RecordFilter) => void;
  onSelect: (recordId: string) => void;
}

const filterLabels: Array<{ value: RecordFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'needs_review', label: 'Needs review' },
  { value: 'ready', label: 'Ready' },
  { value: 'sent', label: 'Sent' },
];

function StatusBadge({ record }: { record: CertificateRecord }) {
  if (record.status === 'needs_review') return <span className="status-badge warning"><AlertTriangle />Needs review</span>;
  if (record.status === 'sent') return <span className="status-badge sent"><Send />Sent</span>;
  return <span className="status-badge ready"><CheckCircle2 />Ready</span>;
}

export function CertificateQueue({ records, filter, selectedId, onFilterChange, onSelect }: CertificateQueueProps) {
  const [query, setQuery] = useState('');
  const visibleRecords = useMemo(() => records.filter((record) => {
    const matchesFilter = filter === 'all' || record.status === filter;
    const haystack = `${record.detectedName} ${record.certificateCode} ${record.email}`.toLowerCase();
    return matchesFilter && haystack.includes(query.toLowerCase());
  }), [filter, query, records]);

  return (
    <section className="queue-panel" aria-labelledby="queue-title">
      <div className="panel-heading">
        <div><span className="eyebrow">Split PDF output</span><h2 id="queue-title">Certificate queue</h2></div>
        <span>{visibleRecords.length} shown</span>
      </div>
      <div className="queue-tools">
        <div className="filter-tabs" aria-label="Filter certificates">
          {filterLabels.map((item) => (
            <button
              type="button"
              className={filter === item.value ? 'active' : ''}
              aria-pressed={filter === item.value}
              onClick={() => onFilterChange(item.value)}
              key={item.value}
            >
              {item.label}<span>{item.value === 'all' ? records.length : records.filter((record) => record.status === item.value).length}</span>
            </button>
          ))}
        </div>
        <label className="search-field compact">
          <span className="sr-only">Search certificate records</span><Search aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search records" />
        </label>
      </div>
      <div className="record-list">
        <div className="record-list-head" aria-hidden="true"><span>Page / recipient</span><span>Confidence</span><span>Status</span></div>
        {visibleRecords.length === 0 ? (
          <div className="record-empty">No certificate records match this filter.</div>
        ) : visibleRecords.map((record) => (
          <button
            type="button"
            className={`record-row ${selectedId === record.id ? 'selected' : ''}`}
            aria-label={`Review page ${record.pageNumber}: ${record.detectedName}`}
            aria-pressed={selectedId === record.id}
            onClick={() => onSelect(record.id)}
            key={record.id}
          >
            <span className="record-identity"><b>{String(record.pageNumber).padStart(2, '0')}</b><span><strong>{record.detectedName}</strong><small>{record.certificateCode}</small></span></span>
            <span className={record.confidence < 80 ? 'confidence low' : 'confidence'}>{record.confidence}%</span>
            <StatusBadge record={record} />
          </button>
        ))}
      </div>
    </section>
  );
}
