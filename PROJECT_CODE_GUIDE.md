# Nexus Chat Code Guide: A Beginner's Textbook

Welcome to the **Nexus Chat Code Guide**. This document is designed to explain **exactly how this project works**, file by file, line by line. It assumes you have basic Java knowledge but might be new to Spring Boot, complex annotations, or web architecture.

---

## 📕 Part 1: The "Universal Dictionary"
Before diving into the code, here is a cheat sheet for every "magic word" (Annotation) you will see in this project.

### 🌱 Spring Boot Basics
*   `@SpringBootApplication`: The "Start Here" button. It tells Java, "This is a Spring Boot app, please set everything up for me."
*   `@Configuration`: Tells Spring, "This class contains settings and instructions on how to build things" (like security rules).
*   `@Bean`: Used inside a `@Configuration` class. It tells Spring, "I am creating an object here (like a PasswordEncoder), please manage it and give it to anyone who needs it."
*   `@Autowired`: "I need this!" (Dependency Injection). It asks Spring to find an existing object and plug it in here.
*   `@RequiredArgsConstructor` (Lombok): A cleaner way to do `@Autowired`. It automatically creates a constructor for all `final` fields, so you don't have to write one.

### 🏛️ Architecture Layers (Stereotypes)
*   `@RestController`: The **Waiter**. It handles incoming web requests (URL clicks, form submissions) and returns data (JSON).
*   `@Service`: The **Chef**. It contains the business logic (math, rules, checking passwords).
*   `@Repository`: The **Pantry Manager**. It talks directly to the database to save/fetch data.
*   `@Entity`: The **Blueprint**. It tells Spring, "This Java class directly maps to a table in the database."

### 📡 Web Requests (Inside Controllers)
*   `@RequestMapping("/api/...")`: "My office is located here." Sets the base URL for the whole class.
*   `@GetMapping`: Listen for a standard page load or data fetch request.
*   `@PostMapping`: Listen for a request sending *new* data (like a login form).
*   `@RequestBody`: "Take the JSON data sent by the user and turn it into this Java object."
*   `@PathVariable`: "Take the part of the URL (like `/users/{id}`) and give it to me as a variable."
*   `@Valid`: "Check if this data follows the rules" (e.g., email format, not empty).

### 💾 Database & Data (JPA & Lombok)
*   `@Table(name="...")`: "In the database, the table for this class is named X."
*   `@Id`: "This field is the Primary Key (unique ID)."
*   `@GeneratedValue`: "Generate this ID automatically for me (don't make me invent one)."
*   `@OneToMany`: "One User has Many Messages." Defines relationships between tables.
*   `@Data` (Lombok): "Please write all the Getters, Setters, `toString()`, `hashCode()`, and `equals()` methods for me invisibly."
*   `@Builder` (Lombok): Allows you to create objects like `User.builder().name("John").build()` instead of `new User("John", ...)`.

---

## 🏗️ Part 2: The Architecture (The "Restaurant" Analogy)

Understanding the **Flow** is more important than memorizing code. Every request in this app follows this path:

1.  **The Request (Customer)**: A user clicks "Login" on the React frontend.
2.  **The Controller (Waiter)**: `AuthController.java` catches the request. It checks if the "order" is valid (username/password present).
3.  **The Service (Chef)**: `UserService.java` takes the order. It encrypts the password, checks if the user exists, and applies rules.
4.  **The Repository (Pantry Manager)**: `UserRepository.java` runs the actual SQL query (`SELECT * FROM users...`) to get data.
5.  **The Database (Pantry)**: PostgreSQL holds the actual data.

---

## 📖 Part 3: File-by-File Deep Dive

We will trace the **User Registration & Login** flow to see how these files work together.

### 1. The Blueprint: `User.java` (Entity)
**Location:** `server/src/main/java/com/nexus/chat/entity/User.java`

This file defines what a "User" *is* in our system.

```java
@Entity // 1. Maps this class to a DB table
@Table(name = "users") // 2. The table name is "users"
@Data // 3. Lombok magic: adds getters/setters
@Builder // 4. Allows pattern: User.builder().username("...").build()
public class User {

    @Id // Primary Key
    @GeneratedValue(strategy = GenerationType.UUID) // Auto-generate specific UUIDs
    private UUID id;

    @Column(nullable = false, unique = true) // Column rules
    private String username;

    // ... other fields
}
```
*   **Why is this here?** Without this, Java handles data in memory, but the database handles data on disk. This file bridges the two.

