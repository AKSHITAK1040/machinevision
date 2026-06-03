export default function DashboardPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "120px 50px",
      }}
    >
      <h1>Analytics Dashboard</h1>

      <div
        style={{
          marginTop: "30px",
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "20px",
        }}
      >
        <div
          style={{
            background: "#111",
            padding: "30px",
            borderRadius: "16px",
          }}
        >
          Videos Processed
        </div>

        <div
          style={{
            background: "#111",
            padding: "30px",
            borderRadius: "16px",
          }}
        >
          AI Detections
        </div>

        <div
          style={{
            background: "#111",
            padding: "30px",
            borderRadius: "16px",
          }}
        >
          User Engagement
        </div>
      </div>
    </div>
  );
}