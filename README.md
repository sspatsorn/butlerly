# AI Task Butler

AI เลขาส่วนตัวบน LINE ที่ช่วยจัดการงานให้โดยอัตโนมัติ — **ส่งงานมาให้ AI ที่เหลือ AI จัดการให้ทั้งหมด**

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Nuxt 3 + Nuxt UI |
| Backend | Express + TypeScript |
| Database | Supabase PostgreSQL |
| AI | Google Gemini API |
| Messaging | LINE Messaging API |

## โครงสร้างโปรเจกต์

```
linetask/
├── backend/          # Express API + LINE Webhook
│   └── src/
│       ├── config/       # Environment config
│       ├── routes/       # HTTP routes
│       ├── services/     # Business logic
│       ├── repositories/ # Data access layer
│       └── types/        # TypeScript types
├── frontend/         # Nuxt 3 Dashboard
│   ├── components/
│   ├── composables/
│   └── pages/
├── database/         # Supabase schema
│   └── schema.sql
└── PROJECT_RULES.md
```

## ฟีเจอร์

- รับข้อความหรือ Forward งานจาก LINE
- ใช้ Google Gemini วิเคราะห์ข้อความและ Intent
- สร้าง Task, Checklist, Deadline อัตโนมัติ
- บันทึกข้อมูลลง Supabase PostgreSQL
- แจ้งเตือนผ่าน LINE ตามเวลาที่กำหนด
- สนทนาด้วยภาษาธรรมชาติ (วันนี้มีงานอะไร, เสร็จแล้ว, เลื่อน deadline, ตั้งเตือน)
- รองรับหลายผู้ใช้ด้วย LINE User ID

## การติดตั้ง

### 1. Database (Supabase)

1. สร้างโปรเจกต์ใหม่ที่ [supabase.com](https://supabase.com)
2. เปิด SQL Editor แล้วรัน `database/schema.sql`
3. คัดลอก Project URL และ Service Role Key

### 2. LINE Messaging API

1. สร้าง Channel ที่ [LINE Developers Console](https://developers.line.biz/)
2. เปิด Messaging API
3. ตั้ง Webhook URL: `https://your-domain.com/webhook/line`
4. เปิด "Use webhook" และปิด "Auto-reply messages"
5. คัดลอก Channel Secret และ Channel Access Token

### 3. Google Gemini API

1. ไปที่ [Google AI Studio](https://aistudio.google.com/)
2. สร้าง API Key

### 4. Backend

```bash
cd backend
cp .env.example .env
# แก้ไข .env ใส่ค่าจริง

npm install
npm run dev
```

Backend จะรันที่ `http://localhost:3001`

### 5. Frontend

```bash
cd frontend
cp .env.example .env

npm install
npm run dev
```

Frontend จะรันที่ `http://localhost:3000`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/webhook/line` | LINE Webhook |
| GET | `/api/health` | Health check |
| GET | `/api/tasks` | ดูงานทั้งหมด |
| GET | `/api/tasks/today` | ดูงานวันนี้ |
| PATCH | `/api/tasks/:id/status` | อัปเดตสถานะงาน |
| POST | `/api/register` | สมัครสมาชิก (หน้าเว็บ) |
| GET | `/api/register/status` | ตรวจสอบสถานะสมัคร |

## การสมัครสมาชิก

ผู้ใช้ต้องสมัครก่อนใช้งาน Bot มี 2 ช่องทาง:

### ผ่าน LINE (แนะนำ)
1. เพิ่ม Bot เป็นเพื่อน → ได้รับข้อความต้อนรับ
2. พิมพ์ **สมัคร**
3. กรอกชื่อ-นามสกุล
4. กรอกเบอร์โทร (10 หลัก)
5. ระบบบันทึก LINE User ID อัตโนมัติ

### ผ่านหน้าเว็บ `/register`
- เปิดจากลิงก์ที่ Bot ส่งมา (มี LINE User ID ใน URL)
- หรือตั้งค่า LIFF (`NUXT_PUBLIC_LIFF_ID`) เพื่อดึง LINE ID อัตโนมัติ

## คำสั่ง LINE Bot

| ข้อความ | การทำงาน |
|---------|----------|
| สมัคร | เริ่มสมัครสมาชิก |
| ส่งข้อความงาน / Forward | สร้าง Task + Checklist + Deadline |
| วันนี้มีงานอะไร | แสดงรายการงาน |
| งานนี้เสร็จแล้ว | ทำเครื่องหมายเสร็จ |
| เลื่อนไปพรุ่งนี้ | เลื่อน Deadline |
| เตือนอีก 30 นาที | ตั้งเตือนผ่าน LINE |
| ช่วยเหลือ | แสดงคำสั่งที่ใช้ได้ |

## Development

```bash
# Backend
cd backend && npm run dev

# Frontend (terminal อื่น)
cd frontend && npm run dev
```

สำหรับทดสอบ LINE Webhook ในเครื่อง ใช้ [ngrok](https://ngrok.com/):

```bash
ngrok http 3001
```

แล้วตั้ง Webhook URL ใน LINE Console เป็น `https://xxxx.ngrok.io/webhook/line`

## Deploy บน Render

โปรเจกต์มี `render.yaml` สำหรับ deploy 2 services:

| Service | URL ตัวอย่าง | หน้าที่ |
|---------|-------------|--------|
| `butlerly-backend` | `https://butlerly-backend.onrender.com` | API + LINE Webhook |
| `butlerly-frontend` | `https://butlerly-frontend.onrender.com` | Dashboard + หน้าสมัคร |

### ขั้นตอน

1. Push โค้ดขึ้น GitHub/GitLab
2. เปิด [Render Dashboard](https://dashboard.render.com/) → **New** → **Blueprint**
3. เชื่อม repo แล้วกด **Apply**
4. ใส่ Environment Variables ที่ Render ถาม (secrets):
   - `LINE_CHANNEL_SECRET`
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `GEMINI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NUXT_PUBLIC_LIFF_ID` (ถ้ามี)
5. รอ deploy เสร็จทั้ง 2 services
6. ตั้ง LINE Webhook URL:
   ```
   https://butlerly-backend.onrender.com/webhook/line
   ```
7. เปิด **Use webhook** และปิด **Auto-reply messages** ใน LINE Console

### หมายเหตุ

- Free plan จะ sleep เมื่อไม่มี traffic — request แรกอาจช้า ~30 วินาที
- `FRONTEND_URL` และ `BACKEND_URL` เชื่อมกันอัตโนมัติผ่าน `render.yaml`
- ถ้า deploy แยก (ไม่ใช้ Blueprint) ตั้ง env เอง:
  - Backend: `FRONTEND_URL=https://your-frontend.onrender.com`
  - Frontend: `BACKEND_URL=https://your-backend.onrender.com`
