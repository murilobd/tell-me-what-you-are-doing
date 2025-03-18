const { ipcMain } = require("electron");

// Time interval in milliseconds
const POPUP_INTERVAL = 15 * 60 * 1000; // 15 minutes

let nextPopupTime = 0;
let mainWindow = null;
let timerInterval = null;
let isPaused = false;
let isPausedForPopup = false;
let pausedTimeRemaining = null;

function startScheduler(showPopupCallback, mainWindowRef) {
	mainWindow = mainWindowRef;

	// Set initial popup time
	updateNextPopupTime();

	// Show popup immediately on start
	showPopupCallback();

	// Set interval for future popups
	timerInterval = setInterval(() => {
		if (!isPaused && !isPausedForPopup) {
			updateNextPopupTime();
			showPopupCallback();
		}
	}, POPUP_INTERVAL);
}

function updateNextPopupTime() {
	nextPopupTime = Date.now() + POPUP_INTERVAL;

	// Send timer update to renderer if window exists
	if (mainWindow && !mainWindow.isDestroyed()) {
		mainWindow.webContents.send("timer-update", nextPopupTime);
	}
}

function getNextPopupTime() {
	return isPaused || isPausedForPopup ? null : nextPopupTime;
}

// Pause timer when popup is displayed (separate from manual pause)
function pauseTimerForPopup() {
	if (!isPausedForPopup) {
		isPausedForPopup = true;
		pausedTimeRemaining = nextPopupTime - Date.now();

		// Notify renderer that timer is paused
		// (using same event as manual pause for UI consistency)
		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.webContents.send("timer-paused");
		}
		return true;
	}
	return false;
}

// Restart timer when popup is closed
function restartTimerAfterPopup() {
	if (isPausedForPopup) {
		isPausedForPopup = false;

		// Only restart if not manually paused
		if (!isPaused) {
			nextPopupTime = Date.now() + pausedTimeRemaining;
			pausedTimeRemaining = null;

			// Notify renderer
			if (mainWindow && !mainWindow.isDestroyed()) {
				mainWindow.webContents.send("timer-update", nextPopupTime);
			}
		}
		return true;
	}
	return false;
}

function pauseTimer() {
	if (!isPaused) {
		isPaused = true;
		pausedTimeRemaining = nextPopupTime - Date.now();

		// Notify renderer
		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.webContents.send("timer-paused");
		}
		return true;
	}
	return false;
}

function restartTimer() {
	if (isPaused) {
		isPaused = false;
		nextPopupTime = Date.now() + pausedTimeRemaining;
		pausedTimeRemaining = null;

		// Notify renderer
		if (mainWindow && !mainWindow.isDestroyed()) {
			mainWindow.webContents.send("timer-update", nextPopupTime);
		}
		return true;
	}
	return false;
}

function isTimerPaused() {
	return isPaused || isPausedForPopup;
}

module.exports = {
	startScheduler,
	getNextPopupTime,
	pauseTimer,
	restartTimer,
	isTimerPaused,
	pauseTimerForPopup,
	restartTimerAfterPopup,
};
