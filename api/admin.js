const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const User    = require('./models/User');

// ─── Admin Auth Middleware ─────────────────────────────────────
function adminOnly(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token)
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (decoded.role !== 'admin')
            return res.status(403).json({ success: false, message: 'Akses ditolak. Hanya admin.' });
        req.admin = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ success: false, message: 'Token tidak valid' });
    }
}

// ─── GET semua user ───────────────────────────────────────────
router.get('/users', adminOnly, async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ createdAt: -1 });
        res.json({ success: true, users, total: users.length });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Gagal mengambil data user' });
    }
});

// ─── CREATE user baru (hanya admin) ──────────────────────────
router.post('/users', adminOnly, async (req, res) => {
    try {
        const { username, email, password, role = 'user' } = req.body;

        if (!username || !email || !password)
            return res.status(400).json({ success: false, message: 'Username, email, dan password wajib diisi' });

        if (username.length < 3)
            return res.status(400).json({ success: false, message: 'Username minimal 3 karakter' });

        if (password.length < 6)
            return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email))
            return res.status(400).json({ success: false, message: 'Format email tidak valid' });

        if (!['user','admin'].includes(role))
            return res.status(400).json({ success: false, message: 'Role harus user atau admin' });

        const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
        if (existing) {
            if (existing.email === email.toLowerCase())
                return res.status(409).json({ success: false, message: 'Email sudah terdaftar' });
            return res.status(409).json({ success: false, message: 'Username sudah digunakan' });
        }

        const hashed = await bcrypt.hash(password, 12);
        const user = await User.create({
            username, email, password: hashed, role,
            createdBy: req.admin.username
        });

        return res.status(201).json({
            success: true,
            message: `Akun "${username}" berhasil dibuat`,
            user: { id: user._id, username: user.username, email: user.email, role: user.role, createdAt: user.createdAt }
        });

    } catch (err) {
        console.error('Create user error:', err);
        res.status(500).json({ success: false, message: 'Gagal membuat akun' });
    }
});

// ─── DELETE user (hanya admin, tidak bisa hapus diri sendiri) ─
router.delete('/users/:id', adminOnly, async (req, res) => {
    try {
        const { id } = req.params;

        if (id === req.admin.id)
            return res.status(400).json({ success: false, message: 'Tidak bisa menghapus akun sendiri' });

        const user = await User.findById(id);
        if (!user)
            return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

        await User.findByIdAndDelete(id);

        return res.json({
            success: true,
            message: `Akun "${user.username}" berhasil dihapus`
        });

    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ success: false, message: 'Gagal menghapus akun' });
    }
});

// ─── UPDATE password user ─────────────────────────────────────
router.patch('/users/:id/password', adminOnly, async (req, res) => {
    try {
        const { password } = req.body;
        if (!password || password.length < 6)
            return res.status(400).json({ success: false, message: 'Password minimal 6 karakter' });

        const user = await User.findById(req.params.id);
        if (!user)
            return res.status(404).json({ success: false, message: 'User tidak ditemukan' });

        user.password = await bcrypt.hash(password, 12);
        await user.save();

        return res.json({ success: true, message: `Password "${user.username}" berhasil diubah` });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Gagal mengubah password' });
    }
});

module.exports = router;
