export type WorkspaceSection = 'review' | 'delivery';

export type CertificateStatus = 'needs_review' | 'ready' | 'sent';

export type DeliveryState = 'not_run' | 'simulated' | 'sent';

export interface CertificateRecord {
  id: string;
  pageNumber: number;
  detectedName: string;
  rosterName: string;
  certificateCode: string;
  email: string;
  suggestedEmail: string;
  confidence: number;
  status: CertificateStatus;
  deliveryState: DeliveryState;
}

export interface CertificateBatch {
  id: string;
  title: string;
  eventLabel: string;
  sourceFile: string;
  uploadedAt: string;
  records: CertificateRecord[];
  lastDryRunAt?: string;
}

export interface RecordEdits {
  detectedName: string;
  certificateCode: string;
  email: string;
}

export type RecordFilter = 'all' | CertificateStatus;

export interface DeliveryLogEntry {
  id: string;
  recipient: string;
  email: string;
  status: 'simulated' | 'blocked';
  message: string;
}
