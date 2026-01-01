import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'music_urls.db'));

// Create table
db.exec(`
  CREATE TABLE IF NOT EXISTS urls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mode TEXT NOT NULL CHECK(mode IN ('sleep', 'relax', 'play', 'learning')),
    video_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_mode ON urls(mode);
`);

// Default URLs (from App.tsx)
const DEFAULT_URLS = {
    sleep: ["035d3iiFej4", "HAzZH6wccew", "XGSSmQiqBl8"],
    relax: ["Na0w3Mz46GA", "P6tFwmw2OEY", "n2-beumXxEM"],
    play: ["REtbaAA4j7U", "BW4H15rK6iI", "CaqHOvgAnO0"],
    learning: ["XzorjCt7Cv8", "O8BThfcH-F4", "hRxJRkMXuZI"],
};

export function initializeDatabase() {
    const count = db.prepare('SELECT COUNT(*) as count FROM urls').get();

    if (count.count === 0) {
        console.log('Initializing database with default URLs...');
        const insert = db.prepare('INSERT INTO urls (mode, video_id) VALUES (?, ?)');

        for (const [mode, videoIds] of Object.entries(DEFAULT_URLS)) {
            for (const videoId of videoIds) {
                insert.run(mode, videoId);
            }
        }
        console.log('Database initialized successfully.');
    }
}

export function getUrlsByMode(mode) {
    return db.prepare('SELECT id, video_id FROM urls WHERE mode = ? ORDER BY created_at').all(mode);
}

export function addUrl(mode, videoId) {
    const insert = db.prepare('INSERT INTO urls (mode, video_id) VALUES (?, ?)');
    return insert.run(mode, videoId);
}

export function deleteUrl(id) {
    const del = db.prepare('DELETE FROM urls WHERE id = ?');
    return del.run(id);
}

export default db;
