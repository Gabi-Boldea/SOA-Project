import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_ORIGIN = "http://localhost:3010"; // nginx LB (same origin as shell)
const USER_ID = "1";

export default function NotificationsWidget() {
  const [token, setToken] = useState((localStorage.getItem("token") || "").trim());
  const [events, setEvents] = useState([]);

  const socketRef = useRef(null);

  function log(type, message, extra) {
    setEvents((prev) => [
      { type, message, extra, ts: new Date().toISOString() },
      ...prev,
    ]);
  }

  // Create socket only when user explicitly clicks "Reconnect"
  const connect = () => {
    const t = (token || "").trim();

    if (!t) {
      log("error", "Missing token (paste token first)");
      return;
    }

    // If a socket already exists, close it first
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.close();
      socketRef.current = null;
    }

    const s = io(SOCKET_ORIGIN, {
      // IMPORTANT: nginx location is /socket.io/ so keep this aligned
      path: "/socket.io/",
      transports: ["websocket", "polling"],

      // Many servers read this:
      auth: { token: t, userId: USER_ID },

      // Others read query params:
      query: { token: t, userId: USER_ID },

      // Dev friendliness
      reconnection: true,
      reconnectionAttempts: 10,
      timeout: 8000,
      withCredentials: true,
    });

    socketRef.current = s;

    // ---- listeners ----
    s.on("connect", () => log("system", `Socket connected: ${s.id}`));

    s.on("disconnect", (reason) => log("system", `Socket disconnected: ${reason}`));

    s.on("connect_error", (err) => {
      log("error", `connect_error: ${err?.message || String(err)}`, {
        name: err?.name,
        description: err?.description,
        context: err?.context,
      });
    });

    // Common event names
    s.on("notification", (data) =>
      log("notification", data?.message || "notification received", data)
    );

    s.on("message", (data) =>
      log("message", data?.message || "message received", data)
    );

    // If your backend emits something else, you can add it here later.
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ border: "1px solid #444", padding: 12, borderRadius: 8 }}>
      <h2>Notifications (micro-frontend)</h2>

      <input
        style={{ width: "100%", padding: 8, marginBottom: 10 }}
        placeholder="JWT token (paste once, stored in localStorage)"
        value={token}
        onChange={(e) => {
          const v = e.target.value;
          setToken(v);
          localStorage.setItem("token", v);
        }}
      />

      <button
        type="button"
        onClick={() => {
          // trim at the moment of connecting
          setToken((prev) => {
            const trimmed = (prev || "").trim();
            localStorage.setItem("token", trimmed);
            return trimmed;
          });
          // connect with the (current) token state; connect() will trim too
          connect();
        }}
        style={{ marginBottom: 10 }}
      >
        Reconnect
      </button>

      <ul>
        {events.map((e, idx) => (
          <li key={idx}>
            <b>{e.type}</b>: {e.message}{" "}
            <small style={{ opacity: 0.7 }}>{e.ts}</small>
            {e.extra ? (
              <pre style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                {JSON.stringify(e.extra, null, 2)}
              </pre>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
