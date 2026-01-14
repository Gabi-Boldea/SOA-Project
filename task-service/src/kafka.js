const { Kafka } = require("kafkajs");
require("dotenv").config();

const brokers = (process.env.KAFKA_BROKERS || "localhost:9092").split(",");
const topic = process.env.KAFKA_TASK_TOPIC || "task-events";

const kafka = new Kafka({
  clientId: "task-service",
  brokers,
});

const producer = kafka.producer();
let connected = false;

async function ensureProducer() {
  if (connected) return;
  await producer.connect();
  connected = true;
  console.log("[TaskService] Kafka producer connected");
}

async function publishKafkaEvent(event) {
  try {
    await ensureProducer();
    await producer.send({
      topic,
      messages: [
        {
          key: String(event.userId || ""),
          value: JSON.stringify(event),
        },
      ],
    });
  } catch (err) {
    console.error("[TaskService] Kafka publish failed:", err.message);
  }
}

module.exports = { publishKafkaEvent };
