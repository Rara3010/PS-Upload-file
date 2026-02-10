
const HistoryModule = (() => {
  const elements = {
    historyButton: document.querySelector('[data-lucide="history"]').parentElement,
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

  let currentPage = 1;
  const itemsPerPage = 10;
  let filteredHistory = [];
  let selectedItems = new Set();
  let historyInterval = null;

  function getHistory() {
    const history = JSON.parse(localStorage.getItem("uploadHistory") || "[]");
    return history.filter((item) => item.expiresAt > Date.now());
  }

  function saveToHistory(url) {
    const history = JSON.parse(localStorage.getItem("uploadHistory") || "[]");
    const newItem = {
      url,
      timestamp: Date.now(),
      expiresAt: Date.now() + 3 * 60 * 60 * 1000,
    };
    history.unshift(newItem);
    localStorage.setItem("uploadHistory", JSON.stringify(history));
    renderHistory();
  }

  function formatTimeLeft(expiresAt) {
    const now = Date.now();
    const timeLeft = expiresAt - now;
    if (timeLeft <= 0) return "expired";
    const hours = Math.floor(timeLeft / (60 * 60 * 1000));
    const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
    const seconds = Math.floor((timeLeft % (60 * 1000)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  function deleteFromHistory(url) {
    const history = JSON.parse(localStorage.getItem("uploadHistory") || "[]");
    const updatedHistory = history.filter((item) => item.url !== url);
    localStorage.setItem("uploadHistory", JSON.stringify(updatedHistory));
    renderHistory();
  }

  function deleteSelectedFromHistory() {
    const history = JSON.parse(localStorage.getItem("uploadHistory") || "[]");
    const updatedHistory = history.filter((item) => !selectedItems.has(item.url));
    localStorage.setItem("uploadHistory", JSON.stringify(updatedHistory));
    selectedItems.clear();
    renderHistory();
  }

  function toggleSelectAll(checked) {
    const checkboxes = document.querySelectorAll(".item-checkbox");
    checkboxes.forEach((checkbox) => {
      checkbox.checked = checked;
      const url = checkbox.dataset.url;
      if (checked) selectedItems.add(url);
      else selectedItems.delete(url);
    });
    updateDeleteSelectedButton();
  }

  function toggleItemSelection(url, checked) {
    if (checked) selectedItems.add(url);
    else selectedItems.delete(url);
    updateDeleteSelectedButton();

    const checkboxes = document.querySelectorAll(".item-checkbox");
    const allChecked = Array.from(checkboxes).every((cb) => cb.checked);
    elements.selectAllCheckbox.checked = allChecked;
  }

  function updateDeleteSelectedButton() {
    elements.deleteSelectedButton.disabled = selectedItems.size === 0;
    elements.deleteSelectedButton.classList.toggle("opacity-50", selectedItems.size === 0);
  }

  function renderHistory() {
    const history = getHistory();
    const searchTerm = (elements.searchInput?.value || "").toLowerCase();

    filteredHistory = history.filter((item) => item.url.toLowerCase().includes(searchTerm));

    const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = filteredHistory.slice(start, end);

    if (history.length === 0) {
      elements.historyTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="py-8 text-center">
          <div class="flex flex-col items-center gap-2 text-white/60">
            <i data-lucide="inbox" class="h-12 w-12"></i>
            <p class="text-sm">No upload history yet</p>
            <p class="text-xs">Your uploaded files will appear here</p>
          </div>
        </td>
      </tr>
    `;
      currentPage = 1;
    } else if (filteredHistory.length === 0) {
      elements.historyTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="py-8 text-center">
          <div class="flex flex-col items-center gap-2 text-white/60">
            <i data-lucide="search-x" class="h-12 w-12"></i>
            <p class="text-sm">No results found</p>
            <p class="text-xs">Try different search terms</p>
          </div>
        </td>
      </tr>
    `;
      currentPage = 1;
    } else {
      elements.historyTableBody.innerHTML = pageItems
        .map(
          (item) => `
      <tr class="border-b border-white/10 hover:bg-white/5">
        <td class="py-3 px-4">
          <input type="checkbox" class="item-checkbox glass2 border-white/20" data-url="${item.url}" ${selectedItems.has(item.url) ? "checked" : ""}>
        </td>
        <td class="py-3 px-4">
          <span class="truncate max-w-[300px] block">${item.url}</span>
        </td>
        <td class="py-3 px-4">${formatTimeLeft(item.expiresAt)}</td>
        <td class="py-3 px-4">
          <div class="flex items-center justify-end gap-2">
            <button class="copy-link glass px-2 py-2 rounded-lg text-xs glass2 hover:bg-white/20 border border-white/20 text-white font-semibold transition flex items-center gap-1" data-url="${item.url}">
              <i data-lucide="copy" class="h-4 w-4"></i>
            </button>
            <a href="${item.url}" target="_blank" class="glass px-2 py-2 rounded-lg text-xs glass2 hover:bg-white/20 border border-white/20 text-white font-semibold transition flex items-center gap-1">
              <i data-lucide="external-link" class="h-4 w-4"></i>
            </a>
            <button class="delete-link glass px-2 py-2 rounded-lg text-xs glass2 hover:bg-white/20 border border-white/20 text-white font-semibold transition flex items-center gap-1" data-url="${item.url}">
              <i data-lucide="trash-2" class="h-4 w-4"></i>
            </button>
          </div>
        </td>
      </tr>
    `
        )
        .join("");
    }

    elements.currentPageSpan.textContent = currentPage;
    elements.totalPagesSpan.textContent = totalPages || 1;
    elements.prevPage.disabled = currentPage === 1 || filteredHistory.length === 0;
    elements.nextPage.disabled = currentPage === totalPages || filteredHistory.length === 0;

    elements.prevPage.classList.toggle("opacity-50", elements.prevPage.disabled);
    elements.nextPage.classList.toggle("opacity-50", elements.nextPage.disabled);

    document.querySelectorAll(".item-checkbox").forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        toggleItemSelection(e.target.dataset.url, e.target.checked);
      });
    });

    lucide.createIcons();
  }

  // UI events
  elements.historyButton.addEventListener("click", () => {
    elements.historyModal.classList.remove("hidden");
    elements.historyModal.offsetHeight;
    elements.historyModal.classList.add("flex");
    elements.historyModal.classList.remove("opacity-0");
    elements.historyModal.querySelector(".glass").classList.remove("scale-95");
    renderHistory();
    if (!historyInterval) historyInterval = setInterval(renderHistory, 1000);
  });

  elements.closeModal.addEventListener("click", () => {
    elements.historyModal.classList.add("opacity-0");
    elements.historyModal.querySelector(".glass").classList.add("scale-95");
    setTimeout(() => {
      elements.historyModal.classList.add("hidden");
      elements.historyModal.classList.remove("flex");
      if (historyInterval) {
        clearInterval(historyInterval);
        historyInterval = null;
      }
    }, 300);
  });

  elements.searchInput.addEventListener("input", () => {
    currentPage = 1;
    renderHistory();
  });

  elements.prevPage.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderHistory();
    }
  });

  elements.nextPage.addEventListener("click", () => {
    const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderHistory();
    }
  });

  elements.historyTableBody.addEventListener("click", (e) => {
    if (e.target.closest(".copy-link")) {
      const url = e.target.closest(".copy-link").dataset.url;
      const button = e.target.closest(".copy-link");

      navigator.clipboard.writeText(url).catch(() => {
        const ta = document.createElement("textarea");
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      });

      button.innerHTML = `<i data-lucide="check" class="h-4 w-4"></i>`;
      lucide.createIcons();

      setTimeout(() => {
        button.innerHTML = `<i data-lucide="copy" class="h-4 w-4"></i>`;
        lucide.createIcons();
      }, 3000);
    } else if (e.target.closest(".delete-link")) {
      const url = e.target.closest(".delete-link").dataset.url;
      const button = e.target.closest(".delete-link");

      button.innerHTML = `<i data-lucide="loader-2" class="h-4 w-4 animate-spin"></i>`;
      lucide.createIcons();

      setTimeout(() => {
        deleteFromHistory(url);
      }, 300);
    }
  });

  elements.selectAllCheckbox.addEventListener("change", (e) => toggleSelectAll(e.target.checked));
  elements.deleteSelectedButton.addEventListener("click", () => deleteSelectedFromHistory());

  // expose public API
  window.saveToHistory = saveToHistory;
  window.renderHistory = renderHistory;

  return {
    saveToHistory,
    renderHistory,
  };
})();
