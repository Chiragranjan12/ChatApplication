# =============================================================================
# NEXUS CHAT - Spring Boot Backend Dockerfile
# =============================================================================
# Multi-stage build for optimized image size
# 
# Build: docker build -t nexuschat-backend:latest .
# Run:   docker run -p 8080:8080 nexuschat-backend:latest
# =============================================================================

# =============================================================================
# STAGE 1: BUILD
# =============================================================================
# Use Maven with JDK 17 for building the application
# - maven:3.9.9-eclipse-temurin-17 includes Maven 3.9.9 and JDK 17
# - This stage compiles the code and creates the JAR file
FROM maven:3.9.9-eclipse-temurin-17 AS build

# Set working directory in the container
WORKDIR /app

# Copy pom.xml first (for dependency caching)
# This allows Docker to cache dependencies between builds
COPY pom.xml .

# Download dependencies (cached in Docker layer)
# This runs before source code changes, so dependencies are cached
RUN mvn dependency:go-offline -B

# Copy source code
COPY src ./src

# Build the application (skip tests for faster builds)
# -DskipTests skips running unit/integration tests during build
# -B (batch mode) prevents interactive prompts
RUN mvn clean package -DskipTests -B

# =============================================================================
# STAGE 2: RUNTIME
# =============================================================================
# Use OpenJDK 17 slim image for running the application
# - slim image is smaller (~220MB vs ~600MB for full JDK)
# - eclipse-temurin is the open source distribution of OpenJDK
FROM eclipse-temurin:17-jre-jammy AS runtime

# Set working directory
WORKDIR /app

# Create non-root user for security
# Running as non-root reduces attack surface
RUN groupadd -r nexuschat && \
    useradd -r -g nexuschat nexuschat

# Copy the built JAR from the build stage
# Only the JAR file is needed, not the source code
COPY --from=build /app/target/nexus-chat-backend-*.jar app.jar

# Change ownership to non-root user
RUN chown -R nexuschat:nexuschat /app

# Switch to non-root user
USER nexuschat

# =============================================================================
# PORT CONFIGURATION
# =============================================================================
# Expose the port that Spring Boot runs on
# This matches server.port in application.properties (default: 8080)
EXPOSE 8080

# =============================================================================
# HEALTH CHECK
# =============================================================================
# Verify the application is running and healthy
# - Checks the actuator health endpoint
# - Starts after 30 seconds, checks every 10 seconds, times out after 5 seconds
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/api/actuator/health || exit 1

# =============================================================================
# ENTRYPOINT
# =============================================================================
# Run the JAR file when container starts
# -jar flag tells Java to run the JAR file
# Additional JVM options can be added here:
#   -Xmx512m: Maximum heap size of 512MB
#   -Xms256m: Initial heap size of 256MB
#   -XX:+UseG1GC: Use G1 garbage collector (recommended for containers)
ENTRYPOINT ["java", "-jar", "-Xmx512m", "-Xms256m", "-XX:+UseG1GC", "app.jar"]

# =============================================================================
# ENVIRONMENT VARIABLES (set at runtime)
# =============================================================================
# Example: docker run -e DATABASE_URL=jdbc:postgresql://postgres:5432/chatdb \
#                    -e JWT_SECRET=your-secret-key \
#                    -p 8080:8080 nexuschat-backend:latest
#
# Required environment variables:
#   - DATABASE_URL: PostgreSQL connection URL
#   - DB_USERNAME: Database username
#   - DB_PASSWORD: Database password
#   - JWT_SECRET: Secret key for JWT tokens (min 32 characters)
#   - GOOGLE_CLIENT_ID: Google OAuth2 client ID
#   - GOOGLE_CLIENT_SECRET: Google OAuth2 client secret
#   - MAIL_USERNAME: Email username (for OTP)
#   - MAIL_PASSWORD: Email password (App Password for Gmail)
# =============================================================================
