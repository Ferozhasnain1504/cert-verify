  const API_URL = 'http://localhost:5000/api'; // adjust if deployed elsewhere
  const fileInput = document.getElementById('fileInput');
  const fileName = document.getElementById('fileName');
  const uploadBtn = document.getElementById('uploadBtn');
  const btnContent = document.getElementById('btnContent');
  const overlay = document.getElementById('overlay');
  const modalTitle = document.getElementById('modalTitle');
  const modalMsg = document.getElementById('modalMsg');
  const metaBox = document.getElementById('metaBox');
  const modalActions = document.getElementById('modalActions');
  const modalClose = document.getElementById('modalClose');

  // show chosen filename
  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      fileName.textContent = fileInput.files[0].name;
    } else {
      fileName.textContent = 'No file chosen';
    }
  });

  // close modal
  function closeModal() {
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden', 'true');
    metaBox.style.display = 'none';
    metaBox.innerHTML = '';
    modalActions.innerHTML = '';
  }
  modalClose.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  window.addEventListener('keydown', (e)=> { if (e.key === 'Escape') closeModal(); });

  // on form submit
  async function onSubmit(e) {
    e.preventDefault();
    if (!fileInput.files[0]) {
      alert('Please choose a PDF certificate file.');
      return;
    }

    // prepare form data
    const formData = new FormData();
    formData.append('certificateFile', fileInput.files[0]);
    formData.append('name', document.getElementById('name').value);
    formData.append('issuer', document.getElementById('issuer').value);
    formData.append('date', document.getElementById('date').value);

    // UI: set loading state
    uploadBtn.disabled = true;
    btnContent.innerHTML = '<span class="spinner" aria-hidden="true"></span>Uploading...';

    try {
      const res = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData
      });

      // try parse JSON safely
      let data;
      try { data = await res.json(); } catch (err) { data = null; }

      // handle HTTP errors or server-side errors
      if (!res.ok || !data || data.error) {
        const errMsg = (data && (data.error || data.message)) ? (data.error || data.message) : 'Upload failed';
        showModal(false, errMsg);
        return;
      }

      // success — show ID and hash
      showModal(true, 'Certificate uploaded successfully', data);
    } catch (err) {
      console.error('Upload error', err);
      showModal(false, 'Network error during upload');
    } finally {
      uploadBtn.disabled = false;
      btnContent.textContent = 'Upload Certificate';
    }
  }

  // show modal helper
  function showModal(success, message, payload) {
    modalTitle.textContent = success ? '✅ Upload Successful' : '❌ Upload Failed';
    modalMsg.textContent = message;
    modalActions.innerHTML = '';

    if (success && payload) {
      // build meta view
      const meta = {
        id: payload.id || payload._id || payload.certificate?._id,
        hash: payload.hash || (payload.certificate && payload.certificate.hash)
      };
      metaBox.style.display = 'block';
      metaBox.innerHTML = `<strong>Certificate ID:</strong> ${meta.id || '—'}<br><strong>Hash:</strong> <code style="word-break:break-all">${meta.hash || '—'}</code>`;

      // copy id button
      const copyId = document.createElement('button');
      copyId.className = 'btn-copy';
      copyId.textContent = 'Copy ID';
      copyId.onclick = () => {
        navigator.clipboard.writeText(meta.id || '').then(()=> {
          copyId.textContent = 'Copied';
          setTimeout(()=> copyId.textContent = 'Copy ID', 1500);
        }).catch(()=> alert('Copy failed'));
      };
      // copy hash button
      const copyHash = document.createElement('button');
      copyHash.className = 'btn-light';
      copyHash.textContent = 'Copy Hash';
      copyHash.onclick = () => {
        navigator.clipboard.writeText(meta.hash || '').then(()=> {
          copyHash.textContent = 'Copied';
          setTimeout(()=> copyHash.textContent = 'Copy Hash', 1500);
        }).catch(()=> alert('Copy failed'));
      };

      // done button
      const done = document.createElement('button');
      done.className = 'btn-light';
      done.textContent = 'Done';
      done.onclick = closeModal;

      modalActions.appendChild(copyId);
      modalActions.appendChild(copyHash);
      modalActions.appendChild(done);
    } else {
      // failure actions
      const retry = document.createElement('button');
      retry.className = 'btn-light';
      retry.textContent = 'Try Again';
      retry.onclick = () => { closeModal(); fileInput.focus(); };
      const close = document.createElement('button');
      close.className = 'btn-light';
      close.textContent = 'Close';
      close.onclick = closeModal;
      modalActions.appendChild(retry);
      modalActions.appendChild(close);
    }

    showModal(true, 'Certificate uploaded successfully', certificate._id);


    overlay.classList.add('show');
    overlay.setAttribute('aria-hidden', 'false');
    modalClose.focus();
  }
