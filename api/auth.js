const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const User    = require('./models/User');

// Token TANPA masa aktif — berlaku selamanya selama server hidup
function generateToken(user) {
    return jwt.sign(
        { id: user._id, username: user.username, email: user.email, role: user.role },
        process.env.JWT_SECRET
        // Tidak ada expiresIn → token tidak pernah expired
    );
}

// ─── LOGIN (satu-satunya akses publik) ────────────────────────
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
            user: { id: user._id, username: user.username, email: user.email, role: user.role }
        });

    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ success: false, message: 'Terjadi kesalahan server' });
    }
});

// ─── VERIFY TOKEN ─────────────────────────────────────────────
router.get('/me', async (req, res) => {
    try {
        const token = req.headers['authorization']?.split(' ')[1];
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
