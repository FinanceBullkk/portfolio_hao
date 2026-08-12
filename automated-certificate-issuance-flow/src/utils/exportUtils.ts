import JSZip from 'jszip';
import confetti from 'canvas-confetti';
import { Participant, CertTemplateConfig } from '../types';

/**
 * Triggers a confetti burst animation for success celebrations
 */
export const triggerConfetti = () => {
  try {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  } catch (e) {
    console.error('Confetti error:', e);
  }
};

/**
 * Renders a certificate on an HTML5 canvas and converts it to a PNG Blob/DataURL
 */
export const renderCertificateToCanvas = async (
  participant: Participant,
  config: CertTemplateConfig
): Promise<HTMLCanvasElement> => {
  const canvas = document.createElement('canvas');
  const width = 1200;
  const height = 848; // 1:1.414 A4 Landscape aspect ratio
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context unavailable');

  // Colors
  const getAccentColor = () => {
    switch (config.themeStyle) {
      case 'modern_emerald': return '#059669';
      case 'gold_executive': return '#d97706';
      case 'navy_blue': return '#2563eb';
      case 'classic_purple': default: return '#7c3aed';
    }
  };
  const accentColor = getAccentColor();

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Outer Border Frame
  ctx.lineWidth = 20;
  ctx.strokeStyle = '#f1f5f9';
  ctx.strokeRect(20, 20, width - 40, height - 40);

  ctx.lineWidth = 3;
  ctx.strokeStyle = accentColor;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  // Corner Accents
  ctx.fillStyle = accentColor;
  ctx.globalAlpha = 0.15;
  // Top-Right corner triangle
  ctx.beginPath();
  ctx.moveTo(width - 180, 0);
  ctx.lineTo(width, 180);
  ctx.lineTo(width, 0);
  ctx.closePath();
  ctx.fill();

  // Bottom-Left corner triangle
  ctx.beginPath();
  ctx.moveTo(0, height - 180);
  ctx.lineTo(180, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  ctx.globalAlpha = 1.0;

  // Header: Organization Logo Badge
  ctx.fillStyle = accentColor;
  ctx.roundRect ? ctx.roundRect(60, 60, 80, 80, 16) : ctx.fillRect(60, 60, 80, 80);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(config.organizationLogo, 100, 100);

  // Header: Organization Name
  ctx.textAlign = 'left';
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(config.organizationName.toUpperCase(), 160, 85);

  ctx.fillStyle = '#059669';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText('✓ OFFICIALLY VERIFIED CREDENTIAL', 160, 115);

  // Header: Certificate Number
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('CERTIFICATE NO.', width - 60, 80);

  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 18px monospace';
  ctx.fillText(participant.certCode || 'C-COM 26.01.000', width - 60, 110);

  // Body: Certificate Title
  ctx.textAlign = 'center';
  ctx.fillStyle = accentColor;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(config.title.toUpperCase(), width / 2, 230);

  // Skill Name
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText(participant.skillName, width / 2, 300);

  // Level Badge
  ctx.fillStyle = '#f3e8ff';
  const badgeWidth = 220;
  ctx.fillRect((width - badgeWidth) / 2, 335, badgeWidth, 38);
  ctx.fillStyle = '#6b21a8';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`★ ${participant.level}`, width / 2, 358);

  // Subtitle
  ctx.fillStyle = '#64748b';
  ctx.font = 'italic 18px serif';
  ctx.fillText(config.subtitle, width / 2, 420);

  // Recipient Name
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 52px serif';
  ctx.fillText(participant.name, width / 2, 500);

  // Underline for Name
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 250, 525);
  ctx.lineTo(width / 2 + 250, 525);
  ctx.stroke();

  // Citation Description
  ctx.fillStyle = '#64748b';
  ctx.font = '16px sans-serif';
  ctx.fillText(
    `For successfully demonstrating competence in ${participant.subCategory} (${participant.category}) within ${participant.subCompany}.`,
    width / 2,
    570
  );

  // Footer: Issue Date
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('DATE ISSUED', 60, 720);
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(participant.issueDate, 60, 748);

  // Footer: Signatory
  ctx.textAlign = 'right';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'italic bold 24px serif';
  ctx.fillText(config.signatoryName, width - 60, 725);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width - 260, 735);
  ctx.lineTo(width - 60, 735);
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(config.signatoryTitle.toUpperCase(), width - 60, 755);

  return canvas;
};

