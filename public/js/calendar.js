// Public calendar page. Shows APPROVED events only.
// The backend (Python or JavaScript) must provide GET /api/events

const searchBox = document.getElementById('search');
const categoryBox = document.getElementById('category');

// On narrow screens (phones) a month grid is too cramped, so show a list instead
const isNarrow = () => window.innerWidth < 700;

const calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
  initialView: isNarrow() ? 'listMonth' : 'dayGridMonth',
  height: 'auto',          // grow to fit the events instead of using a fixed height
  headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,listMonth' },
  eventDisplay: 'block',   // solid coloured boxes instead of small dots
  dayMaxEvents: 3,         // a busy day shows "+2 more" instead of stretching the row
  eventTimeFormat: { hour: 'numeric', minute: '2-digit', meridiem: 'short' },

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
      success(events.map(e => ({
        id: e.id,
        title: e.title,
        start: e.start_time,
        end: e.end_time,
        classNames: ['cat-' + (e.category || 'other').toLowerCase()], // colour by category (see style.css)
      })));
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

// Switch between month grid and list when the window is resized
window.addEventListener('resize', () => {
  const wanted = isNarrow() ? 'listMonth' : 'dayGridMonth';
  if (calendar.view.type !== wanted) calendar.changeView(wanted);
});

// Re-fetch events when filters change
searchBox.addEventListener('input', () => calendar.refetchEvents());
categoryBox.addEventListener('change', () => calendar.refetchEvents());
