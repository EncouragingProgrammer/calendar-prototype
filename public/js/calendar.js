// Public calendar page. Shows APPROVED events only.
// The backend (Python or JavaScript) must provide GET /api/events

const searchBox = document.getElementById('search');
const categoryBox = document.getElementById('category');

const calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
  initialView: 'dayGridMonth',
  headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,listMonth' },

  // FullCalendar calls this function whenever it needs events for the visible dates
  events: async (info, success, failure) => {
    try {
      const params = new URLSearchParams({
        status: 'approved',
        q: searchBox.value,
        category: categoryBox.value,
      });
      const res = await fetch('/api/events?' + params);
      const events = await res.json();
      // Convert our database rows into the shape FullCalendar expects
      success(events.map(e => ({ id: e.id, title: e.title, start: e.start_time, end: e.end_time })));
    } catch (err) {
      failure(err);
    }
  },

  // Clicking an event opens the details page
  eventClick: (info) => {
    info.jsEvent.preventDefault();
    window.location = '/event.html?id=' + info.event.id;
  },
});

calendar.render();

// Re-fetch events when filters change
searchBox.addEventListener('input', () => calendar.refetchEvents());
categoryBox.addEventListener('change', () => calendar.refetchEvents());
