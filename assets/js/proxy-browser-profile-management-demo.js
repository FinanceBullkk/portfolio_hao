const initialState = () => ({
  proxy: 'unchecked',
  bound: false,
  relay: 'authorized',
  ticket: false,
  launched: false,
  audit: [],
});

let state = initialState();
let sequence = 0;

const labels = {
  proxy: { unchecked: ['Not checked', 'pending'], available: ['Available', 'ready'] },
  binding: { false: ['Not bound', 'pending'], true: ['Bound', 'ready'] },
  relay: { authorized: ['Authorized', 'ready'], revoked: ['Revoked', 'blocked'] },
  launch: { false: ['Locked', 'pending'], true: ['Running', 'ready'] },
};

const byId = (id) => document.getElementById(id);

function addAudit(action, result, code) {
  sequence += 1;
  state.audit.unshift({ time: `T+${String(sequence).padStart(2, '0')}`, action, result, code });
}

function setStatus(id, [label, tone]) {
  const node = byId(id);
  node.textContent = label;
  node.dataset.tone = tone;
}

function renderAudit() {
  const log = byId('audit-log');
  if (!state.audit.length) {
    log.innerHTML = '<p class="ops-empty">No actions yet. The public demo records only sanitised event codes.</p>';
    return;
  }
  log.innerHTML = state.audit.map((entry) => `
    <div class="ops-log-row">
      <time>${entry.time}</time>
      <strong>${entry.action} · ${entry.result}</strong>
      <span>${entry.code}</span>
    </div>`).join('');
}

function render(message = '') {
  setStatus('proxy-status', labels.proxy[state.proxy]);
  setStatus('binding-status', labels.binding[String(state.bound)]);
  setStatus('relay-status', labels.relay[state.relay]);
  setStatus('launch-status', labels.launch[String(state.launched)]);

  byId('bind-profile').disabled = state.proxy !== 'available' || state.bound;
  byId('issue-handoff').disabled = !state.bound || state.ticket;
  byId('launch-profile').disabled = !state.ticket || state.relay !== 'authorized' || state.launched;
  byId('revoke-relay').disabled = state.relay === 'revoked';

  byId('binding-value').textContent = state.bound ? 'BOUND-DEMO-14' : 'Not assigned';
  byId('handoff-value').textContent = state.ticket ? 'Sealed · scoped' : 'Not issued';
  byId('profile-value').textContent = state.launched ? 'PROFILE-DEMO-14' : state.bound ? 'Ready to create' : 'Not created';

  const completed = [state.proxy === 'available', state.bound, state.ticket, state.launched, state.audit.length > 0];
  document.querySelectorAll('.ops-step').forEach((step, index) => { step.dataset.complete = String(completed[index]); });
  renderAudit();
  byId('demo-live').textContent = message;
}

const actions = {
  checkProxy() {
    state.proxy = 'available';
    addAudit('proxy.check', 'allowed', 'PROXY_AVAILABLE');
    render('Synthetic endpoint is available. Binding is now permitted.');
  },
  bindProfile() {
    state.bound = true;
    addAudit('profile.bind', 'allowed', 'OWNERSHIP_BOUND');
    render('Account, endpoint, owner, and Relay PC are bound as one assignment.');
  },
  issueHandoff() {
    if (state.relay === 'revoked') {
      addAudit('handoff.issue', 'denied', 'RELAY_RECIPIENT_REVOKED');
      render('Handoff denied: the assigned Relay PC is revoked. No ticket was issued.');
      return;
    }
    state.ticket = true;
    addAudit('handoff.issue', 'allowed', 'SCOPED_HANDOFF_ISSUED');
    render('Scoped handoff issued to the assigned Relay PC. Secret material stays hidden.');
  },
  launchProfile() {
    state.launched = true;
    addAudit('profile.launch', 'allowed', 'LOCAL_PROFILE_READY');
    render('Local profile launched. Sign-in remains a human-controlled step on the assigned PC.');
  },
  revokeRelay() {
    state.relay = 'revoked';
    state.ticket = false;
    state.launched = false;
    addAudit('relay.revoke', 'allowed', 'DEVICE_ACCESS_REVOKED');
    render('Relay PC revoked. New handoffs and profile launches now fail closed.');
  },
  reset() {
    state = initialState();
    sequence = 0;
    render('Demo reset. No state was persisted.');
  },
};

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  actions[button.dataset.action]?.();
});

render();
