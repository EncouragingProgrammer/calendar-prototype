const form = document.getElementById('event-form');
const statusEl = document.getElementById('form-status');
const fileInput = document.getElementById('photo_file');
const previewImg = document.getElementById('photo-preview');
const photoModal = document.getElementById('photo-modal');
const photoModalImg = document.getElementById('photo-modal-img');

let uploadedPhotoData = null;

function compressImage(file, maxWidth = 1280, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      if (img.width < 600 || img.height < 315) {
        reject(new Error(`Image too small (${img.width}×${img.height}px). Minimum required is 600×315px.`));
        return;
      }

      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve({
        dataUrl: canvas.toDataURL('image/jpeg', quality),
        width: canvas.width,
        height: canvas.height
      });
    };

    img.onerror = () => reject(new Error('Could not read image file.'));
    img.src = objectUrl;
  });
}

fileInput.addEventListener('change', async () => {
  const file = fileInput.files?.[0];
  if (!file) {
    uploadedPhotoData = null;
    previewImg.style.display = 'none';
    return;
  }

  statusEl.textContent = 'Checking dimensions & optimizing photo...';
  try {
    const result = await compressImage(file);
    uploadedPhotoData = result.dataUrl;
    previewImg.src = uploadedPhotoData;
    previewImg.style.display = 'block';
    statusEl.textContent = `Ready (${result.width}×${result.height}px) — click image to inspect full size.`;
  } catch (err) {
    uploadedPhotoData = null;
    previewImg.style.display = 'none';
    fileInput.value = '';
    statusEl.textContent = err.message;
  }
});

previewImg.addEventListener('click', () => {
  if (!uploadedPhotoData) return;
  photoModalImg.src = uploadedPhotoData;
  photoModal.showModal();
});

document.getElementById('close-photo-modal').addEventListener('click', () => {
  photoModal.close();
});

photoModal.addEventListener('click', (e) => {
  if (e.target === photoModal) photoModal.close();
});

const phoneInput = document.getElementById('contact_phone');

phoneInput.addEventListener('input', () => {
  const digits = phoneInput.value.replace(/\D/g, '').slice(0, 10);
  if (digits.length === 0) {
    phoneInput.value = '';
  } else if (digits.length <= 3) {
    phoneInput.value = `(${digits}`;
  } else if (digits.length <= 6) {
    phoneInput.value = `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  } else {
    phoneInput.value = `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  statusEl.textContent = 'Submitting...';

  const data = Object.fromEntries(new FormData(form));
  data.photo_url = uploadedPhotoData;

  try {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

  if (!res.ok) {
  const text = await res.text();
  let msg = `Server error (${res.status})`;
  try { msg = JSON.parse(text).error || msg; } catch {}
  throw new Error(msg);
}


    form.reset();
    uploadedPhotoData = null;
    previewImg.style.display = 'none';
    statusEl.textContent = 'Event submitted! It is now waiting in the review queue.';
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
  }
});
