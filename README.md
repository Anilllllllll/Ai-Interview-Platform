# 🤖 AI Interview App — Full Stack Mock Interview Platform

A production-ready **full-stack SaaS application** that allows users to practice job interviews with an AI interviewer.
The AI adapts to your **domain, specialization, and difficulty level**, asks realistic questions, maintains conversation context, evaluates answers, and provides **structured feedback with scores and analytics**.

---

## 📸 Preview

<img width="1919" height="1106" src="https://github.com/user-attachments/assets/da2b206c-5a3c-4e11-8c7a-9b65972a688b" />
<img width="1919" height="1096" src="https://github.com/user-attachments/assets/32944ea5-d4fb-46e8-a24a-25f76bc543e6" />

---

## 🚀 Key Features

* 🤖 AI-powered mock interviews
* 🧠 Adaptive question generation
* 💬 Real-time interview chat using Socket.io
* 📊 Feedback scoring & analytics dashboard
* 📝 Resume upload (PDF/DOCX)
* 🌐 Multi-language support (English / Hindi)
* 🔐 Authentication (JWT + Google OAuth)
* 💾 Interview history & session persistence
* 💻 Code editor for technical interviews (Monaco Editor)
* 📈 Performance tracking with charts
* ☁️ Deployable full-stack SaaS architecture

---

## 🛠️ Tech Stack

### Frontend

* React 18
* Vite
* Tailwind CSS
* React Router v6
* Socket.io Client
* Chart.js
* Monaco Editor
* i18next (Internationalization)

### Backend

* Node.js
* Express.js
* MongoDB / Mongoose
* JWT Authentication
* Passport Google OAuth
* Socket.io
* OpenAI API (GPT models)
* Multer (File Upload)
* Winston Logger

---

## ⚙️ Installation & Setup

### Prerequisites

* Node.js 20+
* MongoDB Atlas account
* OpenAI API key

---

### 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/ai-interview-app.git
cd ai-interview-app
```

### 2️⃣ Setup Environment Variables

Copy environment template:

```bash
cp .env.example backend/.env
```

Edit `backend/.env` and add:

```
MONGO_URI=your_mongodb_connection
JWT_SECRET=your_secret
OPENAI_API_KEY=your_openai_key
GOOGLE_CLIENT_ID=your_google_id
GOOGLE_CLIENT_SECRET=your_google_secret
```

Create `frontend/.env`:

```
VITE_API_URL=http://localhost:5000
```

---

### 3️⃣ Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

---

### 4️⃣ Run Development Servers

```bash
# Backend
cd backend
npm run dev
# Runs on http://localhost:5000

# Frontend
cd frontend
npm run dev
# Runs on http://localhost:5173
```

---

## 📂 Project Structure

```
root/
├── backend/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   └── server.js
│
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── context/
│   ├── services/
│   └── App.jsx
│
└── README.md
```

---

## 🔌 API Endpoints (Sample)

| Method | Endpoint               | Description       |
| ------ | ---------------------- | ----------------- |
| POST   | /api/auth/register     | Register user     |
| POST   | /api/auth/login        | Login             |
| GET    | /api/auth/profile      | Get profile       |
| POST   | /api/interview/start   | Start interview   |
| POST   | /api/interview/answer  | Submit answer     |
| POST   | /api/interview/end     | End interview     |
| GET    | /api/interview/history | Interview history |
| POST   | /api/upload/resume     | Upload resume     |

---

## 🌐 Deployment

**Frontend:** Vercel
**Backend:** Render / Railway
**Database:** MongoDB Atlas

Build frontend:

```bash
cd frontend
npm run build
```

Deploy backend and add environment variables from `.env.example`.

---

## 🎯 Learning Outcomes

This project demonstrates:

* Full-stack application architecture
* Authentication & authorization
* Real-time communication with Socket.io
* AI API integration
* File upload handling
* Database schema design
* REST API design
* Deployment & environment configuration
* Dashboard analytics visualization

---

## 🔮 Future Improvements

* Video interview support
* Speech-to-text answers
* AI voice interviewer
* Company-specific interview sets
* Leaderboard & ranking system
* Email feedback reports
* Interview scheduling
* Admin dashboard

---

## 👨‍💻 Author

**Anil Kumar**
GitHub: https://github.com/Anilllllllll

---

## ⭐ Support

If you like this project, please give it a **star ⭐ on GitHub**.
