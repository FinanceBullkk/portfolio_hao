(function () {
  var root = document.querySelector('[data-recruitment-demo]');
  if (!root) return;
  var stages = ['New', 'Review', 'Interview', 'Handoff'];
  var initialCandidates = [
    { id: 'C-104', name: 'Demo Candidate 01', role: 'Automation intern', source: 'Referral', owner: 'Hao' },
    { id: 'C-118', name: 'Demo Candidate 02', role: 'Operations analyst', source: 'Website', owner: 'L&D' },
    { id: 'C-127', name: 'Demo Candidate 03', role: 'Product support', source: 'LinkedIn', owner: 'Hiring team' },
    { id: 'C-133', name: 'Demo Candidate 04', role: 'Data coordinator', source: 'Referral', owner: 'Hao' }
  ].map(function (candidate, index) { candidate.stage = stages[index % stages.length]; return candidate; });
  var state = { candidates: clone(initialCandidates), query: '', view: 'pipeline', message: 'Automation mapped 4 fields → New.' };

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, function (char) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]; }); }
  function announce(message) { state.message = message; var live = root.querySelector('[data-recruitment-live]'); if (live) live.textContent = message; }
  function filtered() { return state.candidates.filter(function (candidate) { return !state.query || (candidate.name + candidate.role + candidate.source + candidate.id).toLowerCase().includes(state.query.toLowerCase()); }); }
  function renderKpis() {
    var kpis = root.querySelector('[data-recruitment-kpis]');
    if (!kpis) return;
    var interview = state.candidates.filter(function (candidate) { return candidate.stage === 'Interview'; }).length;
    var handoff = state.candidates.filter(function (candidate) { return candidate.stage === 'Handoff'; }).length;
    kpis.innerHTML = '<div class="demo-kpi"><small>Records in sample</small><strong>' + state.candidates.length + '</strong><em>synthetic intake</em></div><div class="demo-kpi"><small>Interview queue</small><strong>' + interview + '</strong><em>ready for handoff</em></div><div class="demo-kpi"><small>Handed over</small><strong>' + handoff + '</strong><em>owner assigned</em></div>';
  }
  function renderBoard() {
    var board = root.querySelector('[data-recruitment-board]');
    if (!board) return;
    var candidates = filtered();
    board.innerHTML = stages.map(function (stage) {
      var items = candidates.filter(function (candidate) { return candidate.stage === stage; });
      return '<section class="recruitment-column" aria-labelledby="stage-' + stage.toLowerCase() + '"><div class="recruitment-column-head"><strong id="stage-' + stage.toLowerCase() + '">' + stage + '</strong><span>' + items.length + '</span></div><div class="candidate-stack">' + (items.length ? items.map(renderCard).join('') : '<p class="demo-empty">No records</p>') + '</div></section>';
    }).join('');
  }
  function renderCard(candidate) {
    return '<article class="candidate-card"><strong>' + escapeHtml(candidate.name) + '</strong><p>' + escapeHtml(candidate.role) + '</p><small>' + escapeHtml(candidate.id) + ' · ' + escapeHtml(candidate.source) + '</small><label><span class="sr-only">Move ' + escapeHtml(candidate.name) + '</span><select data-candidate-id="' + candidate.id + '">' + stages.map(function (stage) { return '<option ' + (stage === candidate.stage ? 'selected' : '') + '>' + stage + '</option>'; }).join('') + '</select></label></article>';
  }
  function render() { renderKpis(); renderBoard(); var input = root.querySelector('[data-recruitment-search]'); if (input && input.value !== state.query) input.value = state.query; }

  root.addEventListener('input', function (event) { if (event.target.matches('[data-recruitment-search]')) { state.query = event.target.value; renderBoard(); } });
  root.addEventListener('change', function (event) {
    if (!event.target.matches('[data-candidate-id]')) return;
    var candidate = state.candidates.find(function (item) { return item.id === event.target.dataset.candidateId; });
    if (!candidate) return;
    candidate.stage = event.target.value;
    announce(candidate.name + ' moved to ' + candidate.stage + '.');
    render();
  });
  root.addEventListener('click', function (event) {
    var target = event.target.closest('[data-recruitment-view], [data-recruitment-reset]');
    if (!target) return;
    if (target.dataset.recruitmentView) {
      state.view = target.dataset.recruitmentView;
      root.querySelectorAll('[data-recruitment-panel]').forEach(function (panel) { panel.hidden = panel.dataset.recruitmentPanel !== state.view; });
      root.querySelectorAll('[data-recruitment-view]').forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.recruitmentView === state.view)); });
      return;
    }
    if (target.dataset.recruitmentReset !== undefined) { state.candidates = clone(initialCandidates); state.query = ''; announce('Demo workspace reset.'); render(); }
  });
  var form = root.querySelector('[data-recruitment-form]');
  if (form) form.addEventListener('submit', function (event) {
    event.preventDefault();
    var data = new FormData(form);
    var name = String(data.get('name') || '').trim();
    var role = String(data.get('role') || '').trim();
    var source = String(data.get('source') || 'Website');
    if (!name || !role) { announce('Add a name and role to create a record.'); return; }
    var id = 'C-' + String(140 + state.candidates.length).padStart(3, '0');
    state.candidates.unshift({ id: id, name: name, role: role, source: source, owner: 'Hao', stage: 'New' });
    form.reset(); announce('Mapped ' + name + ' → New.'); render();
  });
  render();
})();
