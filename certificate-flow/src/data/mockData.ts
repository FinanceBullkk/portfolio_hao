import { CertificateBatch } from '../types';

const seedBatches: CertificateBatch[] = [
  {
    id: 'english-q3-2026',
    title: 'English Proficiency Q3',
    eventLabel: 'Assessment / September 2026',
    sourceFile: 'english-proficiency-q3-demo.pdf',
    uploadedAt: '05 Sep 2026, 08:42',
    records: [
      {
        id: 'cert-01', pageNumber: 1, detectedName: 'Demo Learner 01', rosterName: 'Demo Learner 01',
        certificateCode: 'C-COM-26-09-101', email: 'learner-01@example.test', suggestedEmail: 'learner-01@example.test',
        confidence: 99, status: 'ready', deliveryState: 'not_run',
      },
      {
        id: 'cert-02', pageNumber: 2, detectedName: 'Demo Learner O2', rosterName: 'Demo Learner 02',
        certificateCode: 'C-COM-26-09-102', email: 'learner-02@example.test', suggestedEmail: 'learner-02@example.test',
        confidence: 64, status: 'needs_review', deliveryState: 'not_run',
      },
      {
        id: 'cert-03', pageNumber: 3, detectedName: 'Demo Learner 03', rosterName: 'Demo Learner 03',
        certificateCode: 'C-COM-26-09-103', email: '', suggestedEmail: 'learner-03@example.test',
        confidence: 91, status: 'needs_review', deliveryState: 'not_run',
      },
      {
        id: 'cert-04', pageNumber: 4, detectedName: 'Demo Learner 04', rosterName: 'Demo Learner 04',
        certificateCode: 'C-COM-26-09-104', email: 'learner-04@example.test', suggestedEmail: 'learner-04@example.test',
        confidence: 98, status: 'ready', deliveryState: 'not_run',
      },
      {
        id: 'cert-05', pageNumber: 5, detectedName: 'Demo Learner 05', rosterName: 'Demo Learner 05',
        certificateCode: 'C-COM-26-09-105', email: 'learner-05@example.test', suggestedEmail: 'learner-05@example.test',
        confidence: 97, status: 'ready', deliveryState: 'not_run',
      },
      {
        id: 'cert-06', pageNumber: 6, detectedName: 'Demo Learner 06', rosterName: 'Demo Learner 06',
        certificateCode: 'C-COM-26-09-106', email: 'learner-06@example.test', suggestedEmail: 'learner-06@example.test',
        confidence: 96, status: 'ready', deliveryState: 'not_run',
      },
      {
        id: 'cert-07', pageNumber: 7, detectedName: 'Demo Learner 07', rosterName: 'Demo Learner 07',
        certificateCode: 'C-COM-26-09-107', email: 'learner-07@example.test', suggestedEmail: 'learner-07@example.test',
        confidence: 98, status: 'ready', deliveryState: 'not_run',
      },
    ],
  },
  {
    id: 'facilitator-july-2026',
    title: 'Facilitator Essentials',
    eventLabel: 'Workshop / July 2026',
    sourceFile: 'facilitator-essentials-demo.pdf',
    uploadedAt: '22 Jul 2026, 14:18',
    lastDryRunAt: '22 Jul 2026, 14:31',
    records: Array.from({ length: 5 }, (_, index) => ({
      id: `facilitator-${index + 1}`,
      pageNumber: index + 1,
      detectedName: `Demo Facilitator ${String(index + 1).padStart(2, '0')}`,
      rosterName: `Demo Facilitator ${String(index + 1).padStart(2, '0')}`,
      certificateCode: `FAC-26-07-${String(index + 41).padStart(3, '0')}`,
      email: `facilitator-${String(index + 1).padStart(2, '0')}@example.test`,
      suggestedEmail: `facilitator-${String(index + 1).padStart(2, '0')}@example.test`,
      confidence: 99,
      status: 'sent' as const,
      deliveryState: 'sent' as const,
    })),
  },
];

export function createInitialBatches(): CertificateBatch[] {
  return structuredClone(seedBatches);
}
