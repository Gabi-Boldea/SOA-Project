import React, { useEffect, useState } from "react";

const API = "http://localhost:3010"; // nginx LB
const USER_ID = "1"; // required by the task service

export default function TasksWidget() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [err, setErr] = useState("");

  async function loadTasks(t = token) {
    setErr("");
    try {
      const resp = await fetch(`${API}/api/tasks`, {
        method: "GET",
        headers: {
          // JWT is not used by the task service, but keeping it is harmless
          Authorization: t ? `Bearer ${t}` : "",
          "x-user-id": USER_ID,
        },
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        setErr(`Failed to load tasks: ${resp.status} ${text}`);
        return;
      }

      setTasks(await resp.json());
    } catch (e) {
      setErr(`Load failed: ${e.message}`);
    }
  }

  async function createTask() {
    setErr("");
    try {
      const resp = await fetch(`${API}/api/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
          "x-user-id": USER_ID,
        },
        body: JSON.stringify({ title }),
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        setErr(`Failed to create task: ${resp.status} ${text}`);
        return;
      }

      setTitle("");
      await loadTasks();
    } catch (e) {
      setErr(`Create failed: ${e.message}`);
    }
  }

  useEffect(() => {
    // You can auto-load even without token, since x-user-id is what matters here
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ border: "1px solid #444", padding: 12, borderRadius: 8 }}>
      <h2>Tasks (micro-frontend)</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          style={{ flex: 1, padding: 8 }}
          placeholder="JWT token (optional for tasks right now)"
          value={token}
          onChange={(e) => {
            setToken(e.target.value);
            localStorage.setItem("token", e.target.value);
          }}
        />
        <button type="button" onClick={() => loadTasks()}>
          Load
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          style={{ flex: 1, padding: 8 }}
          placeholder="New task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="button" onClick={createTask} disabled={!title}>
          Create
        </button>
      </div>

      {err && <p style={{ color: "tomato" }}>{err}</p>}

      <ul>
        {tasks.map((t) => (
          <li key={t.id}>
            {t.title} {t.summary ? `— ${t.summary}` : ""}{" "}
            {t.completed ? "(done)" : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}
