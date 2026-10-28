// Event details page. Reads ?id= from the URL and asks the API for that event.

const id = new URLSearchParams(window.location.search).get('id');
const box = document.getElementById('event');

// Escape text before putting it in HTML, because scraped text can contain anything
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function load() {
  const res = await fetch('/api/events/' + id);
  if (!res.ok) { box.textContent = 'Event not found.'; return; }
  const e = await res.json();
  box.innerHTML = `
    <h2>${esc(e.title)}</h2>
    <p class="meta">${esc(new Date(e.start_time).toLocaleString())} at ${esc(e.location || 'Location TBA')}</p>
    <p class="meta">Category: ${esc(e.category || 'Other')}</p>
    <p>${esc(e.description || 'No description provided.')}</p>
    <p><a href="${esc(e.source_url)}" target="_blank" rel="noopener">View original post on ${esc(e.source_name)}</a></p>
  `;
  // TODO (Sprint 5): add an "Add to my calendar" button that downloads an .ics file
}

load();