### 2. The Pantry Manager: `UserRepository.java`
**Location:** `server/src/main/java/com/nexus/chat/repository/UserRepository.java`

```java
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByUsername(String username);
    Boolean existsByEmail(String email);
}
```
*   **The Magic:** You **do not** write the SQL code. By extending `JpaRepository`, Spring *guesses* the SQL based on the method name.
*   `findByUsername` automatically becomes `SELECT * FROM users WHERE username = ?`.

### 3. The Chef: `UserService.java`
**Location:** `server/src/main/java/com/nexus/chat/service/UserService.java`

This is where the actual work happens.

```java
@Service
@RequiredArgsConstructor // Injects UserRepository automatically
public class UserService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional // "Do this all or nothing" (if it fails halfway, rollback everything)
    public User createUser(String username, String password, String email) {
        // 1. Validation Logic
        if (userRepository.existsByUsername(username)) {
            throw new RuntimeException("Username already exists");
        }

        // 2. Business Logic: Encrypt the password!
        // NEVER save plain text passwords.
        String encodedPassword = passwordEncoder.encode(password);

        // 3. Create the Object
        User user = User.builder()
                .username(username)
                .password(encodedPassword)
                .email(email)
                .build();

        // 4. Save to DB
        return userRepository.save(user);
    }
}
```

### 4. The Gatekeeper: `SecurityConfig.java`
**Location:** `server/src/main/java/com/nexus/chat/config/SecurityConfig.java`

This file decides who gets to enter the restaurant.

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .csrf(csrf -> csrf.disable()) // Disable CSRF for simple APIs
        .authorizeHttpRequests(auth -> auth
            // Public Endpoints (Anyone can access)
            .requestMatchers("/api/auth/**").permitAll() 
            // Private Endpoints (Must be logged in)
            .anyRequest().authenticated()
        )
        // Add our JWT Filter mechanism
        .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);
    
    return http.build();
}
```
*   **Key Concept:** "Stateless". We don't save "sessions" in the server's memory. Instead, we give the user a **Token** (JWT). They have to show this token with every request.

### 5. The Waiter: `AuthController.java`
**Location:** `server/src/main/java/com/nexus/chat/controller/AuthController.java`

This handles the outside world (React).

```java
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final JwtUtil jwtUtil;

    @PostMapping("/register") // Matches POST /api/auth/register
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        
        // 1. Call the Service to do the hard work
        User user = userService.createUser(
            request.getUsername(), 
            request.getPassword(), 
            request.getEmail()
        );

        // 2. Generate the "Entry Pass" (Token)
        String token = jwtUtil.generateToken(user.getUsername());

        // 3. Reply to React with data
        return ResponseEntity.ok(new AuthResponse(token, user));
    }
}
```

---

## 🔐 Deep Dive: The JWT (JSON Web Token)
You will see `JwtUtil` and `JwtAuthenticationFilter`. Here is how that works simply:

1.  **Login**: User sends `username` + `password`.
2.  **Verify**: Server checks DB. If correct, it creates a **JWT**.
    *   Think of a JWT as a **stamped wristband** at a club.
    *   The stamp protects it. If you try to change the writing on the wristband, the stamp breaks (signature invalid).
3.  **Next Request**: The user wants to "Send Message". They *must* show the wristband (send the Token in the Header).
4.  **Filter**: `JwtAuthenticationFilter` stands at the door.
    *   It checks the wristband.
    *   Valid? -> "Come right in" (Sets `SecurityContext`).
    *   Invalid? -> "403 Forbidden".

---

## 🧩 Summary of Terms
If you see a file and don't know what it does, check its suffix:

*   `...Controller`: Handles HTTP requests.
*   `...Service`: Handles logic.
*   `...Repository`: Handles Database.
*   `...Entity` / `...Model`: Represents a DB table definition.
*   `...DTO` (Data Transfer Object): A simple box to carry data (like `LoginRequest`). It's not a DB table, just a temporary package.
*   `...Config`: Setup code (runs once when app starts).
*   `...Util`: Helper tools (like Date formatting or JWT generation).

---
