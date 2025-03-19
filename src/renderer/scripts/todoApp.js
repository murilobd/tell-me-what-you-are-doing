document.addEventListener("DOMContentLoaded", () => {
	// Elements
	const todoText = document.getElementById("todo-text");
	const todoTags = document.getElementById("todo-tags");
	const addTodoBtn = document.getElementById("add-todo-btn");
	const refreshTodosBtn = document.getElementById("refresh-todos-btn");
	const todoList = document.getElementById("todo-list");

	// Load todos on page load
	loadTodos();

	// Event listeners
	if (addTodoBtn) {
		addTodoBtn.addEventListener("click", addTodo);
	}

	if (refreshTodosBtn) {
		refreshTodosBtn.addEventListener("click", loadTodos);
	}

	// Add todo function
	async function addTodo() {
		const text = todoText.value.trim();
		if (!text) return;

		const tagsInput = todoTags.value.trim();
		const tags = tagsInput
			? tagsInput.split(",").map((tag) => tag.trim())
			: [];

		try {
			const result = await window.electronAPI.createTodo(text, tags);
			if (result.success) {
				// Clear inputs
				todoText.value = "";
				todoTags.value = "";

				// Reload todos
				loadTodos();
			} else {
				console.error("Failed to add todo:", result.error);
			}
		} catch (error) {
			console.error("Error adding todo:", error);
		}
	}

	// Load todos function
	async function loadTodos() {
		todoList.innerHTML = '<div class="loading">Loading todos...</div>';

		try {
			const result = await window.electronAPI.getTodos();
			if (result.success) {
				displayTodos(result.todos);
			} else {
				todoList.innerHTML =
					'<div class="error">Failed to load todos</div>';
				console.error("Failed to load todos:", result.error);
			}
		} catch (error) {
			todoList.innerHTML =
				'<div class="error">Failed to load todos</div>';
			console.error("Error loading todos:", error);
		}
	}

	// Display todos function
	function displayTodos(todos) {
		if (!todos || todos.length === 0) {
			todoList.innerHTML =
				'<div class="empty-state">No tasks yet. Add one above!</div>';
			return;
		}

		todoList.innerHTML = "";

		// Group todos by completed status
		const activeTodos = todos.filter((todo) => !todo.completed);
		const completedTodos = todos.filter((todo) => todo.completed);

		// Add active todos first
		if (activeTodos.length > 0) {
			const activeSection = document.createElement("div");
			activeSection.className = "todo-section";
			activeSection.innerHTML = "<h3>Active Tasks</h3>";
			todoList.appendChild(activeSection);

			activeTodos.forEach(async (todo) => {
				const todoItem = await createTodoElement(todo);
				todoList.appendChild(todoItem);
			});
		}

		// Add completed todos
		if (completedTodos.length > 0) {
			const completedSection = document.createElement("div");
			completedSection.className = "todo-section completed-section";
			completedSection.innerHTML = "<h3>Completed Tasks</h3>";
			todoList.appendChild(completedSection);

			completedTodos.forEach(async (todo) => {
				const todoItem = await createTodoElement(todo);
				todoList.appendChild(todoItem);
			});
		}
	}

	// Create todo element function
	async function createTodoElement(todo) {
		const todoItem = document.createElement("div");
		todoItem.className = `todo-item ${todo.completed ? "completed" : ""}`;
		todoItem.dataset.id = todo.id;

		// Format date
		const createdDate = new Date(todo.created_at).toLocaleDateString();
		const createdTime = new Date(todo.created_at).toLocaleTimeString();

		// Create HTML structure
		todoItem.innerHTML = `
            <div class="todo-checkbox">
                <input type="checkbox" id="todo-${todo.id}" ${
			todo.completed ? "checked" : ""
		}>
                <label for="todo-${todo.id}" class="checkmark"></label>
            </div>
            <div class="todo-content">
                <div class="todo-text">${escapeHTML(todo.text)}</div>
                <div class="todo-meta">
                    <span class="todo-date">Created: ${createdDate} at ${createdTime}</span>
                    <div class="todo-tags"></div>
                    <div class="linked-goals">
                        <span class="linked-goals-label"></span>
                        <div class="goals-list"></div>
                    </div>
                </div>
            </div>
            <div class="todo-actions">
                <button class="tag-btn" title="Add Tag">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"></path>
                        <line x1="7" y1="7" x2="7.01" y2="7"></line>
                    </svg>
                </button>
                <button class="link-goal-btn" title="Link to Goal">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                </button>
                <button class="delete-btn" title="Delete Task">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6"></path>
                        <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                    </svg>
                </button>
            </div>
        `;

		// Add tags
		const tagsContainer = todoItem.querySelector(".todo-tags");
		if (todo.tags && todo.tags.length > 0) {
			todo.tags.forEach((tag) => {
				const tagElement = document.createElement("span");
				tagElement.className = "tag";
				tagElement.dataset.id = tag.id;
				tagElement.innerHTML = `
                    ${escapeHTML(tag.name)}
                    <button class="remove-tag">×</button>
                `;

				// Add event listener to remove tag button
				tagElement
					.querySelector(".remove-tag")
					.addEventListener("click", async (e) => {
						e.stopPropagation();
						try {
							const result =
								await window.electronAPI.removeTagFromTodo(
									todo.id,
									tag.id
								);
							if (result.success) {
								tagElement.remove();
							}
						} catch (error) {
							console.error("Error removing tag:", error);
						}
					});

				tagsContainer.appendChild(tagElement);
			});
		}

		// Get and display linked goals
		try {
			const result = await window.electronAPI.getGoalsForTodo(todo.id);
			if (result.success && result.goals && result.goals.length > 0) {
				const linkedGoalsLabel = todoItem.querySelector(
					".linked-goals-label"
				);
				linkedGoalsLabel.textContent = "Contributing to:";

				const goalsList = todoItem.querySelector(".goals-list");
				result.goals.forEach((goal) => {
					const goalElement = document.createElement("div");
					goalElement.className = `linked-goal ${
						goal.completed ? "completed" : ""
					}`;

					goalElement.innerHTML = `
                        <span class="goal-text">${escapeHTML(goal.text)}</span>
                        <button class="unlink-goal" title="Unlink from this goal">×</button>
                    `;

					// Add event listener for unlinking goal
					goalElement
						.querySelector(".unlink-goal")
						.addEventListener("click", async (e) => {
							e.stopPropagation();
							try {
								const result =
									await window.electronAPI.unlinkTodoFromGoal(
										todo.id,
										goal.id
									);
								if (result.success) {
									goalElement.remove();
									// If no more goals, hide the label
									if (goalsList.children.length === 0) {
										linkedGoalsLabel.textContent = "";
									}
								}
							} catch (error) {
								console.error("Error unlinking goal:", error);
							}
						});

					goalsList.appendChild(goalElement);
				});
			}
		} catch (error) {
			console.error("Error getting linked goals:", error);
		}

		// Event listeners for todo actions
		// 1. Toggle completion
		const checkbox = todoItem.querySelector('input[type="checkbox"]');
		checkbox.addEventListener("change", async () => {
			try {
				await window.electronAPI.toggleTodoCompletion(
					todo.id,
					checkbox.checked
				);
				todoItem.classList.toggle("completed", checkbox.checked);

				// Reload todos to update the grouping
				loadTodos();
			} catch (error) {
				console.error("Error toggling todo completion:", error);
				checkbox.checked = !checkbox.checked; // Revert the change
			}
		});

		// 2. Delete todo
		const deleteBtn = todoItem.querySelector(".delete-btn");
		deleteBtn.addEventListener("click", async () => {
			if (confirm(`Are you sure you want to delete "${todo.text}"?`)) {
				try {
					const result = await window.electronAPI.deleteTodo(todo.id);
					if (result.success) {
						todoItem.remove();
						// If no items left, check if we need to show empty state
						if (
							todoList.querySelectorAll(".todo-item").length === 0
						) {
							loadTodos(); // Reload to show empty state
						}
					}
				} catch (error) {
					console.error("Error deleting todo:", error);
				}
			}
		});

		// 3. Add tag
		const tagBtn = todoItem.querySelector(".tag-btn");
		tagBtn.addEventListener("click", () => {
			const tagName = prompt("Enter a tag name:");
			if (tagName && tagName.trim()) {
				addTagToTodo(todo.id, tagName.trim(), tagsContainer);
			}
		});

		// 4. Link to goal
		const linkGoalBtn = todoItem.querySelector(".link-goal-btn");
		linkGoalBtn.addEventListener("click", async () => {
			try {
				// Get current week's goals
				const result = await window.electronAPI.getCurrentWeekGoals();
				if (result.success && result.goals) {
					// Filter for active goals only
					const activeGoals = result.goals.filter(
						(goal) => !goal.completed
					);

					if (activeGoals.length === 0) {
						alert(
							"No active goals available. Create some weekly goals first!"
						);
						return;
					}

					// Get current links
					const linkedGoals =
						await window.electronAPI.getGoalsForTodo(todo.id);
					const linkedGoalIds = linkedGoals.success
						? linkedGoals.goals.map((g) => g.id)
						: [];

					// Show goal selection modal
					showGoalSelectionModal(todo.id, activeGoals, linkedGoalIds);
				} else {
					alert("Failed to load goals. Please try again.");
				}
			} catch (error) {
				console.error("Error loading goals for linking:", error);
				alert("An error occurred. Please try again.");
			}
		});

		return todoItem;
	}

	// Function to show goal selection modal
	function showGoalSelectionModal(todoId, allGoals, linkedGoalIds) {
		// Create modal
		const modal = document.createElement("div");
		modal.className = "modal";
		modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Link to Weekly Goals</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="goal-selection-list">
                        <p>Select goals that this task contributes to:</p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="save-links-btn">Save</button>
                </div>
            </div>
        `;

		document.body.appendChild(modal);

		// Populate goals
		const goalList = modal.querySelector(".goal-selection-list");
		allGoals.forEach((goal) => {
			const isLinked = linkedGoalIds.includes(goal.id);

			const goalItem = document.createElement("div");
			goalItem.className = "goal-selection-item";
			goalItem.innerHTML = `
            <div class="goal-checkbox">
                <input type="checkbox" id="goal-select-${goal.id}" data-id="${
				goal.id
			}" ${isLinked ? "checked" : ""}>
                <label for="goal-select-${goal.id}" class="checkmark"></label>
            </div>
            <div class="goal-text">${escapeHTML(goal.text)}</div>
        `;

			goalList.appendChild(goalItem);
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
				const goalIds = Array.from(checkedBoxes).map((cb) =>
					parseInt(cb.dataset.id)
				);

				// Get all unchecked checkboxes (to unlink)
				const uncheckedBoxes = modal.querySelectorAll(
					"input[type='checkbox']:not(:checked)"
				);
				const unlinkIds = Array.from(uncheckedBoxes).map((cb) =>
					parseInt(cb.dataset.id)
				);

				// Link newly selected goals
				for (const goalId of goalIds) {
					if (!linkedGoalIds.includes(goalId)) {
						await window.electronAPI.linkTodoToGoal(todoId, goalId);
					}
				}

				// Unlink deselected goals
				for (const goalId of linkedGoalIds) {
					if (unlinkIds.some((id) => id === goalId)) {
						await window.electronAPI.unlinkTodoFromGoal(
							todoId,
							goalId
						);
					}
				}

				// Reload todos to update UI
				loadTodos();

				// Close modal
				document.body.removeChild(modal);
			} catch (error) {
				console.error("Error updating goal links:", error);
			}
		});
	}

	// Add tag to todo function
	async function addTagToTodo(todoId, tagName, tagsContainer) {
		try {
			const result = await window.electronAPI.assignTagToTodo(
				todoId,
				tagName
			);
			if (result.success) {
				const tagElement = document.createElement("span");
				tagElement.className = "tag";
				tagElement.dataset.id = result.tagId;
				tagElement.innerHTML = `
                    ${escapeHTML(tagName)}
                    <button class="remove-tag">×</button>
                `;

				// Add event listener to remove tag button
				tagElement
					.querySelector(".remove-tag")
					.addEventListener("click", async (e) => {
						e.stopPropagation();
						try {
							const removeResult =
								await window.electronAPI.removeTagFromTodo(
									todoId,
									result.tagId
								);
							if (removeResult.success) {
								tagElement.remove();
							}
						} catch (error) {
							console.error("Error removing tag:", error);
						}
					});

				tagsContainer.appendChild(tagElement);
			}
		} catch (error) {
			console.error("Error adding tag:", error);
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

	// Support for Enter key in the input fields
	todoText.addEventListener("keypress", (e) => {
		if (e.key === "Enter") {
			addTodo();
		}
	});

	todoTags.addEventListener("keypress", (e) => {
		if (e.key === "Enter") {
			addTodo();
		}
	});
});
