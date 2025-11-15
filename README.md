MindCare – AI-Powered Mental Wellness Platform
Built for Nallas CodeXcelerate 2025 – Team XP Hunters

MindCare is a mental wellness platform that uses AI emotion understanding, an empathetic chatbot, and anonymous community support to deliver accessible and stigma-free mental health care for Indian students and young professionals.

🌟 Key Features
🧠 Emotion Detection (Prototype Simulation)

Detects user emotions like sad, stressed, happy

On-device simulated detection

No image storage → privacy-first

🤖 AI Mental Health Companion

Powered by Google Gemini API

Hugging Face fallback model

Provides personalized, empathetic responses

Adjusts support based on detected emotion

👤 Smart User Experience

Secure signup & login

One-time onboarding survey

Auto-navigation based on auth state

📊 Mood Analytics Dashboard

Tracks 7-day emotional trends

Helps users observe their mental patterns

👥 Anonymous Community Support

WhatsApp-based safe spaces

India-focused group categories

💊 Doctor Consultation (Prototype)

Pop-up appointment form

Simulated booking workflow

💻 Tech Stack

Frontend: HTML5, CSS3, JavaScript
Backend: Python Flask
Database: MySQL
AI Services: Google Gemini API, Hugging Face
Emotion Detection: MediaPipe / OpenCV (Simulated in prototype)

📁 Project Folder Structure

The following folder structure is taken exactly from your project:

MINDCARE/
│
├── .idea/
├── .vscode/
│
├── backend/
│   ├── .env                 # Environment variables (ignored in GitHub)
│   ├── .gitignore
│   ├── app.py               # Flask backend logic
│   └── requirement.txt      # Python dependencies
│
├── databse/
│   └── schema.sql           # MySQL schema
│
├── frontend/
│   ├── css/
│   │   ├── auth.css
│   │   └── style.css
│   │
│   ├── about.html
│   ├── chatbot.html
│   ├── community.html
│   ├── index.html
│   ├── login.html
│   ├── premium.html
│   ├── prescription.html
│   ├── privacy.html
│   ├── signup.html
│   ├── survey.html
│   └── terms.html
│
└── README.md

⚙️ How to Run the Project
1. Backend Setup

Open terminal:

cd backend
pip install -r requirement.txt

2. Create .env inside backend
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=mindcare_db
SECRET_KEY=your_secret_key

GEMINI_API_KEY=your_gemini_key
HF_API_TOKEN=your_hf_key
HF_MODEL=mistralai/Mistral-7B-Instruct-v0.1

3. Run the Backend
python app.py


Backend runs on:

http://localhost:5000

🗄️ 4. Database Setup (MySQL)

Open MySQL CLI or Workbench and run:

source databse/schema.sql;

🌐 5. Frontend Setup

Simply open:

frontend/index.html


Or use a lightweight server:

python -m http.server 5500

🚀 Future Enhancements

Full MediaPipe integration

Voice sentiment analysis

Wearable biosignal support

Mobile app (Flutter/React Native)

College pilot deployment

Integration with licensed professionals

👥 Team – XP Hunters

Harisaran K

Kavinraj K

Krish Agarwal

Manogar G

