import type { AttendanceSummary } from "@/lib/store";

function formatTime(value: string | null) {
  if (!value) return "Esperando respuestas";
  return `Actualizado ${new Intl.DateTimeFormat("es-CL", { hour: "2-digit", minute: "2-digit" }).format(new Date(value))}`;
}

export function ResultsCard({ summary }: { summary: AttendanceSummary }) {
  const chartStyle = { "--yes": `${summary.yesPercent * 3.6}deg` } as React.CSSProperties;
  return (
    <section className="results-card" aria-label="Resultados en tiempo real">
      <div className="results-heading"><div><p className="eyebrow">Resultados en tiempo real</p><h2>¿Asistirán?</h2></div><span className="live-badge"><i />En vivo</span></div>
      <div className="chart-row">
        <div className="donut" style={chartStyle} role="img" aria-label={`${summary.yesPercent}% sí, ${summary.noPercent}% no`}><div className="donut-center"><strong>{summary.total}</strong><span>{summary.total === 1 ? "voto válido" : "votos válidos"}</span></div></div>
        <div className="legend">
          <div className="legend-item yes"><span className="legend-dot" /><div><strong>{summary.yesPercent}%</strong><span>Sí asistiré</span></div><b>{summary.yes}</b></div>
          <div className="legend-item no"><span className="legend-dot" /><div><strong>{summary.noPercent}%</strong><span>No asistiré</span></div><b>{summary.no}</b></div>
        </div>
      </div>
      <p className="updated-at">{formatTime(summary.updatedAt)}</p>
    </section>
  );
}
