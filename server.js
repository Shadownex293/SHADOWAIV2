require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const mongoose = require('mongoose');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── MongoDB Connection Caching (penting untuk Vercel serverless) ─
let isConnected = false;

async function connectDB() {
    if (isConnected && mongoose.connection.readyState === 1) return;
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
            bufferCommands: false,
        });
        isConnected = true;
        console.log('✅ MongoDB Connected');
    } catch (err) {
        isConnected = false;
        console.error('❌ MongoDB Error:', err.message);
        throw err;
    }
}

mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('⚠️  MongoDB disconnected');
});

// Middleware: pastikan DB terhubung sebelum setiap request
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        res.status(503).json({ success: false, message: 'Database tidak tersedia, coba lagi.' });
    }
});

// ─── API Routes ──────────────────────────────────────────────
const authRouter = require('./api/auth');
const chatRouter = require('./api/chat');

app.use('/api/auth', authRouter);
app.use('/api/chat', chatRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        engine: 'DeepSeek',
        version: '2.0',
        timestamp: new Date().toISOString()
    });
});

// ─── Frontend (semua route ke index.html) ─────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Start (lokal) / Export (Vercel) ─────────────────────────
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log('🚀 Shadow-GPT running on http://localhost:' + PORT);
        console.log('🤖 Engine: DeepSeek API');
        console.log('🗄️  Database: MongoDB');
    });
}

// WAJIB untuk Vercel
module.exports = app;
