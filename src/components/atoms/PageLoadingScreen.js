export default function PageLoadingScreen({ message = "Načítání..." }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface-2)",
      }}
    >
      <div style={{ fontSize: "1rem", color: "var(--muted)" }}>{message}</div>
    </div>
  );
}
