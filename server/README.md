# Nexus Chat Backend - Spring Boot

Spring Boot 3.2+ backend for Nexus Chat application with Java 17, PostgreSQL, JWT authentication, OAuth2, and WebSocket support.

## Tech Stack

- **Java 17**
- **Spring Boot 3.2.0**
- **Spring Data JPA** (Hibernate)
- **PostgreSQL**
- **Spring Security** (JWT + OAuth2)
- **Spring WebSocket** (STOMP)
- **Maven**

## Project Structure

```
server/
├── src/
│   ├── main/
│   │   ├── java/com/nexus/chat/
│   │   │   ├── config/          # Configuration classes
│   │   │   ├── controller/      # REST controllers
│   │   │   ├── dto/             # Data Transfer Objects
│   │   │   ├── entity/          # JPA entities
│   │   │   ├── exception/       # Exception handlers
│   │   │   ├── repository/      # Spring Data repositories
│   │   │   ├── security/        # Security configuration
│   │   │   ├── service/         # Business logic
│   │   │   └── util/            # Utility classes
│   │   └── resources/
│   │       └── application.yml  # Application configuration
│   └── test/                    # Test files
└── pom.xml                      # Maven configuration
```

## Setup

### Prerequisites

- Java 17 or higher
- Maven 3.6+
- PostgreSQL 12+

### Database Setup

1. Create a PostgreSQL database:
```sql
CREATE DATABASE nexus_chat;
```

2. Update `application.yml` with your database credentials:
```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/nexus_chat
    username: your_username
    password: your_password
```

### Environment Variables

Create a `.env` file or set environment variables:

```bash
DATABASE_URL=jdbc:postgresql://localhost:5432/nexus_chat
DB_USERNAME=postgres
DB_PASSWORD=postgres
JWT_SECRET=your-256-bit-secret-key-change-this-in-production-minimum-32-characters
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
PORT=5000
```

### Running the Application

1. Build the project:
```bash
mvn clean install
```

2. Run the application:
```bash
mvn spring-boot:run
```

Or run the main class:
```bash
java -jar target/nexus-chat-backend-1.0.0.jar
```

The server will start on port 5000 (or the port specified in `PORT` environment variable).

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login with username/password
- `GET /api/auth/oauth2/success` - OAuth2 success callback
- `POST /api/auth/logout` - Logout (client-side token removal)

### Users

- `GET /api/users/me` - Get current user
- `GET /api/users/{id}` - Get user by ID
- `GET /api/users/online` - Get all online users
- `PUT /api/users/me/online` - Update online status

### Rooms

- `GET /api/rooms/public` - Get all public rooms
- `GET /api/rooms/my-rooms` - Get user's rooms
- `GET /api/rooms/{id}` - Get room by ID
- `POST /api/rooms` - Create a new room
- `POST /api/rooms/{id}/join` - Join a room
- `POST /api/rooms/{id}/leave` - Leave a room

### Messages

- `GET /api/messages/room/{roomId}` - Get messages for a room
- `POST /api/messages` - Send a message
- `PUT /api/messages/{id}` - Edit a message
- `DELETE /api/messages/{id}` - Delete a message

## WebSocket

WebSocket endpoint: `/ws`

Topics:
- `/topic/room/{roomId}` - Room-specific messages
- `/topic/public` - Public messages
- `/queue/user/{userId}` - User-specific messages

## Security

- JWT-based authentication for REST APIs
- OAuth2 support for Google login
- CORS configured for frontend (localhost:5000, localhost:3000)
- Password encryption using BCrypt
- Role-based access control (USER, ADMIN, MODERATOR)

## Database Schema

The application uses JPA/Hibernate with automatic schema generation (`ddl-auto: update`). Tables:

- `users` - User accounts
- `roles` - User roles
- `user_roles` - User-role mapping
- `rooms` - Chat rooms
- `room_participants` - Room-user mapping
- `messages` - Chat messages

## Development

### Hot Reload

Spring Boot DevTools is included for automatic restarts during development.

### Testing

Run tests:
```bash
mvn test
```

## Production

1. Set `JWT_SECRET` to a secure random string (minimum 32 characters)
2. Configure proper database credentials
3. Set `spring.jpa.hibernate.ddl-auto=validate` or use migrations
4. Configure proper CORS origins
5. Enable HTTPS
6. Set up proper logging

## Notes

- The application uses UUID for all entity IDs
- Messages are filtered for profanity automatically
- Online status is tracked per user
- WebSocket messages are broadcast to room participants
