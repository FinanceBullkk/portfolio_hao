import React, { useState } from 'react';
import { Participant, CertTemplateConfig } from '../types';
import { Send, CheckCircle2, Mail, AlertTriangle, RefreshCw, FileText, ExternalLink, ArrowUpRight, Edit3, Sparkles } from 'lucide-react';
import { triggerConfetti } from '../utils/exportUtils';

interface EmailDispatchViewProps {
  participants: Participant[];
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  config: CertTemplateConfig;
  highlightedElementId?: string;
}

export const EmailDispatchView: React.FC<EmailDispatchViewProps> = ({
  participants,
  setParticipants,
  config,
  highlightedElementId,
}) => {
  const [isDispatching, setIsDispatching] = useState(false);
  const [selectedMail, setSelectedMail] = useState<Participant | null>(null);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [emailSubject, setEmailSubject] = useState('Congratulations! Your {{Skill}} Certificate is Ready');
  const [emailBody, setEmailBody] = useState(
    'Dear {{Name}},\n\nCongratulations on achieving {{Skill}} ({{Level}}). We are pleased to award you with this official Certificate of Achievement.\n\nYour certificate details have been registered under code {{CertCode}}.\n\nBest regards,\nCenter for Learning & Talent (CLT)'
  );
  const [testEmailAddress, setTestEmailAddress] = useState('reviewer@example.test');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testSentSuccess, setTestSentSuccess] = useState(false);

  const readyToSend = participants.filter((p) => p.emailStatus === 'To Send');
  const sentList = participants.filter((p) => p.emailStatus === 'Sent');
  const missingEmailList = participants.filter((p) => p.emailStatus === 'Missing Email');

  const handleDispatchAll = () => {
    setIsDispatching(true);

    setTimeout(() => {
      setParticipants((prev) =>
        prev.map((p) =>
          p.emailStatus === 'To Send' && p.email
            ? {
                ...p,
                emailStatus: 'Sent',
                status: 'Printed',
              }
            : p
        )
      );
      setIsDispatching(false);
      triggerConfetti();
    }, 1500);
  };

  const handleSendTestEmail = () => {
    setIsSendingTest(true);
    setTimeout(() => {
      setIsSendingTest(false);
      setTestSentSuccess(true);
      triggerConfetti();
      setTimeout(() => setTestSentSuccess(false), 4000);
    }, 1000);
  };

  const handleFixEmail = (id: string, newEmail: string) => {
    if (!newEmail) return;
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              email: newEmail,
              emailStatus: p.status === 'Printed' ? 'Sent' : 'To Send',
            }
          : p
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-black/60 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg border border-emerald-500/20">
              <Send className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight uppercase">
              Automated Email Dispatch & Sheet Sync
            </h2>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              SMTP / Gmail API
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            Dispatch personalized PDF certificate attachments to employees and write back status to Google Sheets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowTemplateEditor(!showTemplateEditor)}
            className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-neutral-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-white/10 transition-colors cursor-pointer"
          >
            <Edit3 className="w-4 h-4 text-orange-400" />
            <span>Customize Template</span>
          </button>

          <button
            onClick={handleDispatchAll}
            disabled={isDispatching || readyToSend.length === 0}
            className={`px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg transition-all cursor-pointer ${
              isDispatching || readyToSend.length === 0
                ? 'bg-emerald-500/50 text-white cursor-not-allowed opacity-75'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
            }`}
          >
            {isDispatching ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" /> Dispatching Emails...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" /> Dispatch Pending ({readyToSend.length})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Email Template Customizer Drawer */}
      {showTemplateEditor && (
        <div className="bg-black/80 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-orange-400" /> Email Subject & Body Template Editor
            </h3>
            <span className="text-[11px] text-orange-400 font-mono">
              Tags: {'{{Name}}'}, {'{{Skill}}'}, {'{{Level}}'}, {'{{CertCode}}'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-neutral-400 mb-1 font-medium">Email Subject</label>
              <input
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-neutral-400 mb-1 font-medium">Email Body Text</label>
              <textarea
                rows={4}
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="Enter test email address..."
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={handleSendTestEmail}
                  disabled={isSendingTest}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-orange-500/20"
                >
                  {isSendingTest ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  Send Test Email
                </button>
              </div>

              {testSentSuccess && (
                <div className="text-emerald-400 font-semibold text-xs flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Test email sent to {testEmailAddress}!
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-black/60 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center justify-center font-bold text-lg">
            {readyToSend.length}
          </div>
          <div>
            <div className="text-xs text-neutral-400 font-medium">Pending Dispatch</div>
            <div className="text-base font-bold text-white">Ready to Send</div>
          </div>
        </div>

        <div className="bg-black/60 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-lg">
            {sentList.length}
          </div>
          <div>
            <div className="text-xs text-neutral-400 font-medium">Successfully Sent</div>
            <div className="text-base font-bold text-white">Dispatched & Synced</div>
          </div>
        </div>

        <div className="bg-black/60 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center font-bold text-lg">
            {missingEmailList.length}
          </div>
          <div>
            <div className="text-xs text-neutral-400 font-medium">Action Required</div>
            <div className="text-base font-bold text-white">Missing Emails</div>
          </div>
        </div>
      </div>

      {/* Missing Email Alert Section */}
      {missingEmailList.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
            <AlertTriangle className="w-4 h-4 text-rose-400" /> Action Needed: {missingEmailList.length} Employee Record(s) Missing Email Address
          </div>
          <div className="space-y-2">
            {missingEmailList.map((item) => (
              <div key={item.id} className="bg-black/60 p-3 rounded-xl border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="font-bold text-white text-xs">{item.name}</span>
                  <span className="text-neutral-400 text-xs ml-2">({item.subCompany} • {item.skillName})</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    placeholder="Enter email e.g. reviewer@example.test"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleFixEmail(item.id, e.currentTarget.value);
                      }
                    }}
                    className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="text-[10px] text-neutral-500">Press Enter to save</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email Delivery Audit Table */}
      <div
        id="dispatch-dashboard"
        className={`bg-black/60 backdrop-blur-md rounded-2xl shadow-xl border transition-all overflow-hidden ${
          highlightedElementId === 'dispatch-dashboard'
            ? 'ring-4 ring-orange-500/80 border-orange-500 bg-black/90 shadow-[0_0_20px_rgba(249,115,22,0.3)]'
            : 'border-white/10'
        }`}
      >
        <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Mail className="w-4 h-4 text-orange-400" /> Outgoing Email Delivery Log
          </h3>
          <span className="text-xs text-neutral-400">Live Back-Sync with Google Sheets Active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white/5 text-neutral-400 border-b border-white/10 font-semibold uppercase text-[10px] tracking-wider">
                <th className="p-3">Recipient</th>
                <th className="p-3">Email Address</th>
                <th className="p-3">Certificate Code</th>
                <th className="p-3">Attachment File</th>
                <th className="p-3">Dispatch Status</th>
                <th className="p-3 text-right">Preview</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-neutral-300">
              {participants.map((p) => (
                <tr key={p.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-3 font-semibold text-white">{p.name}</td>
                  <td className="p-3 font-mono text-neutral-400">
                    {p.email || <span className="text-rose-400 italic">Not set</span>}
                  </td>
                  <td className="p-3 font-mono text-neutral-400">{p.certCode}</td>
                  <td className="p-3">
                    <span className="inline-flex items-center gap-1 text-orange-400 font-medium bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 text-[11px]">
                      <FileText className="w-3 h-3 text-orange-400" />
                      {p.name.replace(/\s+/g, '_')}_Cert.pdf
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        p.emailStatus === 'Sent'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : p.emailStatus === 'To Send'
                          ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {p.emailStatus === 'Sent' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                      {p.emailStatus}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setSelectedMail(p)}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-neutral-200 rounded-lg text-xs font-medium inline-flex items-center gap-1 cursor-pointer transition-colors border border-white/10"
                    >
                      <span>Preview Email</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Email Preview Modal */}
      {selectedMail && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-950 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative border border-white/10">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">Email Dispatch Preview</h3>
                <p className="text-xs text-neutral-400">To: {selectedMail.email || 'N/A'}</p>
              </div>
              <button
                onClick={() => setSelectedMail(null)}
                className="text-neutral-400 hover:text-white font-bold text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3 text-xs text-neutral-300">
              <div className="border-b border-white/10 pb-2">
                <span className="font-bold text-white">Subject: </span>
                <span>Congratulations! Your {selectedMail.skillName} Certificate is Ready</span>
              </div>

              <div className="space-y-2 leading-relaxed text-neutral-200">
                <p>Dear {selectedMail.name},</p>
                <p>
                  Congratulations on achieving <strong>{selectedMail.skillName} ({selectedMail.level})</strong>.
                  We are pleased to award you with this official Certificate of Achievement.
                </p>
                <p>Your certificate details have been registered under code <strong>{selectedMail.certCode}</strong>.</p>
                <p>Best regards,<br /><strong>Center for Learning & Talent ({config.organizationLogo})</strong></p>
              </div>

              {/* Attachment Pill */}
              <div className="bg-black/60 p-3 rounded-lg border border-orange-500/20 flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-400" />
                  <div>
                    <div className="font-bold text-white">{selectedMail.name.replace(/\s+/g, '_')}_Cert.pdf</div>
                    <div className="text-[10px] text-neutral-400">Official High-Res PDF (Verified)</div>
                  </div>
                </div>
                <span className="text-xs text-orange-400 font-semibold flex items-center gap-0.5">
                  Attached <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedMail(null)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-neutral-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer border border-white/10"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
