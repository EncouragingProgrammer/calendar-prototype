// Event details page. Reads ?id= from the URL and asks the API for that event.

const id = new URLSearchParams(window.location.search).get('id');
const box = document.getElementById('event');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

function formatPhone(raw) {
  const digits = String(raw ?? '').replace(/\D/g, '');
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

async function load() {
  const res = await fetch('/api/events/' + id);
  if (!res.ok) { box.textContent = 'Event not found.'; return; }
  const e = await res.json();

  document.title = `${e.title} â€” Community Calendar`;

  const startStr = new Date(e.start_time + (/Z$|[+-]\d{2}:\d{2}$/.test(e.start_time) ? '' : '-06:00')).toLocaleString('en-CA', { timeZone: 'America/Regina' });
  const endStr = e.end_time ? ` â€“ ${new Date(e.end_time + (/Z$|[+-]\d{2}:\d{2}$/.test(e.end_time) ? '' : '-06:00')).toLocaleString('en-CA', { timeZone: 'America/Regina' })}` : '';
  const isExternalLink = /^https?:\/\//.test(e.source_url || '');
  const formattedPhone = e.contact_phone ? formatPhone(e.contact_phone) : '';

  const shareUrl = encodeURIComponent(window.location.href);
  const shareText = encodeURIComponent(`${e.title} â€” ${startStr}`);

  box.innerHTML = `
    ${e.photo_url ? `
      <img src="${esc(e.photo_url)}" alt="${esc(e.title)}"
           style="width: 100%; max-height: 420px; object-fit: contain; border-radius: 8px; margin-bottom: 1rem;" />
    ` : ''}

    <h2>${esc(e.title)}</h2>
    <p class="meta"><strong>When:</strong> ${esc(startStr)}${esc(endStr)} (Saskatchewan time)</p>
    <p class="meta"><strong>Where:</strong> ${esc(e.location || 'Location TBA')}${e.address ? ` (${esc(e.address)})` : ''}</p>
    <p class="meta"><strong>Category:</strong> ${esc(e.category || 'Other')}</p>

    <p style="margin: 1rem 0;">${esc(e.description || 'No description provided.')}</p>

    ${(e.contact_name || e.contact_phone || e.contact_email) ? `
      <div style="border-top: 1px solid var(--border, #ccc); padding-top: 1rem; margin-top: 1rem;">
        <h3 style="margin-bottom: 0.6rem;">Organizer Contact</h3>
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
          ${e.contact_name ? `
            <div style="padding: 0.5rem 0.85rem; border: 1px solid var(--border, #cbd5e1); border-radius: 6px; font-weight: 700;">
              Name: ${esc(e.contact_name)}
            </div>
          ` : ''}
          ${formattedPhone ? `
            <div style="padding: 0.5rem 0.85rem; border: 1px solid var(--border, #cbd5e1); border-radius: 6px; font-weight: 700;">
              Phone: <a href="tel:${esc(e.contact_phone)}">${esc(formattedPhone)}</a>
            </div>
          ` : ''}
          ${e.contact_email ? `
            <div style="padding: 0.5rem 0.85rem; border: 1px solid var(--border, #cbd5e1); border-radius: 6px; font-weight: 700;">
              Email: <a href="mailto:${esc(e.contact_email)}">${esc(e.contact_email)}</a>
            </div>
          ` : ''}
        </div>
      </div>
    ` : ''}

    ${isExternalLink ? `
      <p><a href="${esc(e.source_url)}" target="_blank" rel="noopener">View original post on ${esc(e.source_name)}</a></p>
    ` : ''}

    <div style="display: flex; gap: 0.65rem; flex-wrap: wrap; align-items: center; border-top: 1px solid var(--border, #ccc); padding-top: 1rem; margin-top: 1.25rem;">
      ${navigator.share ? `
        <button type="button" id="native-share-btn" class="approve" style="display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.5rem 0.95rem; font-weight: 600;">
          Share Event
        </button>
      ` : ''}

      <a style="background: #1877F2; color: #ffffff; text-decoration: none; padding: 0.5rem 0.95rem; border-radius: 6px; font-weight: 600; display: inline-flex; align-items: center; gap: 0.45rem;"
         href="https://www.facebook.com/sharer/sharer.php?u=${shareUrl}" target="_blank" rel="noopener" aria-label="Share on Facebook">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"/>
        </svg>
        <span>Share</span>
      </a>

      <a style="background: #000000; color: #ffffff; text-decoration: none; padding: 0.5rem 0.95rem; border-radius: 6px; font-weight: 600; display: inline-flex; align-items: center; gap: 0.45rem; border: 1px solid #333;"
         href="https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}" target="_blank" rel="noopener" aria-label="Post on X">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        <span>Post</span>
      </a>

      <button type="button" id="copy-link-btn" style="padding: 0.5rem 0.95rem; font-weight: 600;">
        Copy Link
      </button>
    </div>

  `;

  const nativeBtn = document.getElementById('native-share-btn');
  if (nativeBtn) {
    nativeBtn.addEventListener('click', async () => {
      try {
        await navigator.share({
          title: e.title,
          text: `${e.title} â€” ${startStr}`,
          url: window.location.href,
        });
      } catch {}
    });
  }

  document.getElementById('copy-link-btn').addEventListener('click', async (btnEvent) => {
    await navigator.clipboard.writeText(window.location.href);
    btnEvent.target.textContent = 'Link Copied!';
    setTimeout(() => { btnEvent.target.textContent = 'Copy Event Link'; }, 2000);
  });

}

load();
