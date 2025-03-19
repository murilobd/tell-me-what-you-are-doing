const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const database = require("./database");
const scheduler = require("./scheduler");

// Keep a global reference to prevent garbage collection
let mainWindow;
let popupWindow;

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1450,
		height: 900,
		webPreferences: {
			preload: path.join(__dirname, "../preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
		},
	});

	mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));

	mainWindow.on("closed", () => {
		mainWindow = null;
	});
}

// Create the popup window
function createPopupWindow() {
	// Close existing popup if it exists
	if (popupWindow) {
		if (!popupWindow.isDestroyed()) {
			popupWindow.close();
		}
		popupWindow = null;
	}

	// Pause the timer while popup is displayed
	scheduler.pauseTimerForPopup();

	popupWindow = new BrowserWindow({
		width: 500,
		height: 700,
		alwaysOnTop: true,
		webPreferences: {
			preload: path.join(__dirname, "../preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
		},
	});

	popupWindow.loadFile(path.join(__dirname, "../renderer/views/popup.html"));

	// Don't show in taskbar
	popupWindow.setSkipTaskbar(true);

	// Handle the popup window being closed by the user
	popupWindow.on("closed", () => {
		// Only restart if it wasn't closed by submitting text
		if (!popupWindow.isSubmittedSuccessfully) {
			scheduler.restartTimerAfterPopup();
		}
		popupWindow = null;
	});
}

app.on("ready", () => {
	createWindow();
	scheduler.startScheduler(createPopupWindow, mainWindow);
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

// Handle IPC messages
ipcMain.on("save-text", (event, text) => {
	database.saveTextEntry(text);

	// Notify main window that history has been updated
	if (mainWindow && !mainWindow.isDestroyed()) {
		mainWindow.webContents.send("history-updated");
	}

	// Mark the popup as submitted successfully before closing
	if (popupWindow && !popupWindow.isDestroyed()) {
		popupWindow.isSubmittedSuccessfully = true;
		popupWindow.close();
		// Restart the timer after submission
		scheduler.restartTimerAfterPopup();
	}
});

ipcMain.handle("get-history", (event) => {
	return new Promise((resolve) => {
		database.getTextEntries(resolve);
	});
});

// Add new handler for getting next popup time
ipcMain.handle("get-next-popup-time", () => {
	return scheduler.getNextPopupTime();
});

// Handle IPC messages for timer control
ipcMain.handle("pause-timer", () => {
	return scheduler.pauseTimer();
});

ipcMain.handle("restart-timer", () => {
	return scheduler.restartTimer();
});

ipcMain.handle("is-timer-paused", () => {
	return scheduler.isTimerPaused();
});

// Add this handler near your other ipcMain handlers

// Handler for deleting entries
ipcMain.handle("delete-entry", async (event, id) => {
	try {
		const result = database.deleteEntry(id);
		return { success: true, result };
	} catch (error) {
		console.error("Error deleting entry:", error);
		return { success: false, error: error.message };
	}
});

// Todo IPC handlers
ipcMain.handle("create-todo", async (event, text, tags) => {
	try {
		const todoId = database.createTodo(text);

		// If tags were provided, assign them
		if (tags && Array.isArray(tags) && tags.length > 0) {
			for (const tagName of tags) {
				if (tagName && tagName.trim()) {
					const tag = database.getOrCreateTag(tagName.trim());
					database.assignTagToTodo(todoId, tag.id);
				}
			}
		}

		return { success: true, todoId };
	} catch (error) {
		console.error("Error creating todo:", error);
		return { success: false, error: error.message };
	}
});

ipcMain.handle("get-todos", async () => {
	try {
		const todos = database.getTodos();
		return { success: true, todos };
	} catch (error) {
		console.error("Error getting todos:", error);
		return { success: false, error: error.message };
	}
});

ipcMain.handle("delete-todo", async (event, id) => {
	try {
		const result = database.deleteTodo(id);
		return { success: true, result };
	} catch (error) {
		console.error("Error deleting todo:", error);
		return { success: false, error: error.message };
	}
});

ipcMain.handle("toggle-todo-completion", async (event, id, completed) => {
	try {
		const result = database.toggleTodoCompletion(id, completed);
		return { success: true, result };
	} catch (error) {
		console.error("Error toggling todo completion:", error);
		return { success: false, error: error.message };
	}
});

ipcMain.handle("get-all-tags", async () => {
	try {
		const tags = database.getAllTags();
		return { success: true, tags };
	} catch (error) {
		console.error("Error getting tags:", error);
		return { success: false, error: error.message };
	}
});

ipcMain.handle("assign-tag-to-todo", async (event, todoId, tagName) => {
	try {
		const tag = database.getOrCreateTag(tagName);
		const result = database.assignTagToTodo(todoId, tag.id);
		return { success: true, tagId: tag.id, result };
	} catch (error) {
		console.error("Error assigning tag:", error);
		return { success: false, error: error.message };
	}
});

ipcMain.handle("remove-tag-from-todo", async (event, todoId, tagId) => {
	try {
		const result = database.removeTagFromTodo(todoId, tagId);
		return { success: true, result };
	} catch (error) {
		console.error("Error removing tag:", error);
		return { success: false, error: error.message };
	}
});

// Weekly goals IPC handlers
ipcMain.handle("create-weekly-goal", async (event, text) => {
	try {
		const goalId = database.createWeeklyGoal(text);

		// Notify renderer of update
		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.webContents.send("goals-updated");
		}

		return { success: true, goalId };
	} catch (error) {
		console.error("Error creating weekly goal:", error);
		return { success: false, error: error.message };
	}
});

ipcMain.handle("get-current-week-goals", async () => {
	try {
		const goals = database.getCurrentWeekGoals();
		return { success: true, goals };
	} catch (error) {
		console.error("Error getting current week goals:", error);
		return { success: false, error: error.message };
	}
});

ipcMain.handle("get-week-goals", async (event, weekNumber, year) => {
	try {
		const goals = database.getWeekGoals(weekNumber, year);
		return { success: true, goals };
	} catch (error) {
		console.error("Error getting weekly goals:", error);
		return { success: false, error: error.message };
	}
});

ipcMain.handle("toggle-goal-completion", async (event, id, completed) => {
	try {
		const result = database.toggleGoalCompletion(id, completed);

		// Notify renderer of update
		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.webContents.send("goals-updated");
		}

		return { success: true, result };
	} catch (error) {
		console.error("Error toggling goal completion:", error);
		return { success: false, error: error.message };
	}
});

ipcMain.handle("delete-weekly-goal", async (event, id) => {
	try {
		const result = database.deleteWeeklyGoal(id);

		// Notify renderer of update
		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.webContents.send("goals-updated");
		}

		return { success: true, result };
	} catch (error) {
		console.error("Error deleting weekly goal:", error);
		return { success: false, error: error.message };
	}
});

ipcMain.handle("link-todo-to-goal", async (event, todoId, goalId) => {
	try {
		const result = database.linkTodoToGoal(todoId, goalId);
		return { success: true, result };
	} catch (error) {
		console.error("Error linking todo to goal:", error);
		return { success: false, error: error.message };
	}
});

ipcMain.handle("unlink-todo-from-goal", async (event, todoId, goalId) => {
	try {
		const result = database.unlinkTodoFromGoal(todoId, goalId);
		return { success: true, result };
	} catch (error) {
		console.error("Error unlinking todo from goal:", error);
		return { success: false, error: error.message };
	}
});

ipcMain.handle("get-goals-for-todo", async (event, todoId) => {
	try {
		const goals = database.getGoalsForTodo(todoId);
		return { success: true, goals };
	} catch (error) {
		console.error("Error getting goals for todo:", error);
		return { success: false, error: error.message };
	}
});

ipcMain.handle("get-current-week-number", async () => {
	try {
		const weekNumber = database.getCurrentWeekNumber();
		return { success: true, weekNumber };
	} catch (error) {
		console.error("Error getting current week number:", error);
		return { success: false, error: error.message };
	}
});
