"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { AttendanceAnswer, AttendanceSummary } from "@/lib/store";
import { ResultsCard } from "@/components/results-card";
import { getUctUsernameError, isFullName, isValidUctEmail, normalizeName } from "@/lib/validation";

const EMPTY_SUMMARY: AttendanceSummary = {
  yes: 0,
  no: 0,
  total: 0,
  yesPercent: 0,
  noPercent: 0,
  updatedAt: null
};

export default function Home() {
  const [fullName, setFullName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [emailUser, setEmailUser] = useState("");
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailDomainError, setEmailDomainError] = useState(false);
  const [answer, setAnswer] = useState<AttendanceAnswer | null>(null);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const normalizedName = normalizeName(fullName);
  const nameIsValid = isFullName(fullName);
  const normalizedUser = emailUser.trim().toLowerCase();
  const normalizedEmail = `${normalizedUser}@alu.uct.cl`;
  const usernameError = getUctUsernameError(normalizedUser);
  const emailIsValid = !emailDomainError && usernameError === null && isValidUctEmail(normalizedEmail);
  const formIsComplete = nameIsValid && emailIsValid && answer !== null;
  const completedFields = Number(nameIsValid) + Number(emailIsValid) + Number(answer !== null);

  const loadSummary = useCallback(async () => {
    try {
      const response = await fetch("/api/results", { cache: "no-store" });
      if (!response.ok) return;
      setSummary((await response.json()) as AttendanceSummary);
    } catch {
      // Keep the latest successful total visible during brief connection issues.
    }
  }, []);

  useEffect(() => {
    void loadSummary();
    const timer = window.setInterval(loadSummary, 3500);
    return () => window.clearInterval(timer);
  }, [loadSummary]);

  const submitResponse = useCallback(async (studentName: string, studentEmail: string, selected: AttendanceAnswer) => {
    const cleanName = normalizeName(studentName);
    const cleanEmail = studentEmail.trim().toLowerCase();
    if (!isFullName(cleanName)) {
      throw new Error("Ingresa tu nombre completo, incluyendo nombre y apellido.");
    }
    if (!isValidUctEmail(cleanEmail)) {
      throw new Error("El correo debe seguir uno de los formatos institucionales y terminar en @alu.uct.cl.");
    }

    const response = await fetch("/api/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: cleanName, email: cleanEmail, answer: selected })
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(payload.error || "No pudimos guardar tu respuesta.");
    await loadSummary();
    return { ok: true, name: cleanName, email: cleanEmail, answer: selected };
  }, [loadSummary]);

  useEffect(() => {
    const modelContext = (document as Document & {
      modelContext?: {
        registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void>;
      };
    }).modelContext;
    if (!modelContext?.registerTool) return;

    const lifecycle = new AbortController();
    void Promise.resolve(modelContext.registerTool({
      name: "registrar_asistencia_evaluacion",
      title: "Registrar asistencia",
      description: "Registra si un estudiante asistirá a la evaluación usando su correo @alu.uct.cl.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "Nombre completo del estudiante" },
          email: { type: "string", description: "Correo institucional del estudiante" },
          answer: { type: "string", enum: ["yes", "no"] }
        },
        required: ["name", "email", "answer"],
        additionalProperties: false
      },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: async (input: unknown) => {
        const value = input as { name?: unknown; email?: unknown; answer?: unknown };
        if (typeof value.name !== "string" || typeof value.email !== "string" || (value.answer !== "yes" && value.answer !== "no")) {
          throw new Error("Debes completar nombre, correo y respuesta.");
        }
        const result = await submitResponse(value.name, value.email, value.answer);
        setFullName(result.name);
        setEmailUser(result.email.replace(/@alu\.uct\.cl$/i, ""));
        setAnswer(result.answer);
        setMessage({ type: "success", text: "Voto válido y registrado correctamente." });
        return result;
      }
    }, { signal: lifecycle.signal })).catch(() => undefined);

    return () => lifecycle.abort();
  }, [submitResponse]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setNameTouched(true);
    setEmailTouched(true);
    if (!formIsComplete || !answer) {
      setMessage({ type: "error", text: "Completa todos los campos obligatorios antes de enviar." });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      await submitResponse(fullName, normalizedEmail, answer);
      setFullName(normalizedName);
      setEmailUser(normalizedUser);
      setMessage({
        type: "success",
        text: "Voto válido y registrado. El resultado en vivo ya fue actualizado."
      });
    } catch (error) {
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Ocurrió un error." });
    } finally {
      setSubmitting(false);
    }
  }

  const completionText = useMemo(
    () => formIsComplete ? "Todo listo para enviar" : `${completedFields} de 3 campos completados`,
    [completedFields, formIsComplete]
  );

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="Inicio">
          <span className="brand-mark">UCT</span>
          <span><strong>MATE1134</strong><small>Evaluación 2026</small></span>
        </a>
        <span className="student-badge">Portal de estudiantes</span>
      </header>

      <div className="page-shell" id="inicio">
        <section className="intro">
          <p className="eyebrow">Confirmación de asistencia</p>
          <h1>¿Asistirás a la evaluación?</h1>
          <p>Completa los tres campos obligatorios. Tu voto se registrará y actualizará el resultado en vivo solo después de enviarlo correctamente.</p>
        </section>

        <div className="workspace-grid">
          <form className="form-card" onSubmit={handleSubmit} noValidate>
            <div className={`completion-status ${formIsComplete ? "complete" : ""}`} aria-live="polite">
              <div>
                <span className="completion-icon">{formIsComplete ? "✓" : completedFields}</span>
                <p><strong>{completionText}</strong><small>Nombre, correo y respuesta son obligatorios</small></p>
              </div>
              <div className="completion-track"><span style={{ width: `${completedFields * (100 / 3)}%` }} /></div>
            </div>

            <div className="step-label">
              <span>1</span>
              <p><strong>Tu nombre completo <i className="required">Obligatorio</i></strong><small>Escribe al menos un nombre y un apellido.</small></p>
            </div>
            <label className="input-label" htmlFor="full-name">Nombre y apellido</label>
            <div className={`email-field identity-field ${nameTouched && !nameIsValid ? "invalid" : ""}`}>
              <span className="field-prefix" aria-hidden="true">Aa</span>
              <input
                id="full-name"
                type="text"
                autoComplete="name"
                placeholder="Nombre Apellido"
                value={fullName}
                onChange={(event) => {
                  setFullName(event.target.value);
                  setMessage(null);
                }}
                onBlur={() => setNameTouched(true)}
                aria-invalid={nameTouched && !nameIsValid}
                aria-describedby="name-help"
                maxLength={100}
                required
              />
            </div>
            <p id="name-help" className={`field-help ${nameTouched && !nameIsValid ? "error" : ""}`}>
              {nameTouched && !nameIsValid ? "Ingresa tu nombre completo, incluyendo nombre y apellido." : "Ejemplo: Camila Antonia Pérez Soto"}
            </p>

            <div className="divider" />
            <div className="step-label">
              <span>2</span>
              <p><strong>Tu correo institucional <i className="required">Obligatorio</i></strong><small>El dominio UCT se agrega automáticamente para evitar errores.</small></p>
            </div>
            <label className="input-label" htmlFor="email-user">Usuario del correo institucional</label>
            <div className={`email-field institutional-email ${emailTouched && !emailIsValid ? "invalid" : ""}`}>
              <input
                id="email-user"
                type="text"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="foyarzo2023"
                value={emailUser}
                onChange={(event) => {
                  const compact = event.target.value.trim().toLowerCase().replace(/\s+/g, "");
                  const parts = compact.split("@");
                  setEmailUser(parts[0] ?? "");
                  setEmailDomainError(parts.length > 1 && (parts.length !== 2 || parts[1] !== "alu.uct.cl"));
                  setMessage(null);
                }}
                onBlur={() => setEmailTouched(true)}
                aria-invalid={emailTouched && !emailIsValid}
                aria-describedby="email-help"
                maxLength={80}
                required
              />
              <span className="email-domain" aria-hidden="true">@alu.uct.cl</span>
            </div>
            <p id="email-help" className={`field-help ${emailTouched && !emailIsValid ? "error" : ""}`}>
              {emailTouched && !emailIsValid
                ? (emailDomainError ? "Solo se permiten correos con dominio @alu.uct.cl." : usernameError)
                : "Formatos válidos: foyarzo2023 o franco.oyarzo2023."}
            </p>

            <div className="divider" />
            <div className="step-label">
              <span>3</span>
              <p><strong>Confirma tu asistencia <i className="required">Obligatorio</i></strong><small>Selecciona una de las dos alternativas.</small></p>
            </div>
            <div className="answer-grid" role="radiogroup" aria-label="¿Asistirás a la evaluación?">
              <button type="button" role="radio" aria-checked={answer === "yes"} className={`answer-option yes ${answer === "yes" ? "selected" : ""}`} onClick={() => { setAnswer("yes"); setMessage(null); }}>
                <span className="choice-icon">✓</span><strong>Sí, asistiré</strong><small>Confirmo mi participación</small>
              </button>
              <button type="button" role="radio" aria-checked={answer === "no"} className={`answer-option no ${answer === "no" ? "selected" : ""}`} onClick={() => { setAnswer("no"); setMessage(null); }}>
                <span className="choice-icon">×</span><strong>No asistiré</strong><small>No podré participar</small>
              </button>
            </div>

            {message && <p className={`form-message ${message.type}`} role="status">{message.text}</p>}
            <button className="submit-button" type="submit" disabled={!formIsComplete || submitting}>
              {submitting ? "Registrando voto…" : formIsComplete ? "Registrar voto" : "Completa todos los campos"}
              <span>{formIsComplete ? "→" : "•"}</span>
            </button>
            <p className="privacy-note">Tu correo solo es visible para el equipo docente.</p>
          </form>
          <ResultsCard summary={summary} />
        </div>
      </div>

      <footer><span>Universidad Católica de Temuco</span><span>MATE1134 · 2026</span></footer>
    </main>
  );
}
