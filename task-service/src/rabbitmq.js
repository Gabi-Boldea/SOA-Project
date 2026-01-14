const amqp = require("amqplib");
require("dotenv").config();

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const QUEUE = process.env.RABBITMQ_TASK_EVENTS_QUEUE || "task_events";

let conn = null;
let channel = null;

async function getChannel() {
  if (channel) return channel;

  conn = await amqp.connect(RABBITMQ_URL);
  channel = await conn.createChannel();
  await channel.assertQueue(QUEUE, { durable: true });

  conn.on("close", () => {
    conn = null;
    channel = null;
    console.error("[TaskService] RabbitMQ connection closed.");
  });

  conn.on("error", (err) => {
    console.error("[TaskService] RabbitMQ connection error:", err.message);
  });

  return channel;
}

async function publishTaskEvent(event) {
  try {
    const ch = await getChannel();
    const payload = Buffer.from(JSON.stringify(event));
    ch.sendToQueue(QUEUE, payload, { persistent: true });
  } catch (err) {
    console.error("[TaskService] Failed to publish event:", err.message);
  }
}

module.exports = { publishTaskEvent };
