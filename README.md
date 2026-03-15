# Shadow-GPT v2.0 — Vercel Edition
> AI Chat powered by **DeepSeek** + **MongoDB Auth** + **No-Expiry JWT**

## ⚡ Deploy ke Vercel (3 Langkah)

### Cara 1: Via Vercel CLI
```bash
npm install -g vercel   # install CLI
vercel login            # login akun Vercel
vercel --prod           # deploy!
```

### Cara 2: Via GitHub
1. Push ke GitHub
2. Buka vercel.com → New Project → Import repo
3. Set Environment Variables (lihat di bawah)
4. Deploy!

---

## 🔑 Environment Variables di Vercel

Buka: **Dashboard Vercel → Project → Settings → Environment Variables**

| Key | Value |
|-----|-------|
| `MONGODB_URI` | `mongodb://shadownexrestapi_including:004dbf85c3f488509bf4e4a4b668cd17057e82a7@3y4f-8.h.filess.io:61034/shadownexrestapi_including` |
| `DEEPSEEK_API_KEY` | `sk-d0fe2a26facd4528bff370809aa5cb9c` |
| `JWT_SECRET` | `Sh4d0w-N3x-JWT-S3cr3t-K3y-2026-MongoDB-xK9mP2qR7vL` |

---

## 💻 Jalankan Lokal

```bash
npm install
npm start
# → http://localhost:3000
```

---

## 🔐 Sistem Akun

- **JWT tanpa masa aktif** — token berlaku selamanya selama server hidup
- **Password** di-hash dengan bcrypt (12 rounds)
- **MongoDB** menyimpan semua akun pengguna
- Akun **tidak akan expired** selama JWT_SECRET tidak berubah

## 📡 API Endpoints

| Method | Endpoint | Keterangan |
|--------|----------|------------|
| POST | `/api/auth/register` | Buat akun baru |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Cek token |
| POST | `/api/chat` | Chat dengan AI |
| GET | `/api/health` | Status server |

---

**Created by Mr. ShadowNex** · Shadow-GPT v2.0 · DeepSeek Engine
