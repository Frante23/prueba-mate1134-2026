"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { AttendanceRecord, AttendanceSummary } from "@/lib/store";
import { ResultsCard } from "@/components/results-card";

type AdminPayload = { summary: AttendanceSummary; records: AttendanceRecord[] };

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [data, setData] = useState<AdminPayload | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const credentialsComplete = email.trim() !== "" && password !== "";

  const loadAdmin = useCallback(async (silent = false) => {
    if (!credentialsComplete) return;
    if (!silent) setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/teacher", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: email.trim().toLowerCase(), password }) });
      const payload = (await response.json()) as AdminPayload & { error?: string };
      if (!response.ok) throw new Error(payload.error || "No fue posible abrir el panel.");
      setData(payload);
    } catch (caught) {
      if (!silent) setError(caught instanceof Error ? caught.message : "No fue posible abrir el panel.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [credentialsComplete, email, password]);

  useEffect(() => {
    if (!data) return;
    const timer = window.setInterval(() => void loadAdmin(true), 5000);
    return () => window.clearInterval(timer);
  }, [data, loadAdmin]);

  function handleLogin(event: FormEvent) { event.preventDefault(); void loadAdmin(); }
  function logout() { setData(null); setEmail(""); setPassword(""); setError(""); setActionMessage(""); }

  function exportCsv() {
    if (!data) return;
    const rows = [["Nombre completo", "Correo institucional", "Voto", "Última actualización"], ...data.records.map((record) => [record.name, record.email, record.answer === "yes" ? "Sí" : "No", new Date(record.updatedAt).toLocaleString("es-CL")])];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "votos-mate1134.csv"; link.click(); URL.revokeObjectURL(url);
  }

  async function deleteVote(record: AttendanceRecord) {
    const confirmed = window.confirm(`¿Eliminar el voto de ${record.name} (${record.email})? Esta acción no se puede deshacer.`);
    if (!confirmed) return;

    setDeletingEmail(record.email);
    setActionMessage("");
    try {
      const response = await fetch("/api/teacher", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, studentEmail: record.email })
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "No fue posible eliminar el voto.");
      setData((current) => current ? {
        ...current,
        records: current.records.filter((item) => item.email !== record.email),
        summary: {
          ...current.summary,
          yes: current.summary.yes - Number(record.answer === "yes"),
          no: current.summary.no - Number(record.answer === "no"),
          total: Math.max(0, current.summary.total - 1)
        }
      } : current);
      await loadAdmin(true);
      setActionMessage(`Se eliminó el voto de ${record.name}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No fue posible eliminar el voto.");
    } finally {
      setDeletingEmail(null);
    }
  }

  const records = useMemo(() => data?.records ?? [], [data]);
  return (
    <main className="admin-page">
      <header className="admin-topbar"><div className="brand"><span className="brand-mark">UCT</span><span><strong>MATE1134</strong><small>Administración</small></span></div>{data && <button className="logout-button" onClick={logout}>Cerrar sesión</button>}</header>
      <div className="admin-shell">
        {!data ? (
          <div className="admin-login-grid">
            <section className="admin-welcome"><p className="admin-kicker">Acceso restringido</p><h1>Panel docente</h1><p>Consulta la votación en tiempo real y revisa el detalle de cada respuesta registrada.</p><div className="admin-feature"><span>01</span><p><strong>Datos en vivo</strong><small>El panel se actualiza automáticamente.</small></p></div><div className="admin-feature"><span>02</span><p><strong>Detalle protegido</strong><small>Los correos solo se muestran aquí.</small></p></div></section>
            <form className="teacher-login" onSubmit={handleLogin}>
              <span className="lock-icon">⌁</span><h2>Iniciar sesión</h2><p>Ingresa las credenciales de administración.</p>
              <label htmlFor="admin-email">Correo de administración <i className="required">Obligatorio</i></label><input id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
              <label htmlFor="admin-password">Contraseña <i className="required">Obligatorio</i></label><input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
              {error && <p className="form-message error" role="alert">{error}</p>}
              <button className="submit-button" disabled={!credentialsComplete || loading}>{loading ? "Verificando…" : credentialsComplete ? "Ingresar al panel" : "Completa tus credenciales"}<span>→</span></button>
            </form>
          </div>
        ) : (
          <div className="teacher-layout">
            <section className="admin-heading"><div><p className="admin-kicker">Administración · En vivo</p><h1>Detalle de votación</h1><p>Vista privada de las respuestas válidas registradas.</p></div><div className="record-actions"><button onClick={() => void loadAdmin()}>Actualizar ahora</button><button className="primary" onClick={exportCsv}>Descargar CSV</button></div></section>
            <div className="teacher-summary-row"><ResultsCard summary={data.summary} /><div className="quick-stats"><article><span>Total</span><strong>{data.summary.total}</strong><small>votos válidos</small></article><article className="yes"><span>Asistirán</span><strong>{data.summary.yes}</strong><small>{data.summary.yesPercent}% del total</small></article><article className="no"><span>No asistirán</span><strong>{data.summary.no}</strong><small>{data.summary.noPercent}% del total</small></article></div></div>
            <section className="records-card"><div className="records-heading"><div><p className="eyebrow">Detalle individual</p><h2>Votos registrados</h2></div><span className="live-badge"><i />Actualización automática</span></div>{actionMessage && <p className="form-message success action-message" role="status">{actionMessage}</p>}{error && <p className="form-message error action-message" role="alert">{error}</p>}<div className="table-wrap"><table><thead><tr><th>Nombre completo</th><th>Correo institucional</th><th>Voto</th><th>Última actualización</th><th>Acciones</th></tr></thead><tbody>{records.length ? records.map((record) => <tr key={record.email}><td data-label="Nombre"><strong>{record.name}</strong></td><td data-label="Correo">{record.email}</td><td data-label="Voto"><span className={`status ${record.answer}`}>{record.answer === "yes" ? "Sí asistirá" : "No asistirá"}</span></td><td data-label="Actualización">{new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(record.updatedAt))}</td><td data-label="Acciones"><button className="delete-vote-button" onClick={() => void deleteVote(record)} disabled={deletingEmail === record.email}>{deletingEmail === record.email ? "Eliminando…" : "Eliminar voto"}</button></td></tr>) : <tr><td colSpan={5} className="empty-cell">Aún no hay votos registrados.</td></tr>}</tbody></table></div></section>
          </div>
        )}
      </div>
    </main>
  );
}
