const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const mongoose = require('mongoose');

// ─── User Schema ─────────────────────────────────────────────
const userSchema = new mongoose.Schema({
    username: {
        type: String, required: true, unique: true,
        trim: true, minlength: 3, maxlength: 30
    },
    email: {
        type: String, required: true, unique: true,
        trim: true, lowercase: true
    },
    password: {
        type: String, required: true, minlength: 6
    },
    createdAt: { type: Date, default: Date.now },
    lastLogin:  { type: Date, default: null }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// ─── Generate Token TANPA MASA AKTIF ─────────────────────────
// Token berlaku selamanya (selama server aktif & JWT_SECRET tidak berubah)
function generateToken(user) {
    return jwt.sign(
        { id: user._id, username: user.username, email: user.email },
        process.env.JWT_SECRET
        // ← sengaja TIDAK ada expiresIn = token tidak pernah expired
    );
}

// ─── REGISTER ─────────────────────────────────────────────────
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password)
            return res.status(400).json({ success: false, message: 'Semua field wajib diisi' });

        if (username.length < 3)
            return res.status(400).json({ success: false, message: 'Username minimal 3 karakter' });

        if (password.length < 6)
            return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email))
            return res.status(400).json({ success: false, message: 'Format email tidak valid' });

        // Cek duplikat
        const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
        if (existing) {
            if (existing.email === email.toLowerCase())
                return res.status(409).json({ success: false, message: 'Email sudah terdaftar' });
            return res.status(409).json({ success: false, message: 'Username sudah digunakan' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = new User({ username, email, password: hashedPassword });
        await user.save();

        const token = generateToken(user);

        return res.status(201).json({
            success: true,
            message: 'Akun berhasil dibuat',
            token,
            user: { id: user._id, username: user.username, email: user.email }
        });

    } catch (err) {
        console.error('Register error:', err);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    }
});

// ─── LOGIN ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password)
            return res.status(400).json({ success: false, message: 'Email dan password wajib diisi' });

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            await new Promise(r => setTimeout(r, 800));
            return res.status(401).json({ success: false, message: 'Email atau password salah' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            await new Promise(r => setTimeout(r, 800));
            return res.status(401).json({ success: false, message: 'Email atau password salah' });
        }

        user.lastLogin = new Date();
        await user.save();

        const token = generateToken(user);

        return res.status(200).json({
            success: true,
            message: 'Login berhasil',
            token,
            user: { id: user._id, username: user.username, email: user.email }
        });

    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    }
});

// ─── VERIFY / GET ME ──────────────────────────────────────────
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token)
            return res.status(401).json({ success: false, message: 'Token tidak ditemukan' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user    = await User.findById(decoded.id).select('-password');

        if (!user)
            return res.status(401).json({ success: false, message: 'User tidak ditemukan' });

        return res.status(200).json({ success: true, user });

    } catch (err) {
        return res.status(401).json({ success: false, message: 'Token tidak valid' });
    }
});

module.exports = router;
