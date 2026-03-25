import type { Express } from "express";
import { createServer, type Server } from "http";

export function registerRoutes(app: Express): Server {
    // Health check endpoint
    app.get("/api/health", (_req, res) => {
        res.json({ status: "ok", timestamp: new Date().toISOString() });
    });

    // Placeholder for future API routes
    // Example: Authentication routes
    // app.post("/api/auth/register", registerHandler);
    // app.post("/api/auth/login", loginHandler);

    // Example: User routes
    // app.get("/api/users/me", getCurrentUserHandler);

    // Example: Chat/Message routes
    // app.get("/api/rooms", getRoomsHandler);
    // app.post("/api/messages", sendMessageHandler);

    const httpServer = createServer(app);
    return httpServer;
}
