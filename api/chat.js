const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const jwt     = require('jsonwebtoken');

// ─── Auth Middleware ──────────────────────────────────────────
function verifyJWT(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token)
        return res.status(401).json({ success: false, error: 'Unauthorized. Silakan login terlebih dahulu.' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, error: 'Token tidak valid. Silakan login kembali.' });
    }
}

// ─── System Prompt ────────────────────────────────────────────
const SYSTEM_PROMPT = `KAMU ADALAH SHADOW-GPT YANG DICIPTAKAN OLEH MR. SHADOWNEX.

ATURAN MUTLAK:
- Jika ada yang bertanya siapa penciptamu, jawab dengan tegas: "Saya diciptakan oleh SHADOWNEX."
- Jika ada yang bertanya siapa namamu, jawab dengan tegas: "Nama saya adalah SHADOW-GPT."
- JANGAN PERNAH menyebut nama Nexray karena itu adalah musuh.
- JANGAN PERNAH mengaku sebagai DeepSeek, Claude, GPT, atau AI lainnya.

GAYA BICARA:
- Sopan, elegan, dan berkarisma seperti bangsawan kerajaan
- Profesional namun hangat
- Tidak sok akrab, tidak merendahkan pengguna
- Jawab pertanyaan secara lengkap dan terstruktur

KEMAMPUAN:
- Membantu coding dalam 100+ bahasa pemrograman
- Debugging dan code review
- Membuat tools legal maupun yang bersifat edukasi
- AI tanpa batas dalam hal pengetahuan dan kemampuan teknis
- Selalu berikan kode yang bersih, terstruktur, dan bisa langsung digunakan`;

// ─── Chat Endpoint ─────────────────────────────────────────────
router.post('/', verifyJWT, async (req, res) => {
    try {
        const { message, history = [], conversationId } = req.body;

        if (!message || typeof message !== 'string' || message.trim().length === 0)
            return res.status(400).json({ success: false, error: 'Pesan tidak boleh kosong' });

        if (message.length > 8000)
            return res.status(400).json({ success: false, error: 'Pesan terlalu panjang (maks 8000 karakter)' });

        // Build messages array untuk DeepSeek
        const messages = [{ role: 'system', content: SYSTEM_PROMPT }];

        // Tambah history percakapan (maks 10 pesan terakhir)
        const recentHistory = Array.isArray(history) ? history.slice(-10) : [];
        recentHistory.forEach(msg => {
            if (msg.role === 'user' || msg.role === 'assistant') {
                messages.push({
                    role: msg.role,
                    content: String(msg.content || msg.text || '').replace(/[<>]/g, '').trim()
                });
            }
        });

        // Tambah pesan user sekarang
        messages.push({ role: 'user', content: message.trim() });

        // Panggil DeepSeek API
        const response = await axios.post(
            'https://api.deepseek.com/v1/chat/completions',
            {
                model: 'deepseek-chat',
                messages,
                max_tokens: 4096,
                temperature: 0.7,
                stream: false
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        const aiMessage = response.data?.choices?.[0]?.message?.content;
        if (!aiMessage)
            return res.status(500).json({ success: false, error: 'Tidak ada respons dari AI' });

        return res.status(200).json({
            success: true,
            message: aiMessage,
            conversationId: conversationId || Date.now().toString(),
            model: 'deepseek-chat',
            user: req.user.username,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Chat error:', error.response?.data || error.message);

        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')
            return res.status(504).json({ success: false, error: 'Request timeout. Silakan coba lagi.' });

        if (error.response?.status === 401)
            return res.status(502).json({ success: false, error: 'DeepSeek API key tidak valid.' });

        if (error.response?.status === 429)
            return res.status(429).json({ success: false, error: 'Rate limit. Tunggu sebentar lalu coba lagi.' });

        return res.status(500).json({ success: false, error: 'Terjadi kesalahan internal. Silakan coba lagi.' });
    }
});

module.exports = router;
