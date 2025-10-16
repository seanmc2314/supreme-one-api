# Supreme One API Server

Backend API for Supreme One website featuring Sarah AI chatbot, analytics, and contact management.

## Features

- 🤖 Sarah AI Chatbot (powered by OpenAI GPT-4)
- 📊 Analytics tracking (visitors, page views, chat sessions)
- 📧 Contact form handling with email notifications
- 📅 Calendly integration
- 🔒 CORS enabled for supremeone.net

## Deployment on Render

### Environment Variables Required:

```
OPENAI_API_KEY=your_openai_api_key_here
EMAIL_PASS=your_email_app_password_here
PORT=10000
NODE_ENV=production
CALENDLY_URL=https://calendly.com/sarahai-supremeone/30min
```

### Render Settings:

- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment:** Node

## Local Development

```bash
npm install
npm start
```

Server runs on http://localhost:2000 (or PORT from .env)
