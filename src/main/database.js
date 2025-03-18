const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

// Get user data path
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const userDataPath = app.getPath("userData");
const dbPath = isDev
	? path.join(process.cwd(), "src", "db", "reminders.db")
	: path.join(userDataPath, "reminders.db");

// Ensure directory exists
if (!fs.existsSync(userDataPath)) {
	fs.mkdirSync(userDataPath, { recursive: true });
}

// Connect to database
const db = new Database(dbPath);

// Initialize database if needed
function initializeDatabase() {
	db.exec(`
        CREATE TABLE IF NOT EXISTS entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            datetime INTEGER NOT NULL
        );

		-- Todo items table
        CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            created_at INTEGER NOT NULL,
            completed INTEGER DEFAULT 0,
            completed_at INTEGER DEFAULT NULL
        );
        
        -- Tags table
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        );
        
        -- Junction table for todos and tags
        CREATE TABLE IF NOT EXISTS todo_tags (
            todo_id INTEGER NOT NULL,
            tag_id INTEGER NOT NULL,
            PRIMARY KEY (todo_id, tag_id),
            FOREIGN KEY (todo_id) REFERENCES todos (id) ON DELETE CASCADE,
            FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
        );
    `);
}

// Initialize on startup
initializeDatabase();

// Save a new text entry
function saveTextEntry(text) {
	const stmt = db.prepare(
		"INSERT INTO entries (text, datetime) VALUES (?, ?)"
	);
	stmt.run(text, Date.now());
}

// Get all text entries
function getTextEntries(callback) {
	const rows = db
		.prepare("SELECT * FROM entries ORDER BY datetime DESC")
		.all();
	callback(rows);
}

// Delete a text entry by ID
function deleteEntry(id) {
	const stmt = db.prepare("DELETE FROM entries WHERE id = ?");
	return stmt.run(id);
}

// New functions for to-do items
function createTodo(text) {
	const stmt = db.prepare(
		"INSERT INTO todos (text, created_at) VALUES (?, ?)"
	);
	const info = stmt.run(text, Date.now());
	return info.lastInsertRowid;
}

function getTodos() {
	// Get all todos with their tags
	const todos = db
		.prepare(
			`
        SELECT 
            t.id, t.text, t.created_at, t.completed, t.completed_at 
        FROM 
            todos t
        ORDER BY 
            t.completed ASC, t.created_at DESC
    `
		)
		.all();

	// For each todo, get its tags
	const todoWithTags = todos.map((todo) => {
		const tags = db
			.prepare(
				`
            SELECT 
                tags.id, tags.name
            FROM 
                tags
            JOIN 
                todo_tags ON tags.id = todo_tags.tag_id
            WHERE 
                todo_tags.todo_id = ?
        `
			)
			.all(todo.id);

		return { ...todo, tags };
	});

	return todoWithTags;
}

function deleteTodo(id) {
	// Will cascade delete in todo_tags due to foreign key constraint
	const stmt = db.prepare("DELETE FROM todos WHERE id = ?");
	return stmt.run(id);
}

function toggleTodoCompletion(id, completed) {
	const completedAt = completed ? Date.now() : null;
	const stmt = db.prepare(
		"UPDATE todos SET completed = ?, completed_at = ? WHERE id = ?"
	);
	return stmt.run(completed ? 1 : 0, completedAt, id);
}

// Tag functions
function getAllTags() {
	return db.prepare("SELECT * FROM tags ORDER BY name").all();
}

function getOrCreateTag(tagName) {
	// First try to get the tag
	let tag = db.prepare("SELECT * FROM tags WHERE name = ?").get(tagName);

	// If it doesn't exist, create it
	if (!tag) {
		const stmt = db.prepare("INSERT INTO tags (name) VALUES (?)");
		const info = stmt.run(tagName);
		tag = { id: info.lastInsertRowid, name: tagName };
	}

	return tag;
}

function assignTagToTodo(todoId, tagId) {
	// First check if this relationship already exists
	const existing = db
		.prepare("SELECT 1 FROM todo_tags WHERE todo_id = ? AND tag_id = ?")
		.get(todoId, tagId);

	// If not, create it
	if (!existing) {
		const stmt = db.prepare(
			"INSERT INTO todo_tags (todo_id, tag_id) VALUES (?, ?)"
		);
		return stmt.run(todoId, tagId);
	}

	return { changes: 0 }; // No changes made
}

function removeTagFromTodo(todoId, tagId) {
	const stmt = db.prepare(
		"DELETE FROM todo_tags WHERE todo_id = ? AND tag_id = ?"
	);
	return stmt.run(todoId, tagId);
}

function getTagsForTodo(todoId) {
	return db
		.prepare(
			`
        SELECT tags.* FROM tags
        JOIN todo_tags ON tags.id = todo_tags.tag_id
        WHERE todo_tags.todo_id = ?
    `
		)
		.all(todoId);
}

module.exports = {
	// Existing exports
	saveTextEntry,
	getTextEntries,
	deleteEntry,

	// New exports for todos
	createTodo,
	getTodos,
	deleteTodo,
	toggleTodoCompletion,

	// Tag-related exports
	getAllTags,
	getOrCreateTag,
	assignTagToTodo,
	removeTagFromTodo,
	getTagsForTodo,
};
