require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── MongoDB Connection Caching ───────────────────────────────
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
        await seedAdmin(); // Buat admin default jika belum ada
    } catch (err) {
        isConnected = false;
        console.error('❌ MongoDB Error:', err.message);
        throw err;
    }
}

mongoose.connection.on('disconnected', () => {
    isConnected = false;
});

// ─── Auto-create Admin Default ────────────────────────────────
async function seedAdmin() {
    try {
        const User = require('./api/models/User');
        const adminExists = await User.findOne({ role: 'admin' });
        if (!adminExists) {
            const hashed = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'ShadowAdmin2026!', 12);
            await User.create({
                username: process.env.ADMIN_USERNAME || 'admin',
                email:    process.env.ADMIN_EMAIL    || 'admin@shadownex.com',
                password: hashed,
                role:     'admin'
            });
            console.log('👑 Admin default dibuat: admin / ShadowAdmin2026!');
        }
    } catch (e) {
        console.error('Seed admin error:', e.message);
    }
}

// ─── DB Middleware ─────────────────────────────────────────────
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (err) {
        res.status(503).json({ success: false, message: 'Database tidak tersedia.' });
    }
});

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/auth',  require('./api/auth'));
app.use('/api/chat',  require('./api/chat'));
app.use('/api/admin', require('./api/admin'));

app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        engine: 'DeepSeek', version: '3.0',
        timestamp: new Date().toISOString()
    });
});

// ─── Frontend ──────────────────────────────────────────────────
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log('🚀 Shadow-GPT v3.0 → http://localhost:' + PORT);
    });
}

module.exports = app;
