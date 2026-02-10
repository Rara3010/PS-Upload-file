const elements = {
  form: document.getElementById("uploadForm"),
  area: document.getElementById("uploadArea"),
  input: document.getElementById("fileInput"),
  info: document.getElementById("fileInfo"),
  name: document.getElementById("fileName"),
  size: document.getElementById("fileSize"),
  submit: document.getElementById("submitBtn"),
  btnText: document.getElementById("btnText"),
  uploadIcon: document.getElementById("uploadIcon"),
  loadingIcon: document.getElementById("loadingIcon"),
  result: document.getElementById("uploadResult"),
  copyButton: document.getElementById("copyButton"),
  progress: {
    container: document.getElementById("progressContainer"),
    bar: document.getElementById("progressBar"),
    text: document.getElementById("progressText"),
    status: document.getElementById("progressStatus"),
  },
  historyButton: document.querySelector('[data-lucide="history"]')
    .parentElement,
  historyModal: document.getElementById("historyModal"),
  closeModal: document.getElementById("closeModal"),
  searchInput: document.getElementById("searchInput"),
  historyTableBody: document.getElementById("historyTableBody"),
  prevPage: document.getElementById("prevPage"),
  nextPage: document.getElementById("nextPage"),
  currentPageSpan: document.getElementById("currentPage"),
  totalPagesSpan: document.getElementById("totalPages"),
  selectAllCheckbox: document.getElementById("selectAllCheckbox"),
  deleteSelectedButton: document.getElementById("deleteSelectedButton"),
};

elements.area.addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  elements.input.click();
});

elements.input.addEventListener("click", (e) => e.stopPropagation());

elements.area.addEventListener("dragover", (e) => {
  e.preventDefault();
  elements.area.classList.add("dragover");
});

elements.area.addEventListener("dragleave", (e) => {
  if (!elements.area.contains(e.relatedTarget)) {
    elements.area.classList.remove("dragover");
  }
});

elements.area.addEventListener("drop", (e) => {
  e.preventDefault();
  elements.area.classList.remove("dragover");
  const files = e.dataTransfer.files;
  if (files.length) {
    elements.input.files = files;
    displayFileInfo(files[0]);
  }
});

const updateButtonState = (isValid) => {
  elements.submit.disabled = !isValid;
  elements.submit.setAttribute("aria-disabled", !isValid);
  if (!isValid) {
    elements.submit.style.pointerEvents = "none";
    elements.submit.style.opacity = "0.5";
  } else {
    elements.submit.style.pointerEvents = "auto";
    elements.submit.style.opacity = "1";
  }
};

elements.input.addEventListener("change", (e) => {
  if (e.target.files.length) {
    const file = e.target.files[0];
    displayFileInfo(file);
    updateButtonState(true);
  } else {
    updateButtonState(false);
    elements.info.classList.add("hidden");
  }
});

const displayFileInfo = (file) => {
  elements.name.textContent = file.name;
  elements.size.textContent = formatFileSize(file.size);
  elements.info.classList.remove("hidden");
  elements.area.classList.add("success-glow");
  setTimeout(() => elements.area.classList.remove("success-glow"), 2000);
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const updateProgress = (percent, status) => {
  elements.progress.bar.style.width = `${percent}%`;
  elements.progress.text.textContent = `${percent}%`;
  elements.progress.status.textContent = status;
  if (percent === 100) {
    elements.btnText.textContent = "COMPLETED !";
  }
};

const setLoadingState = (isLoading) => {
  elements.submit.disabled = isLoading;
  elements.btnText.textContent = "PROCESSING ...";
  elements.uploadIcon.classList.toggle("hidden", isLoading);
  elements.loadingIcon.classList.toggle("hidden", !isLoading);
  elements.progress.container.classList.toggle("hidden", !isLoading);
  if (isLoading) updateProgress(0, "Preparing upload...");
};

elements.result.addEventListener("input", () => {
  elements.copyButton.disabled = !elements.result.value;
});

// History management moved to src/history.js
// history.js exposes global `saveToHistory()` function used below

const showResult = (type, message, url = null) => {
  if (type === "success" && url) {
    elements.result.value = url;
    elements.result.classList.remove("hidden");
    elements.copyButton.disabled = false;
    saveToHistory(url);
  } else {
    elements.result.value = message;
    elements.result.classList.remove("hidden");
    elements.copyButton.disabled = true;
    if (type === "error") {
      elements.area.classList.add("error-glow");
      setTimeout(() => elements.area.classList.remove("error-glow"), 3000);
    }
  }
};

elements.copyButton.addEventListener("click", (e) => {
  e.preventDefault();
  const text = elements.result.value;
  if (text) {
    copyToClipboard(text);
  }
});

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    const icon = document.getElementById("copyIcon");
    const existingSvg = icon.querySelector("svg");
    if (existingSvg) {
      existingSvg.remove();
    }
    icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

    setTimeout(() => {
      const checkSvg = icon.querySelector("svg");
      if (checkSvg) {
        checkSvg.remove();
      }
      icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>`;
    }, 3000);
  } catch {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    const icon = document.getElementById("copyIcon");
    const existingSvg = icon.querySelector("svg");
    if (existingSvg) {
      existingSvg.remove();
    }
    icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

    setTimeout(() => {
      const checkSvg = icon.querySelector("svg");
      if (checkSvg) {
        checkSvg.remove();
      }
      icon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>`;
    }, 3000);
  }
};

