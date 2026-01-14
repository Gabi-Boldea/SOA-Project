const express = require("express");
require("dotenv").config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4010;

/**
 * This acts like a serverless function:
 * POST /generate-summary
 * input: { title: "..." }
 * output: { summary: "...", at: "..." }
 */
app.post("/generate-summary", (req, res) => {
  const { title } = req.body || {};
  if (!title) return res.status(400).json({ error: "Missing title" });

  // Simple “function logic” (you can improve later)
  const summary =
    title.length <= 25
      ? `Task: ${title}`
      : `Task: ${title.slice(0, 25)}...`;

  res.json({
    summary,
    at: new Date().toISOString(),
  });
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () =>
  console.log(`FaaS function listening on port ${PORT}`)
);
