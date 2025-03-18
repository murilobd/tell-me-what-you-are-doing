document.addEventListener("DOMContentLoaded", () => {
	const timerElement = document.getElementById("next-popup-timer");
	const pauseButton = document.getElementById("pause-timer-btn");
	const restartButton = document.getElementById("restart-timer-btn");
	const refreshHistoryButton = document.getElementById("refresh-history-btn");
	const historyTableBody = document.getElementById("history-table-body");
	let countdownInterval;

	// Function to format time remaining
	function formatTimeRemaining(milliseconds) {
		if (milliseconds < 0) return "any moment now...";

		const totalSeconds = Math.floor(milliseconds / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;

		return `${minutes}m ${seconds}s`;
	}

	// Function to update the timer display
	function updateTimerDisplay(nextPopupTime) {
		// Clear any existing interval
		if (countdownInterval) {
			clearInterval(countdownInterval);
		}

		// Remove paused styling if present
		timerElement.classList.remove("paused");

		countdownInterval = setInterval(() => {
			const now = Date.now();
			const timeRemaining = nextPopupTime - now;

			timerElement.textContent = formatTimeRemaining(timeRemaining);

			// If time is up, just wait for the next update from main process
			if (timeRemaining <= 0) {
				timerElement.textContent = "any moment now...";
			}
		}, 1000);
	}

	// Function to load history data
	function loadHistoryData() {
		if (!historyTableBody) return;

		// Show loading state
		historyTableBody.innerHTML = `
			<tr class="loading-row">
				<td colspan="3">Loading history...</td>
			</tr>
		`;

		// Fetch history data
		window.electronAPI
			.getHistory()
			.then((data) => {
				if (data && data.length > 0) {
					historyTableBody.innerHTML = "";

					data.forEach((entry) => {
						const row = document.createElement("tr");
						const dateCell = document.createElement("td");
						const textCell = document.createElement("td");
						const actionCell = document.createElement("td");

						// Format the date
						dateCell.textContent = new Date(
							entry.datetime
						).toLocaleString();

						// Handle line breaks in text
						textCell.classList.add("activity-text");

						// Safely convert line breaks to <br> tags
						const sanitizedText = entry.text
							.replace(/&/g, "&amp;")
							.replace(/</g, "&lt;")
							.replace(/>/g, "&gt;")
							.replace(/"/g, "&quot;")
							.replace(/'/g, "&#039;")
							.replace(/\n/g, "<br>");

						textCell.innerHTML = sanitizedText;

						// Create delete button
						const deleteButton = document.createElement("button");
						deleteButton.classList.add("delete-btn");
						deleteButton.setAttribute("title", "Delete entry");
						deleteButton.innerHTML = `
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
								stroke-linecap="round" stroke-linejoin="round">
								<path d="M3 6h18"></path>
								<path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"></path>
								<path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
							</svg>
						`;

						// Add event listener for delete button
						deleteButton.addEventListener("click", async () => {
							// Show confirmation dialog
							if (
								confirm(
									"Are you sure you want to delete this entry?"
								)
							) {
								try {
									const result =
										await window.electronAPI.deleteEntry(
											entry.id
										);
									if (result && result.success) {
										// Remove row from the table
										row.remove();

										// If no entries left, show the no data message
										if (
											historyTableBody.children.length ===
											0
										) {
											historyTableBody.innerHTML = `
												<tr class="no-data-row">
													<td colspan="3">No activities recorded yet</td>
												</tr>
											`;
										}
									} else {
										console.error(
											"Failed to delete entry",
											result
										);
										alert(
											"Failed to delete the entry. Please try again."
										);
									}
								} catch (error) {
									console.error(
										"Error deleting entry:",
										error
									);
									alert(
										"An error occurred while deleting the entry."
									);
								}
							}
						});

						actionCell.appendChild(deleteButton);
						actionCell.classList.add("action-cell");

						row.appendChild(dateCell);
						row.appendChild(textCell);
						row.appendChild(actionCell);
						historyTableBody.appendChild(row);
					});
				} else {
					// No data available
					historyTableBody.innerHTML = `
						<tr class="no-data-row">
							<td colspan="3">No activities recorded yet</td>
						</tr>
					`;
				}
			})
			.catch((error) => {
				console.error("Error fetching history:", error);
				historyTableBody.innerHTML = `
					<tr class="no-data-row">
						<td colspan="3">Failed to load history data</td>
					</tr>
				`;
			});
	}

	// Handle refresh history button
	if (refreshHistoryButton) {
		refreshHistoryButton.addEventListener("click", loadHistoryData);
	}

	// Handle pause button click
	pauseButton.addEventListener("click", async () => {
		const paused = await window.electronAPI.pauseTimer();

		if (paused) {
			// Update UI to reflect paused state
			pauseButton.textContent = "Timer Paused";
			pauseButton.classList.add("paused");
			restartButton.disabled = false;

			// Clear the countdown interval
			if (countdownInterval) {
				clearInterval(countdownInterval);
			}

			// Show paused status
			timerElement.textContent = "PAUSED";
			timerElement.classList.add("paused");
		}
	});

	// Handle restart button click
	restartButton.addEventListener("click", async () => {
		const restarted = await window.electronAPI.restartTimer();

		if (restarted) {
			// Update UI to reflect active state
			pauseButton.textContent = "Pause Timer";
			pauseButton.classList.remove("paused");
			restartButton.disabled = true;

			// Get the updated time
			const nextPopupTime = await window.electronAPI.getNextPopupTime();
			updateTimerDisplay(nextPopupTime);
		}
	});

	// Check initial timer state
	window.electronAPI.isTimerPaused().then((isPaused) => {
		if (isPaused) {
			pauseButton.textContent = "Timer Paused";
			pauseButton.classList.add("paused");
			restartButton.disabled = false;
			timerElement.textContent = "PAUSED";
			timerElement.classList.add("paused");
		}
	});

	// Listen for timer updates from the main process
	window.electronAPI.onTimerUpdate((nextPopupTime) => {
		updateTimerDisplay(nextPopupTime);
		// Reset button states
		pauseButton.textContent = "Pause Timer";
		pauseButton.classList.remove("paused");
		restartButton.disabled = true;

		// Refresh history data when a new reminder pops up
		loadHistoryData();
	});

	// Listen for timer paused events
	window.electronAPI.onTimerPaused(() => {
		// Update UI to reflect paused state
		pauseButton.textContent = "Timer Paused";
		pauseButton.classList.add("paused");
		restartButton.disabled = false;

		// Clear the countdown interval
		if (countdownInterval) {
			clearInterval(countdownInterval);
		}

		// Show paused status
		timerElement.textContent = "PAUSED";
		timerElement.classList.add("paused");
	});

	// Get initial timer value
	window.electronAPI
		.getNextPopupTime()
		.then((nextPopupTime) => {
			if (nextPopupTime) {
				updateTimerDisplay(nextPopupTime);
			}
		})
		.catch((error) => {
			console.error("Failed to get next popup time:", error);
			timerElement.textContent = "Timer unavailable";
		});

	// Load history data on page load
	loadHistoryData();
});
