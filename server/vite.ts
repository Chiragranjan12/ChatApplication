import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, type ViteDevServer } from "vite";
import type { Server } from "http";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function log(message: string, isError = false) {
    const timestamp = new Date().toISOString();
    const prefix = isError ? "[ERROR]" : "[INFO]";
    console.log(`${timestamp} ${prefix} ${message}`);
}

export async function setupVite(app: Express, server: Server) {
    const vite: ViteDevServer = await createViteServer({
        server: {
            middlewareMode: true,
            hmr: { server },
        },
        appType: "custom",
    });

    app.use(vite.middlewares);

    // Serve index.html for all non-API routes
    app.use((req, res, next) => {
        if (req.path.startsWith("/api")) {
            return next();
        }

        const url = req.originalUrl;

        (async () => {
            try {
                const clientPath = path.resolve(__dirname, "..", "client", "index.html");
                let template = fs.readFileSync(clientPath, "utf-8");
                template = await vite.transformIndexHtml(url, template);
                res.status(200).set({ "Content-Type": "text/html" }).end(template);
            } catch (e) {
                vite.ssrFixStacktrace(e as Error);
                next(e);
            }
        })();
    });

    log("Vite dev server configured");
}

export function serveStatic(app: Express) {
    const distPath = path.resolve(__dirname, "..", "dist", "public");

    if (!fs.existsSync(distPath)) {
        log(`Static files not found at ${distPath}. Please run 'npm run build' first.`, true);
        throw new Error("Production build not found. Run 'npm run build' first.");
    }

    app.use(express.static(distPath));

    // Serve index.html for all non-API routes
    app.use((req, res, next) => {
        if (req.path.startsWith("/api")) {
            return next();
        }
        res.sendFile(path.join(distPath, "index.html"));
    });

    log(`Serving static files from ${distPath}`);
}
