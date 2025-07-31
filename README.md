# StockPlay

**StockPlay** is a full-stack, real-time stock market simulator and portfolio tracker. It features a modern React frontend, a robust FastAPI backend, real-time price updates, secure authentication, and a PostgreSQL database. The platform supports simulated trading, portfolio analytics, price alerts, and more.

---

## Features

### 🚀 Real-Time Stock Market Simulation
- Simulate buying, selling, and tracking stocks with real-time price updates.
- Portfolio analytics, gain/loss calculations, and historical performance.

### 🔒 Secure Authentication
- Email/password registration and login.
- JWT-based authentication with refresh tokens.
- Password reset via email OTP.
- OAuth login with Google and GitHub.

### 📈 Real-Time Price System
- Automated price updates every 5 minutes during market hours.
- Multiple data sources (Yahoo Finance, Finnhub, Alpha Vantage) with fallback.
- Accurate gain/loss and performance metrics.

### 📊 Portfolio & Analytics
- Holdings, analytics, and visualizations (charts, pie, line, bar).
- Indices, ETFs, IPOs, and screener pages.
- Price alerts and notifications.

### 🛡️ Security
- Password hashing (bcrypt), CORS, protected API endpoints.
- Environment-based secrets management.

---

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, DaisyUI, React Router, Recharts
- **Backend:** FastAPI, Uvicorn, PostgreSQL, SQL, yfinance, finnhub-python, alpha-vantage
- **Authentication:** JWT, OAuth (Google, GitHub), Email OTP
- **Deployment:** Netlify (frontend), Render (backend), Neon (PostgreSQL)

---

## Project Structure

```
StockPlay/
│
├── Frontend/                # React + Vite frontend
│   ├── src/components/      # All React components (Nav, Portfolio, Analytics, etc.)
│   ├── src/services/        # API service functions
│   ├── src/contexts/        # React context (Auth, etc.)
│   └── ...                  # Other frontend files
│
├── stock_api/               # FastAPI backend
│   ├── main.py              # FastAPI app entrypoint
│   ├── auth_routes.py       # Auth endpoints (login, signup, OTP, OAuth)
│   ├── trading_routes.py    # Trading and portfolio endpoints
│   ├── email_service.py     # Email/OTP sending logic
│   ├── price_scheduler.py   # Real-time price update scheduler
│   ├── database.py          # DB connection logic
│   ├── ...                  # Other backend modules
│
├── PROJECT_DOCUMENTATION.md # Full technical documentation
├── REAL_TIME_PRICE_SYSTEM.md# Real-time price update system details
├── requirements.txt         # Backend Python dependencies
├── package.json             # Frontend dependencies
└── README.md                # This file
```

---

## Screenshots

> **Add screenshots of your app below.**
> 
> - **Landing Page:**
>   ![Landing Page]<img width="1919" height="967" alt="image" src="https://github.com/user-attachments/assets/d5165b2b-67d2-40d6-939c-b20ad799348e" />

> - **Login/Signup:**
>   ![Login Page]<img width="1917" height="968" alt="image" src="https://github.com/user-attachments/assets/ac4a14a8-d2ed-4513-848a-eeaf40540d21" />

> - **Dashboard:**
>   ![Dashboard]<img width="1919" height="972" alt="image" src="https://github.com/user-attachments/assets/2f6c877c-b08d-48fb-a4e5-c9bb95c01d9f" />

> - **Indices:**
>   ![Indices]<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/fb1afe9b-6406-4f65-9ffc-53cb58abc92a" />


>   **Explore:**
>   ![Explore page]<img width="1919" height="968" alt="image" src="https://github.com/user-attachments/assets/2c363c4c-5fc8-410d-ab01-f35c286aab40" />
     <img width="1919" height="883" alt="image" src="https://github.com/user-attachments/assets/5f49c3e4-d275-467f-bbfd-8990e74589d0" />
     <img width="1919" height="984" alt="image" src="https://github.com/user-attachments/assets/62172ad2-423e-44c2-adde-4ece5931b6f5" />



> - **Portfolio Analytics:**
>   ![Portfolio Analytics]<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/a9e69440-6c00-4267-9cba-d6a57a1965fe" />
        <img width="1919" height="1002" alt="image" src="https://github.com/user-attachments/assets/0b5de0b2-76e0-48e0-aabe-0d61fd6ed65e" />


> - **Trading Page:**
>   ![Trading Page]<img width="1919" height="1079" alt="image" src="https://github.com/user-attachments/assets/1433b00f-2f6b-4b19-a692-c7bbcb30cba2" />

---

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/StockPlay.git
cd StockPlay
```

### 2. Backend Setup

- Install Python dependencies:
  ```bash
  cd stock_api
  pip install -r requirements.txt
  ```
- Set up your `.env` (see `credentials.env` for required variables).
- Start the backend:
  ```bash
  uvicorn main:app --reload --host 0.0.0.0 --port 8000
  ```

### 3. Frontend Setup

- Install Node dependencies:
  ```bash
  cd Frontend
  npm install
  ```
- Create a `.env` file in `Frontend/` with:
  ```
  VITE_GOOGLE_CLIENT_ID=your-google-client-id
  VITE_GITHUB_CLIENT_ID=your-github-client-id
  VITE_API_URL=https://stockplay-backend.onrender.com
  ```
- Start the frontend:
  ```bash
  npm run dev
  ```

### 4. Deployment

- **Frontend:** Deploy to Netlify, set environment variables in the Netlify dashboard.
- **Backend:** Deploy to Render, set environment variables in the Render dashboard.

---

## Environment Variables

**Backend (`stock_api/credentials.env` or Render dashboard):**
- `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DATABASE_URL`
- `ALPHA_VANTAGE_API_KEY`, `FINNHUB_API_KEY`
- `JWT_SECRET_KEY`
- `SMTP_EMAIL`, `SMTP_PASSWORD`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- `BACKEND_URL`, `FRONTEND_URL`

**Frontend (`Frontend/.env` or Netlify dashboard):**
- `VITE_GOOGLE_CLIENT_ID`
- `VITE_GITHUB_CLIENT_ID`
- `VITE_API_URL`

---

## Documentation

- See `PROJECT_DOCUMENTATION.md` for full technical details.
- See `REAL_TIME_PRICE_SYSTEM.md` for price update system.
- See code comments and each module for further explanations.

---

## License

MIT License

---

> **Tip:**
> Place your screenshots in a `screenshots/` folder at the root of your repo for best results.
