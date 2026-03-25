# NexusChat 💬

NexusChat is a real-time communication platform designed for private communities and friend groups.
It supports public channels, private groups, direct messages, and real-time messaging using WebSockets.

---

## 🚀 Features

### Core Messaging

* Real-time chat using WebSockets (STOMP)
* Public channels
* Private invite-based groups
* Direct messages (1-to-1)
* Random chat (optional / can be disabled)

### User Experience

* Online user presence
* Typing indicators
* Unread message counts
* Message persistence
* Optimistic UI updates
* Auto-reconnect WebSocket handling

### Authentication & Security

* Email OTP verification
* JWT-based authentication
* Invite-only / friends-only environment
* Abuse-safe architecture for controlled communities

---

## 🏗️ Tech Stack

### Frontend

* React (Vite)
* TypeScript
* Tailwind CSS
* Zustand (state management)
* STOMP WebSocket client

### Backend

* Spring Boot
* Spring Security
* WebSocket (STOMP)
* JPA / Hibernate
* PostgreSQL (or compatible DB)

### Infrastructure

* GitHub (version control)
* Railway (deployment)

---

## 📁 Project Structure

```
client/        → React frontend
server/        → Spring Boot backend
shared/        → Shared types / schema
```

---

## ⚙️ Setup Instructions

### 1. Clone Repository

```
git clone https://github.com/yourusername/nexus-chat.git
cd nexus-chat
```

---

### 2. Backend Setup

```
cd server
./mvnw spring-boot:run
```

Configure in `application.properties`:

```
spring.datasource.url=YOUR_DB_URL
spring.datasource.username=YOUR_DB_USER
spring.datasource.password=YOUR_DB_PASSWORD
```

For email OTP:

```
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=your_email@gmail.com
spring.mail.password=your_app_password
```

---

### 3. Frontend Setup

```
cd client
npm install
npm run dev
```

---

## 🔐 Authentication Flow

1. User enters email
2. OTP sent to email
3. User verifies OTP
4. JWT issued
5. Access granted to chat

---

## 💬 Chat Types

### Public Channels

* Visible to all registered users
* Join and chat freely

### Private Groups

* Invite-code based access
* Member-only messaging

### Direct Messages

* One-to-one conversations
* Auto room creation

### Random Chat (Optional)

* Anonymous pairing
* Can be disabled for friends-only mode

---

## 🌐 Deployment

Recommended deployment:

Frontend + Backend:

* Deploy using Railway
* Connect GitHub repository
* Configure environment variables

---

## 🛡️ Future Improvements

* File sharing
* Message reactions
* Push notifications
* Mobile UI optimization
* Role-based permissions
* Moderation tools

---

## 🤝 Contributing

This project is currently maintained for private community usage.
Contributions and suggestions are welcome.

---

## 📄 License

This project is for educational and personal use.

---

## 👨‍💻 Author

Built with ❤️ for real-time community communication.
