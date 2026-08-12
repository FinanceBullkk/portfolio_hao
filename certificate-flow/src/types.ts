export interface Participant {
  id: string;
  name: string;
  subCompany: 'MOC' | 'LRU' | 'CHORUS' | 'FPT' | 'HRD';
  category: 'Soft Skill' | 'Hard Skill';
  subCategory: string;
  skillName: string;
  level: 'Level 1' | 'Level 2' | 'Level 3' | 'Beginner' | 'Intermediate' | 'Expert';
  issueDate: string;
  status: 'To be printed' | 'Printed';
  certCode: string;
  email: string;
  emailStatus: 'Sent' | 'To Send' | 'Missing Email' | 'Sending...';
  askCert: 'Yes' | 'No';
}

export interface CertTemplateConfig {
  organizationLogo: string;
  organizationName: string;
  title: string;
  subtitle: string;
  accentColor: string;
  themeStyle: 'classic_purple' | 'modern_emerald' | 'gold_executive' | 'navy_blue';
  signatoryName: string;
  signatoryTitle: string;
  showQrCode: boolean;
  borderPattern: 'geometric' | 'minimal' | 'formal';
}

export interface BatchProcessingStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  startTime?: number;
  endTime?: number;
}

export type ActiveTab = 'spreadsheets' | 'template' | 'mapping' | 'generator' | 'dispatch' | 'demo_player';

export interface DemoStep {
  id: number;
  tab: ActiveTab;
  title: string;
  subtitle: string;
  narrationVi: string;
  narrationEn: string;
  featureKey: string;
  targetHighlight?: string;
}
