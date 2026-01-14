const express = require('express');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const INSTANCE_ID = process.env.INSTANCE_ID || "A";

const app = express();
app.use(express.json());

// simple in-memory task storage: { userId: [ {id, title, completed}, ... ] }
const tasksByUser = {};

const { publishTaskEvent } = require("./rabbitmq");

const { publishKafkaEvent } = require("./kafka");


async function callFaasSummary(title) {
  try {
    const baseUrl = process.env.FAAS_URL || "http://localhost:4010";
    const resp = await fetch(`${baseUrl}/generate-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    return data.summary || null;
  } catch (err) {
    console.error("FaaS call failed:", err.message);
    return null;
  }
}


// GET /tasks: list tasks for the authenticated user
app.get('/tasks', (req, res) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Missing user ID header' });
  }
  const tasks = tasksByUser[userId] || [];
  res.setHeader("X-Task-Instance", INSTANCE_ID);
  res.json(tasks);
});

// POST /tasks: create a new task for the user
app.post('/tasks', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { title } = req.body;
  if (!userId || !title) {
    return res.status(400).json({ error: 'Missing user ID or task title' });
  }

  const newTask = {
    id: uuidv4(),
    title,
    completed: false,
  };

  const summary = await callFaasSummary(title);
if (summary) {
  newTask.summary = summary;
}


  if (!tasksByUser[userId]) {
    tasksByUser[userId] = [];
  }
  tasksByUser[userId].push(newTask);

    // Publish task created event
    publishTaskEvent({
  type: "task.created",
  userId,
  task: newTask,
  at: new Date().toISOString(),
});

    publishKafkaEvent({
  type: "task.created",
  userId,
  task: newTask,
  at: new Date().toISOString(),
});

res.setHeader("X-Task-Instance", INSTANCE_ID);
res.status(201).json(newTask);

});

// PUT /tasks/:id: update a task
app.put('/tasks/:id', (req, res) => {
  const userId = req.headers['x-user-id'];
  const { id } = req.params;
  const { title, completed } = req.body;
  const tasks = tasksByUser[userId] || [];
  const task = tasks.find(t => t.id === id);

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (title !== undefined) task.title = title;
  if (completed !== undefined) task.completed = completed;

  res.setHeader("X-Task-Instance", INSTANCE_ID);
  res.json(task);

    // Publish task updated event
    publishTaskEvent({
  type: "task.updated",
  userId,
  task,
  at: new Date().toISOString(),
});

publishKafkaEvent({
  type: "task.updated",
  userId,
  task,
  at: new Date().toISOString(),
});

});

// DELETE /tasks/:id: remove a task
app.delete('/tasks/:id', (req, res) => {
  const userId = req.headers['x-user-id'];
  const { id } = req.params;
  let tasks = tasksByUser[userId] || [];
  const initialLength = tasks.length;
  tasks = tasks.filter(t => t.id !== id);
  tasksByUser[userId] = tasks;

  if (tasks.length === initialLength) {
    return res.status(404).json({ error: 'Task not found' });
  }
  res.setHeader("X-Task-Instance", INSTANCE_ID);
  res.status(204).end();

    // Publish task deleted event
    publishTaskEvent({
  type: "task.deleted",
  userId,
  taskId: id,
  at: new Date().toISOString(),
});

publishKafkaEvent({
  type: "task.deleted",
  userId,
  taskId: id,
  at: new Date().toISOString(),
});

});

// start the service
const port = process.env.PORT || 3002;
app.listen(port, () => {
  console.log(`Task service listening on port ${port}`);
});
