import express from 'express';
import cors from 'cors';
import { initializeDatabase, getUrlsByMode, addUrl, deleteUrl } from './db.js';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Allow localhost and local network IPs
        if (origin.match(/^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):\d+$/)) {
            return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
    }
}));
app.use(express.json());

// Initialize database
initializeDatabase();

// Routes
app.get('/api/urls/:mode', (req, res) => {
    try {
        const { mode } = req.params;
        const urls = getUrlsByMode(mode);
        res.json(urls);
    } catch (error) {
        console.error('Error fetching URLs:', error);
        res.status(500).json({ error: 'Failed to fetch URLs' });
    }
});

app.post('/api/urls/:mode', (req, res) => {
    try {
        const { mode } = req.params;
        const { videoId } = req.body;

        if (!videoId) {
            return res.status(400).json({ error: 'videoId is required' });
        }

        const result = addUrl(mode, videoId);
        res.json({ id: result.lastInsertRowid, mode, videoId });
    } catch (error) {
        console.error('Error adding URL:', error);
        res.status(500).json({ error: 'Failed to add URL' });
    }
});

app.delete('/api/urls/:mode/:id', (req, res) => {
    try {
        const { id } = req.params;
        deleteUrl(parseInt(id));
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting URL:', error);
        res.status(500).json({ error: 'Failed to delete URL' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🎵 Baby Music App Server running on:`);
    console.log(`   - Local:   http://localhost:${PORT}`);
    console.log(`   - Network: http://192.168.40.94:${PORT}`);
});