const resetForm = () => {
  elements.input.value = "";
  elements.info.classList.add("hidden");
  elements.submit.disabled = true;
  elements.btnText.textContent = "UPLOAD";
  elements.uploadIcon.classList.remove("hidden");
  elements.loadingIcon.classList.add("hidden");
  elements.progress.container.classList.add("hidden");
  elements.area.classList.remove("success-glow");
  updateButtonState(false);
};

elements.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const file = elements.input.files[0];

  if (!file) {
    showResult("error", "Silakan pilih file terlebih dahulu");
    updateButtonState(false);
    return;
  }

  const formData = new FormData();
  formData.append("files[]", file);
  setLoadingState(true);
  elements.result.innerHTML = "";

  const xhr = new XMLHttpRequest();

  xhr.upload.addEventListener("progress", (e) => {
    if (e.lengthComputable) {
      updateProgress(Math.round((e.loaded / e.total) * 100), "Uploading...");
    }
  });

  xhr.addEventListener("load", () => {
    // If uploading to Uguu, the API returns a plain URL (or small text).
    // When using local backend we expect JSON (the previous behavior).
    if (typeof USE_UGUU !== "undefined" && USE_UGUU) {
      if (xhr.status === 200) {
        const url = xhr.responseText.trim();
        updateProgress(100, "Upload complete !");
        setTimeout(() => {
          showResult("success", "File berhasil diunggah!", url);
          resetForm();
        }, 500);
      } else {
        showResult("error", `Upload failed with status: ${xhr.status}`);
        updateButtonState(false);
        resetForm();
      }
      return;
    }

    if (xhr.status === 200) {
      try {
        const data = JSON.parse(xhr.responseText);
        if (data.success && data.files?.[0]?.url) {
          updateProgress(100, "Upload complete !");
          setTimeout(() => {
            showResult("success", "File berhasil diunggah!", data.files[0].url);
            resetForm();
          }, 500);
        } else {
          showResult("error", data.description || "Gagal mengunggah file");
          updateButtonState(false);
          resetForm();
          console.error("Upload failed:", data);
        }
      } catch (error) {
        showResult("error", "Invalid response from server");
        updateButtonState(false);
        resetForm();
        console.error("Parse error:", error);
      }
    } else {
      try {
        const data = JSON.parse(xhr.responseText);
        showResult(
          "error",
          data.description || `Upload failed with status: ${xhr.status}`
        );
        updateButtonState(false);
        resetForm();
      } catch (error) {
        showResult("error", `Upload failed with status: ${xhr.status}`);
        updateButtonState(false);
        resetForm();
      }
    }
  });

  xhr.addEventListener("error", () => {
    showResult("error", "Network error occurred");
    updateButtonState(false);
    resetForm();
  });

  // Choose backend: local server by default, or Uguu API via server proxy
  const USE_UGUU = false; // set to true to upload via /upload-uguu proxy endpoint
  const UPLOAD_URL = USE_UGUU
    ? `${location.origin}/upload-uguu`
    : `${location.origin}/upload`;

  xhr.open("POST", UPLOAD_URL);
  xhr.send(formData);

  // if using Uguu the load handler above will need to be compatible; when
  // USE_UGUU is true the server typically returns a plain URL in responseText.
});