  const API_URL = "http://localhost:5000/api"; // change if deployed

      // DOM refs
      const overlay = document.getElementById("popupOverlay");
      const box = document.getElementById("popupBox");
      const title = document.getElementById("popupTitle");
      const msg = document.getElementById("popupMessage");
      const actions = document.getElementById("popupActions");
      const closeX = document.getElementById("popupCloseX");

      closeX.addEventListener("click", closePopup);

      // close when clicking outside the popup box
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closePopup();
      });

      // close on Escape
      window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closePopup();
      });

      async function verifyFile() {
        const fileInput = document.getElementById("fileInput");
        if (!fileInput.files[0]) {
          alert("Please select a certificate file");
          return;
        }

        const formData = new FormData();
        formData.append("certificateFile", fileInput.files[0]);

        try {
          const res = await fetch(`${API_URL}/verify`, {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          showPopup(data);
        } catch (err) {
          console.error(err);
          alert("Error verifying certificate");
        }
      }

      async function verifyID() {
        const id = document.getElementById("idInput").value.trim();
        if (!id) {
          alert("Please enter certificate ID");
          return;
        }

        try {
          const res = await fetch(`${API_URL}/cert/${id}`);

          // Try to parse JSON; if parsing fails treat as not found
          let data = null;
          try {
            data = await res.json();
          } catch (e) {
            showPopup({
              verified: false,
              message: "Invalid response from server",
            });
            return;
          }

          // If HTTP not OK (e.g., 404) or server returned an error object, treat as forged
          if (
            !res.ok ||
            data === null ||
            data.error ||
            (!data._id && !data.id)
          ) {
            const msg =
              data && data.error ? data.error : "Certificate ID not found";
            showPopup({ verified: false, message: msg });
            return;
          }

          // Otherwise we have a valid certificate object
          showPopup({ verified: true, certificate: data });
        } catch (err) {
          console.error("verifyID error:", err);
          showPopup({
            verified: false,
            message: "Network error while verifying ID",
          });
        }
      }

      function showPopup(data) {
        // prepare popup contents
        actions.innerHTML = "";
        msg.innerHTML = "";

        if (data.verified) {
          box.className = "popup genuine";
          title.textContent = "✅ Genuine Certificate";

          const cert = data.certificate;
          const meta = {
            id: cert._id || cert.id,
            name: cert.name,
            issuer: cert.issuer,
            date_of_issue: cert.date_of_issue,
            filename: cert.originalFilename || cert.filename,
            hash: cert.hash,
          };
          msg.innerHTML = `<pre>${JSON.stringify(meta, null, 2)}</pre>`;

          // Download button (GET /api/cert/:id/file)
          const downloadBtn = document.createElement("button");
          downloadBtn.className = "btn-download";
          downloadBtn.textContent = "Download Certificate";
          downloadBtn.onclick = () => {
            const downloadUrl = `${API_URL}/cert/${meta.id}/file`;
            window.open(downloadUrl, "_blank");
          };
          actions.appendChild(downloadBtn);

          // View metadata in new tab
          const viewBtn = document.createElement("button");
          viewBtn.className = "btn-light";
          viewBtn.textContent = "View Metadata";
          viewBtn.onclick = () => {
            const popup = window.open("");
            popup.document.write(
              "<pre>" + JSON.stringify(cert, null, 2) + "</pre>"
            );
          };
          actions.appendChild(viewBtn);

          // Close
          const closeBtn = document.createElement("button");
          closeBtn.className = "btn-close";
          closeBtn.textContent = "Close";
          closeBtn.onclick = closePopup;
          actions.appendChild(closeBtn);
        } else {
          box.className = "popup forged";
          title.textContent = "❌ Forged Certificate";
          msg.innerHTML = `<div>${
            data.message ? data.message : "No record found."
          }</div>`;

          const suggestBtn = document.createElement("button");
          suggestBtn.className = "btn-light";
          suggestBtn.textContent = "Suggest Re-check";
          suggestBtn.onclick = () =>
            alert(
              "Make sure the file is the exact one that was registered. Even small edits change the hash."
            );
          actions.appendChild(suggestBtn);

          const closeBtn = document.createElement("button");
          closeBtn.className = "btn-close";
          closeBtn.textContent = "Close";
          closeBtn.onclick = closePopup;
          actions.appendChild(closeBtn);
        }

        // show overlay
        overlay.classList.add("show");
        overlay.setAttribute("aria-hidden", "false");
        // focus the close button for accessibility
        closeX.focus();
      }

      function closePopup() {
        overlay.classList.remove("show");
        overlay.setAttribute("aria-hidden", "true");
      }