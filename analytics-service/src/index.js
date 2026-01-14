const express = require("express");
const { Kafka } = require("kafkajs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3004;

const brokers = (process.env.KAFKA_BROKERS || "localhost:9092").split(",");
const topic = process.env.KAFKA_TASK_TOPIC || "task-events";
const groupId = process.env.KAFKA_GROUP_ID || "analytics-service-group";

const stats = {
  total: 0,
  byType: {},
  lastEvent: null,
};

async function startConsumer() {
  const kafka = new Kafka({ clientId: "analytics-service", brokers });
  const consumer = kafka.consumer({ groupId });

  await consumer.connect();
  await consumer.subscribe({ topic, fromBeginning: true });

  console.log(`[AnalyticsService] Kafka consumer connected. Topic=${topic}`);

  await consumer.run({
    eachMessage: async ({ message }) => {
      try {
        const value = message.value?.toString("utf8") || "";
        const event = JSON.parse(value);

        stats.total += 1;
        stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;
        stats.lastEvent = event;
      } catch (err) {
        console.error("[AnalyticsService] Bad message:", err.message);
      }
    },
  });
}

app.get("/stats", (req, res) => {
  res.json(stats);
});

app.get("/health", (req, res) => res.json({ ok: true }));

startConsumer().catch((err) => {
  console.error("[AnalyticsService] Consumer failed:", err.message);
  process.exit(1);
});

app.listen(PORT, () => console.log(`Analytics service listening on port ${PORT}`));
