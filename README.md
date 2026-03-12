# AI Interview App

A production-ready full-stack SaaS application for practicing job interviews with an AI interviewer. The AI adapts to your domain and specialization, asks realistic questions, maintains conversation context, and provides structured feedback with scoring.

## Tech Stack

**Frontend:** React 18, Vite, Tailwind CSS, React Router v6, Socket.io-client, Chart.js, Monaco Editor, react-i18next (EN/HI)  
**Backend:** Node.js, Express, MongoDB/Mongoose, JWT + Passport Google OAuth, Socket.io, OpenAI (gpt-4o-mini / gpt-4o), Winston, Multer  

## Quick Start

### Prerequisites

- Node.js 20+
- MongoDB Atlas account (or local MongoDB)
- OpenAI API key

### 1. Clone & Setup Environment

```bash
# Copy environment template
cp .env.example backend/.env

# Edit backend/.env with your actual values:
# - MONGO_URI (MongoDB Atlas connection string)
# - JWT_SECRET (any long random string)
# - OPENAI_API_KEY (your OpenAI key)
# - GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET (optional, for Google OAuth)
```

Create `frontend/.env`:
```
VITE_API_URL=http://localhost:5000
```

### 2. Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Run Development Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev
# Server starts on http://localhost:5000

# Terminal 2 - Frontend
cd frontend
npm run dev
# App starts on http://localhost:5173
```

### 4. Run Tests

```bash
cd backend
npm test
```

## Project Structure

```
root/
├── backend/
│   ├── config/db.js              # MongoDB connection
│   ├── controllers/              # Route handlers
│   │   ├── authController.js
│   │   ├── interviewController.js
│   │   └── uploadController.js
│   ├── middleware/
│   │   ├── auth.js               # JWT + Passport
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── User.js
│   │   └── InterviewSession.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── interview.js
│   │   └── upload.js
│   ├── services/openaiService.js # OpenAI integration
│   ├── utils/logger.js           # Winston logger
│   ├── __tests__/auth.test.js
│   ├── server.js                 # Express + Socket.io
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   ├── context/AuthContext.jsx
│   │   ├── pages/                # Route pages
│   │   ├── services/api.js       # Axios client
│   │   ├── i18n.js               # Internationalization
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
├── .env.example
└── README.md
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/profile` | Get profile (auth) |
| PUT | `/api/auth/profile` | Update profile (auth) |
| GET | `/api/auth/google` | Google OAuth |
| POST | `/api/interview/start` | Start interview (auth) |
| POST | `/api/interview/answer` | Submit answer (auth) |
| POST | `/api/interview/end` | End & get feedback (auth) |
| GET | `/api/interview/history` | Interview history (auth) |
| GET | `/api/interview/active` | Get active session (auth) |
| GET | `/api/interview/:id` | Get session by ID (auth) |
| POST | `/api/upload/resume` | Upload resume (auth) |

## Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `interview:start` | Client → Server | Start new interview |
| `interview:answer` | Client → Server | Submit answer |
| `interview:end` | Client → Server | End interview |
| `interview:question` | Server → Client | New question |
| `interview:end` | Server → Client | Feedback results |
| `interview:error` | Server → Client | Error message |

## Features

- **AI Interviewer**: GPT-4o-mini for questions, GPT-4o for feedback
- **Session Persistence**: Full transcript saved to MongoDB, resumable on refresh
- **Real-time Chat**: Socket.io with JWT authentication
- **Domain Selection**: 9 domains, 10 specializations, 4 difficulty levels
- **Code Editor**: Monaco editor for technical answers
- **Analytics Dashboard**: Chart.js score trends and history
- **Internationalization**: English and Hindi
- **Resume Upload**: PDF/DOCX support via Multer
- **Google OAuth**: One-click sign-in
- **Security**: JWT, bcrypt, rate limiting, CORS, structured error handling

## Deployment

### Frontend → Vercel

```bash
cd frontend
npm run build
# Deploy dist/ folder to Vercel
# Set environment variable: VITE_API_URL=https://your-backend.onrender.com
```

### Backend → Render / Railway

1. Push backend to a Git repo
2. Connect to Render/Railway
3. Set build command: `npm install`
4. Set start command: `npm start`
5. Add all environment variables from `.env.example`

### Database → MongoDB Atlas

1. Create a free M0 cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Create a database user
3. Whitelist your IP (or 0.0.0.0/0 for Render)
4. Copy connection string to `MONGO_URI`

## License

MIT
