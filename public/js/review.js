// Review queue. Lists PENDING events so a person can approve or reject them.

const queue = document.getElementById('queue');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function load() {
  const res = await fetch('/api/events?status=pending');
  const events = await res.json();
  if (events.length === 0) { queue.innerHTML = '<p>Nothing to review. Run the scraper to collect more events.</p>'; return; }

  queue.innerHTML = events.map(e => `
    <div class="card">
      <h3>${esc(e.title)}</h3>
      <p class="meta">${esc(e.start_time)} | ${esc(e.location)} | ${esc(e.category)}</p>
      <p>${esc(e.description)}</p>
      <p class="meta">Source: <a href="${esc(e.source_url)}" target="_blank" rel="noopener">${esc(e.source_name)}</a></p>
      <button class="approve" onclick="review(${e.id}, 'approved')">Approve</button>
      <button class="reject" onclick="review(${e.id}, 'rejected')">Reject</button>
    </div>
  `).join('');
  // TODO (Sprint 4): let the reviewer EDIT title, time, location and category before approving
  // TODO (Sprint 4): ask for a reason when rejecting and send it as "notes"
}

async function review(id, status) {
  await fetch(`/api/events/${id}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  load();
}

load();
