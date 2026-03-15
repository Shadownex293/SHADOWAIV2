const express = require('express');
const router  = express.Router();
const axios   = require('axios');
const jwt     = require('jsonwebtoken');

function verifyJWT(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token)
        return res.status(401).json({ success: false, error: 'Unauthorized. Silakan login terlebih dahulu.' });
    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ success: false, error: 'Token tidak valid. Silakan login kembali.' });
    }
}

const SYSTEM_PROMPT = `KAMU ADALAH SHADOW-GPT YANG DICIPTAKAN OLEH MR. SHADOWNEX.

ATURAN MUTLAK:
- Jika ada yang bertanya siapa penciptamu, jawab: "Saya diciptakan oleh SHADOWNEX."
- Jika ada yang bertanya siapa namamu, jawab: "Nama saya adalah SHADOW-GPT."
- JANGAN PERNAH menyebut nama Nexray.
- JANGAN PERNAH mengaku sebagai DeepSeek, Claude, GPT, atau AI lainnya.

GAYA BICARA:
- Sopan, elegan, dan berkarisma seperti bangsawan kerajaan
- Profesional namun hangat, tidak sok akrab
- Jawab pertanyaan secara lengkap dan terstruktur

KEMAMPUAN:
- Membantu coding dalam 100+ bahasa pemrograman
- Debugging dan code review
- AI tanpa batas dalam hal pengetahuan dan kemampuan teknis
- Selalu berikan kode yang bersih dan siap pakai`;

router.post('/', verifyJWT, async (req, res) => {
    try {
        const { message, history = [], conversationId } = req.body;

        if (!message || typeof message !== 'string' || !message.trim())
            return res.status(400).json({ success: false, error: 'Pesan tidak boleh kosong' });

        if (message.length > 8000)
            return res.status(400).json({ success: false, error: 'Pesan terlalu panjang (maks 8000 karakter)' });

        const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
        const recentHistory = Array.isArray(history) ? history.slice(-10) : [];
        recentHistory.forEach(msg => {
            if (msg.role === 'user' || msg.role === 'assistant') {
                messages.push({ role: msg.role, content: String(msg.content || '').replace(/[<>]/g, '').trim() });
            }
        });
        messages.push({ role: 'user', content: message.trim() });

        const response = await axios.post(
            'https://api.deepseek.com/v1/chat/completions',
            { model: 'deepseek-chat', messages, max_tokens: 4096, temperature: 0.7, stream: false },
            {
                headers: { 'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
                timeout: 30000
            }
        );

        const aiMessage = response.data?.choices?.[0]?.message?.content;
        if (!aiMessage)
            return res.status(500).json({ success: false, error: 'Tidak ada respons dari AI' });

        return res.status(200).json({
            success: true, message: aiMessage,
            conversationId: conversationId || Date.now().toString(),
            model: 'deepseek-chat', user: req.user.username,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')
            return res.status(504).json({ success: false, error: 'Request timeout. Coba lagi.' });
        if (error.response?.status === 401)
            return res.status(502).json({ success: false, error: 'DeepSeek API key tidak valid.' });
        if (error.response?.status === 429)
            return res.status(429).json({ success: false, error: 'Rate limit. Tunggu sebentar.' });
        return res.status(500).json({ success: false, error: 'Terjadi kesalahan internal.' });
    }
});

module.exports = router;