/**
 * Downloads a single participant certificate as a high-resolution PNG
 */
export const downloadSingleCertificate = async (
  participant: Participant,
  config: CertTemplateConfig
) => {
  const canvas = await renderCertificateToCanvas(participant, config);
  const dataUrl = canvas.toDataURL('image/png');
  const filename = `${participant.name.replace(/\s+/g, '_')}_Certificate.png`;

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Packs multiple participant certificates into a downloadable ZIP archive
 */
export const exportCertificatesZip = async (
  participants: Participant[],
  config: CertTemplateConfig,
  onProgress?: (count: number, total: number) => void
) => {
  const zip = new JSZip();
  const folder = zip.folder('Certificates_Collection');

  for (let i = 0; i < participants.length; i++) {
    const p = participants[i];
    const canvas = await renderCertificateToCanvas(p, config);
    const dataUrl = canvas.toDataURL('image/png');
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

    const safeName = p.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    folder?.file(`${safeName}_${p.certCode}.png`, base64Data, { base64: true });

    if (onProgress) {
      onProgress(i + 1, participants.length);
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);

  const link = document.createElement('a');
  link.href = url;
  link.download = `Certificates_Batch_${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  triggerConfetti();
};

/**
 * Exports participants array to a downloadable CSV file
 */
export const exportToCSV = (participants: Participant[]) => {
  const headers = [
    'id',
    'name',
    'subCompany',
    'category',
    'subCategory',
    'skillName',
    'level',
    'issueDate',
    'status',
    'certCode',
    'email',
    'emailStatus',
    'askCert'
  ];

  const rows = participants.map((p) =>
    [
      p.id,
      `"${p.name.replace(/"/g, '""')}"`,
      p.subCompany,
      `"${p.category}"`,
      `"${p.subCategory}"`,
      `"${p.skillName.replace(/"/g, '""')}"`,
      p.level,
      p.issueDate,
      p.status,
      p.certCode,
      p.email,
      p.emailStatus,
      p.askCert
    ].join(',')
  );

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `Certificate_Spreadsheet_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Parses raw CSV text into Participant objects
 */
export const parseCSVText = (csvText: string): Participant[] => {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length <= 1) return [];

  const newParticipants: Participant[] = [];
  const bodyLines = lines.slice(1);

  bodyLines.forEach((line, idx) => {
    // Basic CSV row split handling quotes
    const cols = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
    const cleanCols = cols.map((c) => c.replace(/^"|"$/g, '').trim());

    if (cleanCols.length >= 2) {
      newParticipants.push({
        id: `imp-${Date.now()}-${idx}`,
        name: cleanCols[1] || cleanCols[0] || 'Imported Participant',
        subCompany: (cleanCols[2] as any) || 'MOC',
        category: (cleanCols[3] as any) || 'Soft Skill',
        subCategory: cleanCols[4] || 'Professional Competency',
        skillName: cleanCols[5] || 'Corporate Skills',
        level: (cleanCols[6] as any) || 'Level 1',
        issueDate: cleanCols[7] || new Date().toISOString().slice(0, 10),
        status: (cleanCols[8] as any) || 'To be printed',
        certCode: cleanCols[9] || `C-IMP-${Math.floor(1000 + Math.random() * 9000)}`,
        email: cleanCols[10] || '',
        emailStatus: cleanCols[10] ? 'To Send' : 'Missing Email',
        askCert: 'Yes'
      });
    }
  });

  return newParticipants;
};
