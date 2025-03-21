const { contextBridge, ipcRenderer } = require("electron");

// Expose protected methods for renderer process
contextBridge.exposeInMainWorld("electronAPI", {
	// Existing APIs
	saveText: (text) => ipcRenderer.send("save-text", text),
	getHistory: () => ipcRenderer.invoke("get-history"),
	deleteEntry: (id) => ipcRenderer.invoke("delete-entry", id),

	// Timer related APIs
	getNextPopupTime: () => ipcRenderer.invoke("get-next-popup-time"),
	onTimerUpdate: (callback) =>
		ipcRenderer.on("timer-update", (_, nextPopupTime) =>
			callback(nextPopupTime)
		),
	pauseTimer: () => ipcRenderer.invoke("pause-timer"),
	restartTimer: () => ipcRenderer.invoke("restart-timer"),
	isTimerPaused: () => ipcRenderer.invoke("is-timer-paused"),
	onTimerPaused: (callback) =>
		ipcRenderer.on("timer-paused", () => callback()),

	// History refresh event
	onHistoryUpdated: (callback) =>
		ipcRenderer.on("history-updated", () => callback()),

	// NEW: Todo related APIs
	createTodo: (text, tags) => ipcRenderer.invoke("create-todo", text, tags),
	getTodos: () => ipcRenderer.invoke("get-todos"),
	deleteTodo: (id) => ipcRenderer.invoke("delete-todo", id),
	toggleTodoCompletion: (id, completed) =>
		ipcRenderer.invoke("toggle-todo-completion", id, completed),
	getAllTags: () => ipcRenderer.invoke("get-all-tags"),
	assignTagToTodo: (todoId, tagName) =>
		ipcRenderer.invoke("assign-tag-to-todo", todoId, tagName),
	removeTagFromTodo: (todoId, tagId) =>
		ipcRenderer.invoke("remove-tag-from-todo", todoId, tagId),

	// NEW: Weekly goals APIs
	createWeeklyGoal: (text) => ipcRenderer.invoke("create-weekly-goal", text),
	getCurrentWeekGoals: () => ipcRenderer.invoke("get-current-week-goals"),
	getWeekGoals: (weekNumber, year) =>
		ipcRenderer.invoke("get-week-goals", weekNumber, year),
	toggleGoalCompletion: (id, completed) =>
		ipcRenderer.invoke("toggle-goal-completion", id, completed),
	deleteWeeklyGoal: (id) => ipcRenderer.invoke("delete-weekly-goal", id),
	linkTodoToGoal: (todoId, goalId) =>
		ipcRenderer.invoke("link-todo-to-goal", todoId, goalId),
	unlinkTodoFromGoal: (todoId, goalId) =>
		ipcRenderer.invoke("unlink-todo-from-goal", todoId, goalId),
	getGoalsForTodo: (todoId) =>
		ipcRenderer.invoke("get-goals-for-todo", todoId),
	getCurrentWeekNumber: () => ipcRenderer.invoke("get-current-week-number"),

	// Event notification for goal updates
	onGoalsUpdated: (callback) =>
		ipcRenderer.on("goals-updated", () => callback()),
});
