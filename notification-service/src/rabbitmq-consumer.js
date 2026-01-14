const amqp = require("amqplib");
require("dotenv").config();

const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost:5672";
const QUEUE = process.env.RABBITMQ_TASK_EVENTS_QUEUE || "task_events";

function startTaskEventsConsumer(io) {
  async function connectAndConsume() {
    const conn = await amqp.connect(RABBITMQ_URL);
    const channel = await conn.createChannel();
    await channel.assertQueue(QUEUE, { durable: true });

    console.log("[NotificationService] Connected to RabbitMQ. Waiting for messages...");

    channel.consume(
      QUEUE,
      (msg) => {
        if (!msg) return;
        const raw = msg.content.toString("utf8");

        try {
          const event = JSON.parse(raw);

          // Send only to the correct user
          if (event.userId) {
            io.to(`user:${event.userId}`).emit("notification", {
              type: event.type,
              message:
                event.type === "task.created"
                  ? `Task created: ${event.task?.title}`
                  : event.type === "task.updated"
                  ? `Task updated: ${event.task?.title}`
                  : event.type === "task.deleted"
                  ? `Task deleted: ${event.taskId}`
                  : "Task event",
              event,
              at: new Date().toISOString(),
            });
          } else {
            console.warn("[NotificationService] Event missing userId:", event);
          }
        } catch (err) {
          console.error("[NotificationService] Bad message:", raw);
        } finally {
          channel.ack(msg);
        }
      },
      { noAck: false }
    );

    conn.on("close", () => {
      console.error("[NotificationService] RabbitMQ connection closed. Reconnecting in 5s...");
      setTimeout(connectWithRetry, 5000);
    });

    conn.on("error", (err) => {
      console.error("[NotificationService] RabbitMQ error:", err.message);
    });
  }

  function connectWithRetry() {
    connectAndConsume().catch((err) => {
      console.error("[NotificationService] RabbitMQ connect failed:", err.message);
      setTimeout(connectWithRetry, 5000);
    });
  }

  connectWithRetry();
}

module.exports = { startTaskEventsConsumer };
