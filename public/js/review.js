const queue = document.getElementById('queue');
const statusEl = document.getElementById('admin-status');
const loginForm = document.getElementById('login-form');
const controls = document.getElementById('admin-controls');
const dialog = document.getElementById('edit-dialog');
const editForm = document.getElementById('edit-form');
let filter = 'pending';
let events = [];
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

async function api(path, method = 'GET', data) {
  const response = await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || `Request failed (${response.status})`);
  return result;
}
async function perform(action) {
  try { await action(); }
  catch (error) {
    statusEl.textContent = error.message;
    document.getElementById('edit-status').textContent = error.message;
  }
}
async function load() {
  events = await api('/api/events?' + new URLSearchParams({ status: filter }));
  queue.innerHTML = events.length ? events.map(event => `
    <article class="card">
      <h3>${esc(event.title)}</h3>
      <p class="meta">${esc(event.start_time.replace('T', ' '))} · ${esc(event.location)} · ${esc(event.category)}</p>
      <p>${esc(event.description)}</p>
      <p>${esc(event.source_name)} ${/^https?:\/\//.test(event.source_url) ? `<a href="${esc(event.source_url)}" target="_blank" rel="noopener">Original listing</a>` : ''}</p>
      ${event.review_notes ? `<p>Review notes — ${esc(event.review_notes)}</p>` : ''}
      <button data-action="edit" data-id="${event.id}">Edit</button>
      <button data-action="approved" data-id="${event.id}">Approve</button>
      <button data-action="rejected" data-id="${event.id}">Reject</button>
      <button data-action="archived" data-id="${event.id}">Archive</button>
    </article>`).join('') : '<p>No events in this view.</p>';
  document.querySelectorAll('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === filter)));
  await loadImports();
}
async function loadImports() {
  const { changes, runs } = await api('/api/imports');
  const container = document.getElementById('imports');
  container.replaceChildren();
  for (const change of changes) {
    const card = document.createElement('article');
    card.className = 'card';
    const proposed = JSON.parse(change.proposed);
    const current = await api('/api/events/' + change.event_id);
    card.innerHTML = `<h3>Source update — ${esc(change.title)}</h3><p>Review these values before replacing the listing details.</p><table><thead><tr><th>Field</th><th>Current</th><th>Source proposes</th></tr></thead><tbody>${Object.keys(proposed).filter(key => (current[key] ?? null) !== proposed[key]).map(key => `<tr><th>${esc(key.replaceAll('_', ' '))}</th><td>${esc(current[key])}</td><td>${esc(proposed[key])}</td></tr>`).join('')}</tbody></table>`;
    for (const accept of [true, false]) {
      const button = document.createElement('button');
      button.textContent = accept ? 'Accept source details' : 'Keep current details';
      button.addEventListener('click', () => perform(async () => {
        await api('/api/imports/resolve', 'POST', { ...change, accept });
        await load();
      }));
      card.append(button);
    }
    container.append(card);
  }
  document.getElementById('scrape-runs').textContent = runs.map(run => `${run.source_name} — ${run.started_at}: ${run.added} added, ${run.updated} updates, ${run.skipped} skipped${run.error ? '. Error: ' + run.error : ''}`).join('\n') || 'No imports have run yet.';
}
async function refreshSession() {
  const { authenticated } = await api('/api/session');
  loginForm.hidden = authenticated;
  controls.hidden = !authenticated;
  queue.replaceChildren();
  if (authenticated) await load();
}
loginForm.addEventListener('submit', event => {
  event.preventDefault();
  perform(async () => {
    await api('/api/session', 'POST', { password: new FormData(loginForm).get('password') });
    loginForm.reset();
    statusEl.textContent = 'Signed in.';
    await refreshSession();
  });
});
document.getElementById('logout').addEventListener('click', () => perform(async () => {
  await api('/api/session', 'DELETE', {});
  await refreshSession();
  statusEl.textContent = 'Signed out.';
}));
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => perform(async () => {
  filter = button.dataset.filter;
  await load();
})));
queue.addEventListener('click', event => perform(async () => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const selected = events.find(item => item.id === Number(button.dataset.id));
  if (button.dataset.action === 'edit') {
    for (const input of editForm.elements) {
      if (input.name) input.value = selected[input.name] ?? '';
    }
    document.getElementById('edit-status').textContent = '';
    dialog.showModal();
    return;
  }
  let notes = '';
  if (button.dataset.action === 'rejected') {
    notes = prompt('Reason for rejecting this event (optional)');
    if (notes === null) return;
  }
  await api(`/api/events/${selected.id}/review`, 'POST', { status: button.dataset.action, notes });
  await load();
}));
editForm.addEventListener('submit', event => {
  event.preventDefault();
  perform(async () => {
    const data = Object.fromEntries(new FormData(editForm));
    await api('/api/events/' + data.id, 'PUT', data);
    dialog.close();
    statusEl.textContent = 'Changes saved.';
    await load();
  });
});
document.getElementById('cancel-edit').addEventListener('click', () => dialog.close());
document.getElementById('archive-past-btn').addEventListener('click', () => perform(async () => {
  const result = await api('/api/events/archive-past', 'POST', {});
  statusEl.textContent = `${result.archived} events archived.`;
  await load();
}));
perform(refreshSession);
