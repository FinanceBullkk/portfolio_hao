import React, { useState } from 'react';
import { Participant, ActiveTab } from '../types';
import {
  Search,
  Plus,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Edit2,
  Trash2,
  Table,
  CheckSquare,
  Square,
  Download,
  Upload,
  BarChart3,
  X,
  FileSpreadsheet
} from 'lucide-react';
import { exportToCSV, parseCSVText, triggerConfetti } from '../utils/exportUtils';

interface SpreadsheetViewProps {
  participants: Participant[];
  setParticipants: React.Dispatch<React.SetStateAction<Participant[]>>;
  selectedIds: string[];
  setSelectedIds: React.Dispatch<React.SetStateAction<string[]>>;
  setActiveTab: (tab: ActiveTab) => void;
  highlightedElementId?: string;
}

export const SpreadsheetView: React.FC<SpreadsheetViewProps> = ({
  participants,
  setParticipants,
  selectedIds,
  setSelectedIds,
  setActiveTab,
  highlightedElementId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [skillFilter, setSkillFilter] = useState<string>('English Proficiency');
  const [levelFilter, setLevelFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('To be printed');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const imported = parseCSVText(text);
        if (imported.length > 0) {
          setParticipants((prev) => [...imported, ...prev]);
          triggerConfetti();
        }
      }
    };
    reader.readAsText(file);
  };

  // Filtered Participants
  const filteredParticipants = participants.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.certCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSkill = skillFilter === 'All' || p.skillName === skillFilter;
    const matchesLevel = levelFilter === 'All' || p.level === levelFilter;
    const matchesStatus = statusFilter === 'All' || p.status === statusFilter;

    return matchesSearch && matchesSkill && matchesLevel && matchesStatus;
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredParticipants.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredParticipants.map((p) => p.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleUpdateStatus = (id: string, newStatus: 'To be printed' | 'Printed') => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              status: newStatus,
              emailStatus: newStatus === 'Printed' && p.email ? 'Sent' : p.email ? 'To Send' : 'Missing Email',
            }
          : p
      )
    );
  };

  const handleUpdateEmail = (id: string, newEmail: string) => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              email: newEmail,
              emailStatus: newEmail ? (p.status === 'Printed' ? 'Sent' : 'To Send') : 'Missing Email',
            }
          : p
      )
    );
    setEditingId(null);
  };

  const handleAddNewParticipant = () => {
    const newId = `P0${participants.length + 1}`;
    const newCertCode = `C-COM 26.08.0${participants.length + 1}`;
    const newParticipant: Participant = {
      id: newId,
      name: 'Nguyen Van Moi',
      subCompany: 'MOC',
      category: 'Soft Skill',
      subCategory: 'Communication skill',
      skillName: 'English Proficiency',
      level: 'Level 3',
      issueDate: '31 Aug 2026',
      status: 'To be printed',
      certCode: newCertCode,
      email: 'vanmoi.nguyen@company.com',
      emailStatus: 'To Send',
      askCert: 'Yes',
    };
    setParticipants([newParticipant, ...participants]);
    setSelectedIds([newId, ...selectedIds]);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-black/60 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg border border-emerald-500/20">
              <Table className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight uppercase">
              Google Sheet: COPY OF CERT CEREMONY
            </h2>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              Live Synced
            </span>
          </div>
          <p className="text-xs text-neutral-400">
            Source dataset containing employee evaluation records, certificate status, and delivery emails.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <label className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-neutral-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10">
            <Upload className="w-4 h-4 text-sky-400" />
            <span>Import CSV</span>
            <input type="file" accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            onClick={() => exportToCSV(participants)}
            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-neutral-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
            title="Export full dataset to CSV file"
          >
            <Download className="w-4 h-4 text-emerald-400" /> Export CSV
          </button>

          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-neutral-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
          >
            <BarChart3 className="w-4 h-4 text-orange-400" /> Analytics
          </button>

          <button
            onClick={handleAddNewParticipant}
            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 text-neutral-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-white/10"
          >
            <Plus className="w-4 h-4 text-orange-400" /> Add Record
          </button>

          <button
            onClick={() => setActiveTab('template')}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
          >
            <span>Proceed to Cert Template</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        id="spreadsheet-filter-bar"
        className={`bg-black/80 text-neutral-200 p-4 rounded-2xl shadow-xl border transition-all ${
          highlightedElementId === 'spreadsheet-filter-bar'
            ? 'ring-4 ring-orange-500/80 border-orange-500 bg-black/90 shadow-[0_0_20px_rgba(249,115,22,0.3)]'
            : 'border-white/10'
        }`}
      >
        <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-3 flex items-center justify-between">
          <span>Filter & Data Selection Controls</span>
          <span className="text-[11px] text-orange-400 font-normal">
            Showing {filteredParticipants.length} of {participants.length} records
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Skill Filter */}
          <div>
            <label className="block text-[11px] text-neutral-400 mb-1 font-medium">Skill Name</label>
            <select
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="All" className="bg-neutral-900 text-white">All Skills</option>
              <option value="English Proficiency" className="bg-neutral-900 text-white">English Proficiency</option>
              <option value="ALLEGRO System Experience" className="bg-neutral-900 text-white">ALLEGRO System Experience</option>
              <option value="SHIPPBG Business Knowledge" className="bg-neutral-900 text-white">SHIPPBG Business Knowledge</option>
              <option value="Active Listening & Conflict Resolution" className="bg-neutral-900 text-white">Active Listening</option>
            </select>
          </div>

          {/* Level Filter */}
          <div>
            <label className="block text-[11px] text-neutral-400 mb-1 font-medium">Level</label>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="All" className="bg-neutral-900 text-white">All Levels</option>
              <option value="Level 1" className="bg-neutral-900 text-white">Level 1</option>
              <option value="Level 2" className="bg-neutral-900 text-white">Level 2</option>
              <option value="Level 3" className="bg-neutral-900 text-white">Level 3</option>
              <option value="Beginner" className="bg-neutral-900 text-white">Beginner</option>
              <option value="Intermediate" className="bg-neutral-900 text-white">Intermediate</option>
              <option value="Expert" className="bg-neutral-900 text-white">Expert</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] text-neutral-400 mb-1 font-medium">Print Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="All" className="bg-neutral-900 text-white">All Statuses</option>
              <option value="To be printed" className="bg-neutral-900 text-white">To be printed (Pending)</option>
              <option value="Printed" className="bg-neutral-900 text-white">Printed (Completed)</option>
            </select>
          </div>

          {/* Search Box */}
          <div>
            <label className="block text-[11px] text-neutral-400 mb-1 font-medium">Search Name / Code</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Spreadsheet Data Table */}
      <div className="bg-black/60 backdrop-blur-md rounded-2xl shadow-xl border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="text-xs font-semibold text-neutral-200 flex items-center gap-1.5 cursor-pointer hover:text-orange-400"
            >
              {selectedIds.length > 0 && selectedIds.length === filteredParticipants.length ? (
                <CheckSquare className="w-4 h-4 text-orange-500" />
              ) : (
                <Square className="w-4 h-4 text-neutral-500" />
              )}
              Select All ({selectedIds.length} selected)
            </button>
          </div>

          {selectedIds.length > 0 && (
            <button
              onClick={() => setActiveTab('generator')}
              className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-orange-500/20 transition-colors cursor-pointer"
            >
              <span>Bulk Create ({selectedIds.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-white/5 text-neutral-400 border-b border-white/10 font-semibold uppercase text-[10px] tracking-wider">
                <th className="p-3 w-10 text-center">Select</th>
                <th className="p-3">Full Name</th>
                <th className="p-3">Sub Company</th>
                <th className="p-3">Skill & Level</th>
                <th className="p-3">Cert Code</th>
                <th className="p-3">Issue Date</th>
                <th className="p-3">Print Status</th>
                <th className="p-3">Email Address</th>
                <th className="p-3">Email Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-neutral-300">
              {filteredParticipants.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-neutral-500">
                    No matching records found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredParticipants.map((participant) => {
                  const isSelected = selectedIds.includes(participant.id);
                  const isPending = participant.status === 'To be printed';

                  return (
                    <tr
                      key={participant.id}
                      className={`hover:bg-white/5 transition-colors ${
                        isSelected ? 'bg-orange-500/10' : ''
                      }`}
                    >
                      <td className="p-3 text-center">
                        <button
                          onClick={() => toggleSelectOne(participant.id)}
                          className="cursor-pointer text-neutral-500 hover:text-orange-400"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-orange-500" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="p-3 font-semibold text-white">{participant.name}</td>
                      <td className="p-3">
                        <span className="bg-white/5 text-neutral-300 px-2 py-0.5 rounded font-mono text-[11px] font-medium border border-white/10">
                          {participant.subCompany}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-neutral-200">{participant.skillName}</div>
                        <div className="text-[10px] text-orange-400 font-semibold">{participant.level}</div>
                      </td>
                      <td className="p-3 font-mono text-neutral-400">{participant.certCode}</td>
                      <td className="p-3 whitespace-nowrap text-neutral-400">{participant.issueDate}</td>
                      <td className="p-3">
                        <button
                          onClick={() =>
                            handleUpdateStatus(
                              participant.id,
                              isPending ? 'Printed' : 'To be printed'
                            )
                          }
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                            isPending
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                          }`}
                        >
                          {isPending ? (
                            <>
                              <Clock className="w-3 h-3 text-amber-400" /> To be printed
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Printed
                            </>
                          )}
                        </button>
                      </td>
                      <td className="p-3">
                        {editingId === participant.id ? (
                          <input
                            type="email"
                            defaultValue={participant.email}
                            onBlur={(e) => handleUpdateEmail(participant.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleUpdateEmail(participant.id, e.currentTarget.value);
                              }
                            }}
                            autoFocus
                            className="bg-neutral-900 border border-orange-500 rounded px-2 py-0.5 text-xs text-white focus:outline-none ring-2 ring-orange-500/50"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className={participant.email ? 'text-neutral-300' : 'text-rose-400 italic font-medium'}>
                              {participant.email || 'Missing email!'}
                            </span>
                            <button
                              onClick={() => setEditingId(participant.id)}
                              className="text-neutral-500 hover:text-orange-400 cursor-pointer p-0.5"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            participant.emailStatus === 'Sent'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : participant.emailStatus === 'To Send'
                              ? 'bg-sky-500/10 text-sky-400 border-sky-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {participant.emailStatus}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setParticipants(participants.filter((p) => p.id !== participant.id));
                            setSelectedIds(selectedIds.filter((id) => id !== participant.id));
                          }}
                          className="text-neutral-500 hover:text-rose-400 transition-colors p-1 cursor-pointer"
                          title="Delete row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Analytics Modal Drawer */}
      {showAnalytics && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-950 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-white/10 text-white relative">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-orange-400" />
                <h3 className="text-base font-bold text-white uppercase">
                  Sheet Dataset Analytics & Distribution
                </h3>
              </div>
              <button
                onClick={() => setShowAnalytics(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="text-xs text-neutral-400 font-medium">Total Participants</div>
                <div className="text-2xl font-extrabold text-white mt-1">{participants.length}</div>
              </div>

              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="text-xs text-neutral-400 font-medium">Printed / Completed</div>
                <div className="text-2xl font-extrabold text-emerald-400 mt-1">
                  {participants.filter((p) => p.status === 'Printed').length}
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                <div className="text-xs text-neutral-400 font-medium">Missing Email Alerts</div>
                <div className="text-2xl font-extrabold text-rose-400 mt-1">
                  {participants.filter((p) => !p.email).length}
                </div>
              </div>
            </div>

            {/* Distribution by Sub Company */}
            <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
              <div className="text-xs font-bold uppercase text-neutral-300">
                Breakdown by Sub Company
              </div>

              {['MOC', 'LRU', 'CHORUS', 'FPT', 'HRD'].map((company) => {
                const count = participants.filter((p) => p.subCompany === company).length;
                const percentage = participants.length > 0 ? Math.round((count / participants.length) * 100) : 0;

                return (
                  <div key={company} className="space-y-1">
                    <div className="flex justify-between text-xs text-neutral-300">
                      <span className="font-mono font-bold">{company}</span>
                      <span>{count} records ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-orange-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowAnalytics(false)}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-orange-500/20 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
