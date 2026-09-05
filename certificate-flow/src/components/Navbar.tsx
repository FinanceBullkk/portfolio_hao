import { Award, FolderKanban, RotateCcw, ShieldCheck } from 'lucide-react';

interface AppHeaderProps {
  batchTitle?: string;
  onOpenProjects: () => void;
  onReset: () => void;
}

export function AppHeader({ batchTitle, onOpenProjects, onReset }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="brand-group">
        <span className="brand-mark" aria-hidden="true"><Award /></span>
        <div>
          <strong>CertStudio</strong>
          <span>Certificate review workspace</span>
        </div>
      </div>

      <nav className="header-nav" aria-label="CertStudio demo navigation">
        <button type="button" className="quiet-button" onClick={onOpenProjects}>
          <FolderKanban aria-hidden="true" />
          <span>Projects</span>
        </button>
        {batchTitle && <span className="current-batch" aria-label={`Current project: ${batchTitle}`}>{batchTitle}</span>}
      </nav>

      <div className="header-actions">
        <span className="sandbox-badge"><ShieldCheck aria-hidden="true" /> Browser-only sandbox</span>
        <button type="button" className="quiet-button" onClick={onReset} aria-label="Reset sample data">
          <RotateCcw aria-hidden="true" />
          <span>Reset</span>
        </button>
      </div>
    </header>
  );
}
