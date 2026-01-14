import React, { Suspense } from "react";


const TasksWidget = React.lazy(() => import("mf_tasks/TasksWidget"));
const NotificationsWidget = React.lazy(() =>
  import("mf_notifications/NotificationsWidget")
);

export default function App() {
  return (
    <div style={{ fontFamily: "sans-serif", padding: 16 }}>
      <h1>SOA Project Shell (Host)</h1>
      <p>
        This host loads two micro-frontends: Tasks (REST) + Notifications
        (Socket.IO).
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Suspense fallback={<div>Loading Tasks MFE...</div>}>
          <TasksWidget />
        </Suspense>

        <Suspense fallback={<div>Loading Notifications MFE...</div>}>
          <NotificationsWidget />
        </Suspense>
      </div>
    </div>
  );
}
