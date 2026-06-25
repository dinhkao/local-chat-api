import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import groupsApp from "./routes/groups.js";
import messagesApp from "./routes/messages.js";
import messageActionsApp from "./routes/message-actions.js";
import usersApp from "./routes/users.js";
import searchApp from "./routes/search.js";
import { handleUpgrade } from "./ws.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3004");

const app = new Hono();

app.route("/api/groups", groupsApp);
app.route("/api/groups/:id/messages", messagesApp);
app.route("/api/groups/:id/search", searchApp);
app.route("/api/messages", messageActionsApp);
app.route("/api/users", usersApp);

// Serve static frontend
app.use("/static/*", serveStatic({ root: __dirname }));
app.get("/", (c) => {
  const html = readFileSync(join(__dirname, "static", "index.html"), "utf-8");
  return c.html(html);
});

const server = serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`local-chat-api → http://localhost:${info.port}`);
  console.log(`ws → ws://localhost:${info.port}/ws/:groupId`);
});

handleUpgrade(server);
