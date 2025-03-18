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

			activeTodos.forEach((todo) => {
				const todoItem = createTodoElement(todo);
				todoList.appendChild(todoItem);
			});
		}

		// Add completed todos
		if (completedTodos.length > 0) {
			const completedSection = document.createElement("div");
			completedSection.className = "todo-section completed-section";
			completedSection.innerHTML = "<h3>Completed Tasks</h3>";
			todoList.appendChild(completedSection);

			completedTodos.forEach((todo) => {
				const todoItem = createTodoElement(todo);
				todoList.appendChild(todoItem);
			});
		}
	}

	// Create todo element function
	function createTodoElement(todo) {
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
                </div>
            </div>
            <div class="todo-actions">
                <button class="tag-btn" title="Add Tag">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"></path>
                        <line x1="7" y1="7" x2="7.01" y2="7"></line>
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

		return todoItem;
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
