import { ClipboardCheck, Send } from 'lucide-react';
import { WorkspaceSection } from '../types';

interface WorkspaceNavProps {
  activeSection: WorkspaceSection;
  onChange: (section: WorkspaceSection) => void;
}

export function WorkspaceNav({ activeSection, onChange }: WorkspaceNavProps) {
  return (
    <nav className="workspace-nav" aria-label="Batch workflow">
      <button
        type="button"
        aria-current={activeSection === 'review' ? 'step' : undefined}
        className={activeSection === 'review' ? 'active' : ''}
        onClick={() => onChange('review')}
      >
        <span className="step-index">01</span>
        <ClipboardCheck aria-hidden="true" />
        <span><strong>Review queue</strong><small>Verify OCR and roster matches</small></span>
      </button>
      <span className="step-line" aria-hidden="true" />
      <button
        type="button"
        aria-current={activeSection === 'delivery' ? 'step' : undefined}
        className={activeSection === 'delivery' ? 'active' : ''}
        onClick={() => onChange('delivery')}
      >
        <span className="step-index">02</span>
        <Send aria-hidden="true" />
        <span><strong>Delivery check</strong><small>Run a safe simulation</small></span>
      </button>
    </nav>
  );
}
