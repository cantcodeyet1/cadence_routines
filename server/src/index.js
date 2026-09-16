import "dotenv/config";
import express from "express";
import cors from "cors";
import { routinesRouter } from "./routes/routines.js";
import { habitsRouter } from "./routes/habits.js";
import { sessionsRouter } from "./routes/sessions.js";

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.use("/api/routines", routinesRouter);
app.use("/api/habits", habitsRouter);
app.use("/api/sessions", sessionsRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Cadence server listening on http://localhost:${port}`));
