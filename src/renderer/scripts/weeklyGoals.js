document.addEventListener("DOMContentLoaded", () => {
	// Elements
	const goalText = document.getElementById("goal-text");
	const addGoalBtn = document.getElementById("add-goal-btn");
	const refreshGoalsBtn = document.getElementById("refresh-goals-btn");
	const weekIndicator = document.getElementById("current-week-number");

	// Tab elements
	const tabButtons = document.querySelectorAll(".tab-btn");
	const inProgressGoalsList = document.getElementById("in-progress-goals");
	const completedGoalsList = document.getElementById("completed-goals");

	// Display current week number
	displayCurrentWeekNumber();

	// Load goals on page load
	loadWeeklyGoals();

	// Check if today is Monday to show welcome message
	checkIfMonday();

	// Event listeners
	if (addGoalBtn) {
		addGoalBtn.addEventListener("click", addWeeklyGoal);
	}

	if (refreshGoalsBtn) {
		refreshGoalsBtn.addEventListener("click", loadWeeklyGoals);
	}

	if (goalText) {
		goalText.addEventListener("keypress", (e) => {
			if (e.key === "Enter") {
				addWeeklyGoal();
			}
		});
	}

	// Tab switching event listeners
	tabButtons.forEach((button) => {
		button.addEventListener("click", () => {
			// Remove active class from all tabs
			tabButtons.forEach((btn) => btn.classList.remove("active"));
			document
				.querySelectorAll(".tab-content")
				.forEach((tab) => tab.classList.remove("active"));

			// Add active class to clicked tab and corresponding content
			button.classList.add("active");
			const tabId = button.getAttribute("data-tab");
			document.getElementById(`tab-${tabId}`).classList.add("active");
		});
	});

	// Listen for goals updated event
	window.electronAPI.onGoalsUpdated(() => {
		loadWeeklyGoals();
	});

	// Functions
	async function displayCurrentWeekNumber() {
		if (weekIndicator) {
			try {
				const result = await window.electronAPI.getCurrentWeekNumber();
				if (result.success) {
					weekIndicator.textContent = result.weekNumber;
				}
			} catch (error) {
				console.error("Error getting current week number:", error);
			}
		}
	}

	function checkIfMonday() {
		const today = new Date();
		if (today.getDay() === 1) {
			// Monday is 1, Sunday is 0
			// Create a greeting for Monday to plan the week
			const mondayGreeting = document.createElement("div");
			mondayGreeting.className = "monday-greeting";
			mondayGreeting.innerHTML = `
                <div class="greeting-content">
                    <h3>It's Monday! 🎉</h3>
                    <p>Time to plan your week ahead. What are your goals for this week?</p>
                </div>
            `;

			// Insert after the section header
			const sectionHeader = document.querySelector(
				"#weekly-goals-section .section-header"
			);
			if (sectionHeader) {
				sectionHeader.after(mondayGreeting);
			}
		}
	}

	async function addWeeklyGoal() {
		const text = goalText.value.trim();
		if (!text) return;

		try {
			const result = await window.electronAPI.createWeeklyGoal(text);
			if (result.success) {
				// Clear input
				goalText.value = "";

				// Reload goals
				loadWeeklyGoals();
			} else {
				console.error("Error adding goal:", result.error);
			}
		} catch (error) {
			console.error("Error adding weekly goal:", error);
		}
	}

	async function loadWeeklyGoals() {
		if (!inProgressGoalsList || !completedGoalsList) return;

		// Show loading in both tab contents
		inProgressGoalsList.innerHTML =
			'<div class="loading">Loading goals...</div>';
		completedGoalsList.innerHTML =
			'<div class="loading">Loading goals...</div>';

		try {
			const result = await window.electronAPI.getCurrentWeekGoals();
			if (result.success) {
				displayWeeklyGoals(result.goals);
			} else {
				inProgressGoalsList.innerHTML =
					'<div class="error">Failed to load weekly goals</div>';
				completedGoalsList.innerHTML =
					'<div class="error">Failed to load weekly goals</div>';
				console.error("Failed to load weekly goals:", result.error);
			}
		} catch (error) {
			inProgressGoalsList.innerHTML =
				'<div class="error">Failed to load weekly goals</div>';
			completedGoalsList.innerHTML =
				'<div class="error">Failed to load weekly goals</div>';
			console.error("Error loading weekly goals:", error);
		}
	}

	async function displayWeeklyGoals(goals) {
		// Group goals by completion status
		const activeGoals = goals.filter((goal) => !goal.completed);
		const completedGoals = goals.filter((goal) => goal.completed);

		// Display active goals in the "In Progress" tab
		if (activeGoals.length === 0) {
			inProgressGoalsList.innerHTML =
				'<div class="empty-state">No active goals yet. Start planning your week above!</div>';
		} else {
			inProgressGoalsList.innerHTML = "";
			activeGoals.forEach((goal) => {
				const goalElement = createGoalElement(goal);
				inProgressGoalsList.appendChild(goalElement);
			});
		}

		// Display completed goals in the "Completed" tab
		if (completedGoals.length === 0) {
			completedGoalsList.innerHTML =
				'<div class="empty-state">No completed goals yet.</div>';
		} else {
			completedGoalsList.innerHTML = "";
			completedGoals.forEach((goal) => {
				const goalElement = createGoalElement(goal);
				completedGoalsList.appendChild(goalElement);
			});
		}
	}

	function createGoalElement(goal) {
		const goalElement = document.createElement("div");
		goalElement.className = `goal-item ${
			goal.completed ? "completed" : ""
		}`;
		goalElement.dataset.id = goal.id;

		// Format creation date
		const creationDate = new Date(goal.created_at);
		const formattedCreationDate = creationDate.toLocaleDateString();

		// Include week number in the creation date display
		const weekInfo = goal.week_number ? ` (Week ${goal.week_number})` : "";

		// Format completion date if goal is completed
		let completionInfo = "";
		if (goal.completed && goal.completed_at) {
			const completionDate = new Date(goal.completed_at);
			const formattedCompletionDate = completionDate.toLocaleDateString();

			// Calculate the week number of completion
			const startOfYear = new Date(completionDate.getFullYear(), 0, 1);
			const daysSinceStart = Math.floor(
				(completionDate - startOfYear) / (24 * 60 * 60 * 1000)
			);
			const completionWeekNumber = Math.ceil(
				(daysSinceStart + startOfYear.getDay() + 1) / 7
			);

			completionInfo = `
				<div class="completion-info">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
						stroke-linecap="round" stroke-linejoin="round">
						<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
						<polyline points="22 4 12 14.01 9 11.01"></polyline>
					</svg>
					Completed on ${formattedCompletionDate} (Week ${completionWeekNumber})
				</div>
			`;
		}

		// Check if there are linked todos
		const linkedTodoCount = goal.todos ? goal.todos.length : 0;
		const completedTodoCount = goal.todos
			? goal.todos.filter((todo) => todo.completed).length
			: 0;

		// Calculate progress percentage
		const progressPercentage =
			linkedTodoCount > 0
				? Math.round((completedTodoCount / linkedTodoCount) * 100)
				: 0;

		goalElement.innerHTML = `
			<div class="goal-checkbox">
				<input type="checkbox" id="goal-${goal.id}" ${goal.completed ? "checked" : ""}>
				<label for="goal-${goal.id}" class="checkmark"></label>
			</div>
			<div class="goal-content">
				<div class="goal-text">${escapeHTML(goal.text)}</div>
				<div class="goal-meta">
					<span class="goal-date">Added on ${formattedCreationDate}${weekInfo}</span>
					${completionInfo}
					<div class="goal-progress">
						<div class="progress-bar">
							<div class="progress-fill" style="width: ${progressPercentage}%"></div>
						</div>
						<span class="progress-text">${completedTodoCount}/${linkedTodoCount} tasks</span>
					</div>
				</div>
			</div>
			<div class="goal-actions">
				<button class="link-todo-btn" title="Link Todo">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
						stroke-linecap="round" stroke-linejoin="round">
						<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
						<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
					</svg>
				</button>
				<button class="delete-btn" title="Delete Goal">
					<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
						stroke-linecap="round" stroke-linejoin="round">
						<path d="M3 6h18"></path>
						<path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"></path>
						<path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
					</svg>
				</button>
			</div>
		`;

		// Add event listeners
		// Toggle goal completion
		const checkbox = goalElement.querySelector(`#goal-${goal.id}`);
		checkbox.addEventListener("change", async () => {
			try {
				await window.electronAPI.toggleGoalCompletion(
					goal.id,
					checkbox.checked
				);
				goalElement.classList.toggle("completed", checkbox.checked);
				loadWeeklyGoals(); // Reload to update groupings
			} catch (error) {
				console.error("Error toggling goal completion:", error);
				checkbox.checked = !checkbox.checked; // Revert on error
			}
		});

		// Delete goal
		const deleteBtn = goalElement.querySelector(".delete-btn");
		deleteBtn.addEventListener("click", async () => {
			if (
				confirm(
					`Are you sure you want to delete the goal: "${goal.text}"?`
				)
			) {
				try {
					const result = await window.electronAPI.deleteWeeklyGoal(
						goal.id
					);
					if (result.success) {
						loadWeeklyGoals(); // Reload goals
					}
				} catch (error) {
					console.error("Error deleting goal:", error);
				}
			}
		});

		// Link todo
		const linkBtn = goalElement.querySelector(".link-todo-btn");
		linkBtn.addEventListener("click", async () => {
			try {
				// Get all active todos
				const todosResult = await window.electronAPI.getTodos();
				if (todosResult.success && todosResult.todos) {
					// Filter for uncompleted todos
					const activeTodos = todosResult.todos.filter(
						(todo) => !todo.completed
					);

					if (activeTodos.length === 0) {
						alert(
							"No active todos available to link. Create some todos first."
						);
						return;
					}

					// Create a modal for selecting todos
					showTodoSelectionModal(
						goal.id,
						activeTodos,
						goal.todos || []
					);
				}
			} catch (error) {
				console.error("Error getting todos for linking:", error);
			}
		});

		return goalElement;
	}

	function showTodoSelectionModal(goalId, allTodos, linkedTodos) {
		// Create modal
		const modal = document.createElement("div");
		modal.className = "modal";
		modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Link Todos to Goal</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="todo-selection-list">
                        <p>Select todos to link to this goal:</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="save-links-btn">Save</button>
                </div>
            </div>
        `;

		document.body.appendChild(modal);

		// Get linked todo IDs
		const linkedTodoIds = linkedTodos.map((todo) => todo.id);

		// Populate todos
		const todoList = modal.querySelector(".todo-selection-list");
		allTodos.forEach((todo) => {
			const isLinked = linkedTodoIds.includes(todo.id);

			const todoItem = document.createElement("div");
			todoItem.className = "todo-selection-item";
			todoItem.innerHTML = `
                <div class="todo-checkbox">
                    <input type="checkbox" id="todo-select-${
						todo.id
					}" data-id="${todo.id}" ${isLinked ? "checked" : ""}>
                    <label for="todo-select-${
						todo.id
					}" class="checkmark"></label>
                </div>
                <div class="todo-text">${escapeHTML(todo.text)}</div>
            `;

			todoList.appendChild(todoItem);
		});

		// Close modal handler
		const closeBtn = modal.querySelector(".close-btn");
		closeBtn.addEventListener("click", () => {
			document.body.removeChild(modal);
		});

		// Save links handler
		const saveBtn = modal.querySelector(".save-links-btn");
		saveBtn.addEventListener("click", async () => {
			try {
				// Get all checked checkboxes
				const checkedBoxes = modal.querySelectorAll(
					"input[type='checkbox']:checked"
				);
				const todoIds = Array.from(checkedBoxes).map((cb) =>
					parseInt(cb.dataset.id)
				);

				// Get all unchecked checkboxes (to unlink)
				const uncheckedBoxes = modal.querySelectorAll(
					"input[type='checkbox']:not(:checked)"
				);
				const unlinkIds = Array.from(uncheckedBoxes).map((cb) =>
					parseInt(cb.dataset.id)
				);

				// Link newly selected todos
				for (const todoId of todoIds) {
					if (!linkedTodoIds.includes(todoId)) {
						await window.electronAPI.linkTodoToGoal(todoId, goalId);
					}
				}

				// Unlink deselected todos
				for (const todoId of linkedTodoIds) {
					if (unlinkIds.some((id) => id === todoId)) {
						await window.electronAPI.unlinkTodoFromGoal(
							todoId,
							goalId
						);
					}
				}

				// Reload goals to update UI
				loadWeeklyGoals();

				// Close modal
				document.body.removeChild(modal);
			} catch (error) {
				console.error("Error updating todo links:", error);
			}
		});
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
