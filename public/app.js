const form = document.getElementById("downloadForm");
const urlInput = document.getElementById("urlInput");
const submitBtn = document.getElementById("submitBtn");
const progressSection = document.getElementById("progressSection");
const progressTitle = document.getElementById("progressTitle");
const statusBadge = document.getElementById("statusBadge");
const progressPercent = document.getElementById("progressPercent");
const progressFill = document.getElementById("progressFill");
const resultSection = document.getElementById("resultSection");
const resultTitle = document.getElementById("resultTitle");
const directLink = document.getElementById("directLink");
const expiresText = document.getElementById("expiresText");
const errorSection = document.getElementById("errorSection");
const errorMessage = document.getElementById("errorMessage");
const recentList = document.getElementById("recentList");

let eventSource = null;

form.addEventListener("submit", async (e) => {
	e.preventDefault();

	const url = urlInput.value.trim();
	if (!url) return;

	// Reset UI
	hideAll();
	submitBtn.disabled = true;
	submitBtn.textContent = "Starting...";

	try {
		const res = await fetch("/api/download", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ url }),
		});

		const data = await res.json();

		if (!res.ok) {
			showError(data.error || "Failed to start download");
			return;
		}

		showProgress();
		connectSSE(data.id);
	} catch {
		showError("Failed to connect to server");
	} finally {
		submitBtn.disabled = false;
		submitBtn.textContent = "Download";
	}
});

function connectSSE(id) {
	if (eventSource) eventSource.close();

	eventSource = new EventSource(`/api/status/${id}/stream`);

	eventSource.addEventListener("progress", (e) => {
		const data = JSON.parse(e.data);
		updateProgress(data);
	});

	eventSource.addEventListener("complete", (e) => {
		const data = JSON.parse(e.data);
		eventSource.close();
		eventSource = null;
		showResult(id, data);
		loadRecent();
	});

	eventSource.addEventListener("error", (e) => {
		if (e.data) {
			const data = JSON.parse(e.data);
			showError(data.error || "Download failed");
		}
		eventSource.close();
		loadRecent();
	});
}

function updateProgress(data) {
	progressTitle.textContent = data.youtubeTitle || "Downloading...";
	statusBadge.textContent = data.status;
	statusBadge.className = `status-badge ${data.status}`;

	const pct = data.downloadProgress || 0;
	progressPercent.textContent = `${pct}%`;
	progressFill.style.width = `${pct}%`;
}

function showProgress() {
	progressSection.classList.remove("hidden");
	resultSection.classList.add("hidden");
	errorSection.classList.add("hidden");

	progressTitle.textContent = "Starting download...";
	statusBadge.textContent = "pending";
	statusBadge.className = "status-badge";
	progressPercent.textContent = "0%";
	progressFill.style.width = "0%";
}

function showResult(id, data) {
	progressSection.classList.add("hidden");
	resultSection.classList.remove("hidden");
	errorSection.classList.add("hidden");

	resultTitle.textContent = data.youtubeTitle || "Video Ready";

	const link = `${window.location.origin}/v/${id}`;
	console.log("[showResult] setting directLink to:", link, "element:", directLink);
	directLink.value = link;

	fetch(`/api/status/${id}`)
		.then((r) => r.json())
		.then((status) => {
			if (status.expiresAt) {
				const expires = new Date(status.expiresAt);
				const diff = expires - Date.now();
				const hours = Math.floor(diff / 3600000);
				expiresText.textContent = `Expires in ${hours} hours`;
			}
		});
}

function showError(msg) {
	progressSection.classList.add("hidden");
	resultSection.classList.add("hidden");
	errorSection.classList.remove("hidden");
	errorMessage.textContent = msg;
}

function hideAll() {
	progressSection.classList.add("hidden");
	resultSection.classList.add("hidden");
	errorSection.classList.add("hidden");
}

// Copy buttons
document.querySelectorAll(".copy-btn").forEach((btn) => {
	btn.addEventListener("click", () => {
		const target = document.getElementById(btn.dataset.target);
		navigator.clipboard.writeText(target.value).then(() => {
			btn.textContent = "Copied!";
			btn.classList.add("copied");
			setTimeout(() => {
				btn.textContent = "Copy";
				btn.classList.remove("copied");
			}, 2000);
		});
	});
});

// Load recent downloads
async function loadRecent() {
	try {
		const res = await fetch("/api/videos?limit=10");
		const data = await res.json();

		if (data.videos.length === 0) {
			recentList.innerHTML = '<p class="empty-state">No downloads yet</p>';
			return;
		}

		recentList.innerHTML = data.videos
			.map((v) => {
				const title = v.youtubeTitle || v.youtubeUrl;
				const size = v.fileSizeBytes ? formatBytes(v.fileSizeBytes) : "";
				const date = new Date(v.createdAt).toLocaleString();
				const linkHtml =
					v.status === "ready"
						? `<a href="/v/${v.id}" target="_blank">Open</a>`
						: "";

				return `
          <div class="recent-item">
            <div class="recent-item-info">
              <div class="recent-item-title" title="${escapeHtml(title)}">${escapeHtml(title)}</div>
              <div class="recent-item-meta">${date}${size ? ` - ${size}` : ""}</div>
            </div>
            <div class="recent-item-actions">
              <span class="status-badge ${v.status}">${v.status}</span>
              ${linkHtml}
            </div>
          </div>
        `;
			})
			.join("");
	} catch {
		// Silently fail
	}
}

function formatBytes(bytes) {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
	return `${(bytes / 1073741824).toFixed(1)} GB`;
}

function escapeHtml(str) {
	const div = document.createElement("div");
	div.textContent = str;
	return div.innerHTML;
}

// Load recent and config on page load
loadRecent();

fetch("/api/health")
	.then((r) => r.json())
	.then((data) => {
		const ttlEl = document.getElementById("ttlValue");
		if (ttlEl && data.videoTtlHours) {
			ttlEl.textContent = data.videoTtlHours;
		}
	})
	.catch(() => {});
