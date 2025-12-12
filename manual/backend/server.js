const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path");

// --- Setup ---
const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));
app.use(express.json());
app.use(session({
    secret: "replace_this_with_a_strong_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false, // true if using HTTPS
        sameSite: "strict"
    }
}));

// --- Database ---
const dbPath = path.join(__dirname, "database.sqlite");
const db = new sqlite3.Database(dbPath);

// Initialize tables
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT,
        is_admin INTEGER DEFAULT 0
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    // Create admin user if it doesn't exist
    const adminUsername = "admin";
    const adminPassword = "admin";

    db.get(`SELECT * FROM users WHERE username = ?`, [adminUsername], (err, row) => {
        if (err) return console.error(err);
        if (!row) {
            bcrypt.hash(adminPassword, 10, (err, hash) => {
                if (err) return console.error(err);
                db.run(`INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)`,
                    [adminUsername, hash], (err) => {
                        if (err) console.error(err);
                        else console.log("Admin user created");
                    });
            });
        }
    });
});

// --- Helper Middleware ---
function authRequired(req, res, next) {
    if (!req.session.user) return res.status(401).json({ error: "Not authenticated" });
    next();
}

// --- Routes ---

// Register new user
app.post("/api/register", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) return res.status(500).json({ error: "Server error" });
        db.run(`INSERT INTO users (username, password_hash) VALUES (?, ?)`, [username, hash], function(err) {
            if (err) return res.status(400).json({ error: "Username already exists" });
            res.json({ message: "User registered successfully" });
        });
    });
});

// Login
app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });

    db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, user) => {
        if (err) return res.status(500).json({ error: "Server error" });
        if (!user) return res.status(400).json({ error: "Invalid credentials" });

        bcrypt.compare(password, user.password_hash, (err, match) => {
            if (err) return res.status(500).json({ error: "Server error" });
            if (!match) return res.status(400).json({ error: "Invalid credentials" });

            req.session.user = { id: user.id, username: user.username, is_admin: !!user.is_admin };
            res.json({ message: "Logged in successfully", user: req.session.user });
        });
    });
});

// Logout
app.post("/api/logout", (req, res) => {
    req.session.destroy();
    res.json({ message: "Logged out" });
});

// Get all posts
app.get("/api/posts", authRequired, (req, res) => {
    db.all(`
        SELECT posts.id, posts.url, posts.created_at, users.username, posts.user_id
        FROM posts JOIN users ON posts.user_id = users.id
        ORDER BY posts.created_at DESC
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: "Server error" });
        res.json(rows);
    });
});

// Create new post
app.post("/api/posts", authRequired, (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: "URL is required" });

    db.run(`INSERT INTO posts (user_id, url) VALUES (?, ?)`, [req.session.user.id, url], function(err) {
        if (err) return res.status(500).json({ error: "Server error" });
        res.json({ message: "Post created", postId: this.lastID });
    });
});

// Delete a post
app.delete("/api/posts/:id", authRequired, (req, res) => {
    const postId = req.params.id;

    // Check ownership or admin
    db.get(`SELECT * FROM posts WHERE id = ?`, [postId], (err, post) => {
        if (err) return res.status(500).json({ error: "Server error" });
        if (!post) return res.status(404).json({ error: "Post not found" });

        if (post.user_id !== req.session.user.id && !req.session.user.is_admin) {
            return res.status(403).json({ error: "Forbidden" });
        }

        db.run(`DELETE FROM posts WHERE id = ?`, [postId], (err) => {
            if (err) return res.status(500).json({ error: "Server error" });
            res.json({ message: "Post deleted" });
        });
    });
});

// --- Start Server ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
