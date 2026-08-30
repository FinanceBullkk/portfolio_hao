(function () {
  var root = document.querySelector('[data-tms-demo]');
  if (!root) return;

  var initialLearners = [
    { id: 'L-104', name: 'Demo Learner 01', course: 'Data privacy basics', owner: 'L&D', progress: 72, status: 'In progress' },
    { id: 'L-118', name: 'Demo Learner 02', course: 'English foundation', owner: 'Team lead', progress: 100, status: 'Complete' },
    { id: 'L-127', name: 'Demo Learner 03', course: 'Manager essentials', owner: 'HR', progress: 38, status: 'Needs review' },
    { id: 'L-133', name: 'Demo Learner 04', course: 'Communication skills', owner: 'L&D', progress: 12, status: 'Not started' }
  ];
  var initialSlots = [
    { id: 'S-01', title: 'Data privacy / cohort A', meta: 'Tue 03 Sep · 09:00 · Room 2B', seats: 8, total: 12 },
    { id: 'S-02', title: 'Manager essentials / cohort B', meta: 'Thu 05 Sep · 14:00 · Online', seats: 3, total: 10 },
    { id: 'S-03', title: 'English foundation / cohort C', meta: 'Fri 06 Sep · 10:30 · Room 1A', seats: 0, total: 8 },
    { id: 'S-04', title: 'Communication skills / cohort A', meta: 'Mon 09 Sep · 13:30 · Room 3C', seats: 6, total: 12 }
  ];
  var state = { view: 'overview', learners: clone(initialLearners), slots: clone(initialSlots), logs: [{ time: '09:42', text: 'Demo workspace loaded from synthetic records.' }] };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, function (char) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]; }); }
  function addLog(text) {
    var now = new Date();
    var time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    state.logs.unshift({ time: time, text: text });
    state.logs = state.logs.slice(0, 8);
    var live = root.querySelector('[data-tms-live]');
    if (live) live.textContent = text;
  }
  function setView(view) {
    state.view = view;
    root.querySelectorAll('[data-tms-view]').forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.tmsView === view)); });
    root.querySelectorAll('[data-tms-panel]').forEach(function (panel) { panel.hidden = panel.dataset.tmsPanel !== view; });
    var title = root.querySelector('[data-tms-title]');
    if (title) title.textContent = view.charAt(0).toUpperCase() + view.slice(1);
    render();
  }
  function renderOverview() {
    var complete = state.learners.filter(function (learner) { return learner.status === 'Complete'; }).length;
    var needsReview = state.learners.filter(function (learner) { return learner.status === 'Needs review'; }).length;
    var kpis = root.querySelector('[data-tms-kpis]');
    if (kpis) kpis.innerHTML = '<div class="demo-kpi"><small>Learners in sample</small><strong>' + state.learners.length + '</strong><em>synthetic records</em></div><div class="demo-kpi"><small>Completion gates</small><strong>' + Math.round(state.learners.reduce(function (sum, learner) { return sum + learner.progress; }, 0) / state.learners.length) + '%</strong><em>' + complete + ' complete</em></div><div class="demo-kpi"><small>Needs attention</small><strong>' + needsReview + '</strong><em>reviewable states</em></div>';
    var list = root.querySelector('[data-tms-attention]');
    if (list) list.innerHTML = state.learners.filter(function (learner) { return learner.status !== 'Complete'; }).slice(0, 3).map(function (learner) { return '<div class="demo-list-row"><div><strong>' + escapeHtml(learner.name) + '</strong><span>' + escapeHtml(learner.course) + ' · ' + escapeHtml(learner.owner) + '</span></div><span class="demo-status">' + escapeHtml(learner.status) + '</span><button class="demo-action-link" data-tms-action="open-learners">Open →</button></div>'; }).join('');
  }
  function renderLearners() {
    var query = (root.querySelector('[data-tms-search]')?.value || '').toLowerCase();
    var filter = root.querySelector('[data-tms-filter]')?.value || 'All';
    var rows = state.learners.filter(function (learner) { return (!query || (learner.name + learner.course + learner.id).toLowerCase().includes(query)) && (filter === 'All' || learner.status === filter); });
    var body = root.querySelector('[data-tms-rows]');
    if (!body) return;
    body.innerHTML = rows.length ? rows.map(function (learner) { return '<tr><td><strong>' + escapeHtml(learner.name) + '</strong><br><small>' + learner.id + '</small></td><td>' + escapeHtml(learner.course) + '</td><td><div class="demo-progress" aria-label="' + learner.progress + '% complete"><span style="width:' + learner.progress + '%"></span></div></td><td><span class="demo-status">' + escapeHtml(learner.status) + '</span></td><td>' + (learner.status === 'Complete' ? '<button disabled>Complete</button>' : '<button data-tms-action="complete" data-learner-id="' + learner.id + '">Mark complete</button>') + '</td></tr>'; }).join('') : '<tr><td colspan="5">No learners match this view.</td></tr>';
  }
  function renderSchedule() {
    var grid = root.querySelector('[data-tms-slots]');
    if (!grid) return;
    grid.innerHTML = state.slots.map(function (slot) { return '<article class="demo-slot"><strong>' + escapeHtml(slot.title) + '</strong><p>' + escapeHtml(slot.meta) + '</p><p><b>' + slot.seats + '</b> seats open / ' + slot.total + '</p><button data-tms-action="reserve" data-slot-id="' + slot.id + '" ' + (slot.seats === 0 ? 'disabled' : '') + '>' + (slot.seats === 0 ? 'Full' : 'Reserve seat') + '</button></article>'; }).join('');
  }
  function renderAudit() {
    var log = root.querySelector('[data-tms-log]');
    if (log) log.innerHTML = state.logs.map(function (entry) { return '<div class="demo-log-row"><time>' + escapeHtml(entry.time) + '</time><span>' + escapeHtml(entry.text) + '</span></div>'; }).join('');
  }
  function render() { renderOverview(); renderLearners(); renderSchedule(); renderAudit(); }

  root.addEventListener('click', function (event) {
    var target = event.target.closest('[data-tms-action], [data-tms-view], [data-tms-reset]');
    if (!target) return;
    if (target.dataset.tmsView) { setView(target.dataset.tmsView); return; }
    if (target.dataset.tmsReset !== undefined) { state = { view: 'overview', learners: clone(initialLearners), slots: clone(initialSlots), logs: [{ time: 'now', text: 'Demo workspace reset.' }] }; setView('overview'); return; }
    if (target.dataset.tmsAction === 'open-learners') { setView('learners'); return; }
    if (target.dataset.tmsAction === 'complete') { var learner = state.learners.find(function (item) { return item.id === target.dataset.learnerId; }); if (learner) { learner.progress = 100; learner.status = 'Complete'; addLog(learner.name + ' moved to Complete.'); render(); } return; }
    if (target.dataset.tmsAction === 'reserve') { var slot = state.slots.find(function (item) { return item.id === target.dataset.slotId; }); if (slot && slot.seats > 0) { slot.seats -= 1; addLog('Seat reserved in ' + slot.title + '.'); render(); } }
  });
  root.addEventListener('input', function (event) { if (event.target.matches('[data-tms-search]')) renderLearners(); });
  root.addEventListener('change', function (event) { if (event.target.matches('[data-tms-filter]')) renderLearners(); });
  setView('overview');
})();
