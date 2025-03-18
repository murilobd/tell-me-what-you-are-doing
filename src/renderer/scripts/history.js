document.addEventListener("DOMContentLoaded", () => {
	const historyTableBody = document.getElementById("history-table-body");
	if (!historyTableBody) return;

	historyTableBody.innerHTML = "";

	// Use our electronAPI bridge instead of fetch
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
										historyTableBody.children.length === 0
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
								console.error("Error deleting entry:", error);
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
});
