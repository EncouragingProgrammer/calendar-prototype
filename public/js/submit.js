const form = document.getElementById('event-form');
const statusEl = document.getElementById('form-status');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = 'Submitting...';

  const data = Object.fromEntries(new FormData(form));

  try {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Submission failed');
    }

    form.reset();
    statusEl.textContent = 'Event submitted! It is now waiting in the review queue.';
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
  }
});
