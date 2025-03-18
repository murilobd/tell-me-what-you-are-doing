document.addEventListener("DOMContentLoaded", () => {
	const textarea = document.getElementById("text-input");
	const submitButton = document.getElementById("submit-button");
	const uncompletedTasksContainer =
		document.getElementById("uncompleted-tasks");

	let selectedTaskId = null;

	// Load uncompleted tasks when popup opens
	loadUncompletedTasks();

	// Handle submission of the activity
	submitButton.addEventListener("click", () => {
		const text = textarea.value.trim();
		if (text) {
			// Send the text to the main process to save it
			window.electronAPI.saveText(text);

			// If a task was selected, mark it as being worked on
			if (selectedTaskId) {
				// Optionally, you could update the task's status or add metadata
				// This would require additional backend functionality
			}

			textarea.value = ""; // Clear the textarea after submission
		}
	});

	// Function to load uncompleted tasks
	async function loadUncompletedTasks() {
		try {
			const result = await window.electronAPI.getTodos();
			if (result.success && result.todos) {
				// Filter for uncompleted tasks only
				const uncompletedTasks = result.todos.filter(
					(todo) => !todo.completed
				);

				if (uncompletedTasks.length === 0) {
					uncompletedTasksContainer.innerHTML =
						'<div class="no-tasks">No active tasks available</div>';
					return;
				}

				// Clear the container
				uncompletedTasksContainer.innerHTML = "";

				// Add each task to the list
				uncompletedTasks.forEach((task) => {
					const taskItem = document.createElement("div");
					taskItem.className = "task-item";
					taskItem.dataset.id = task.id;

					// Create the task content
					let taskHTML = `<div class="task-text">${escapeHTML(
						task.text
					)}</div>`;

					// Add tags if they exist
					if (task.tags && task.tags.length > 0) {
						taskHTML += '<div class="task-tags">';
						task.tags.forEach((tag) => {
							taskHTML += `<span class="tag">${escapeHTML(
								tag.name
							)}</span>`;
						});
						taskHTML += "</div>";
					}

					taskItem.innerHTML = taskHTML;

					// Add click event to select the task
					taskItem.addEventListener("click", () => {
						// Toggle selection
						if (selectedTaskId === task.id) {
							selectedTaskId = null;
							textarea.value = "";
							taskItem.classList.remove("selected");
						} else {
							// Deselect any previously selected task
							document
								.querySelectorAll(".task-item.selected")
								.forEach((el) => {
									el.classList.remove("selected");
								});

							// Select this task
							selectedTaskId = task.id;
							taskItem.classList.add("selected");

							// Fill the textarea with the task text
							textarea.value = `Working on: ${task.text}`;
						}
					});

					uncompletedTasksContainer.appendChild(taskItem);
				});
			} else {
				uncompletedTasksContainer.innerHTML =
					'<div class="no-tasks">Failed to load tasks</div>';
			}
		} catch (error) {
			console.error("Error loading tasks:", error);
			uncompletedTasksContainer.innerHTML =
				'<div class="no-tasks">Error loading tasks</div>';
		}
	}

	// Helper function to escape HTML
	function escapeHTML(str) {
		return str
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}
});
