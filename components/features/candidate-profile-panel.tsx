"use client";

/**
 * CandidateProfilePanel (Fase 1) — panel de perfil reutilizable en 3 modos
 * (split / drawer / full). Es la recomendación central del handoff designV2:
 * un solo componente compartido entre el detalle de plaza y el pool de talento.
 *
 * Reutiliza el wiring real existente:
 *   - <CandidateNotes> (notas con backend)
 *   - <CandidateStatusSelect> (cambio de status con server action)
 *   - getCvDownloadSignedUrl (descarga de CV firmada)
 *
 * Señal AI aún sin dato en el modelo (match score, inglés/CEFR) → fallback
 * elegante ("—" / "Sin datos"); la Fase 5 la enciende sin re-trabajo.
 *
 * i18n: por ahora en español (locale por defecto). EN queda como follow-up.
 */

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Icon } from "@/components/app/icon";
import {
  Avatar,
  CefrMeter,
  Chip,
  ScoreRing,
  getInitials,
} from "@/components/design/primitives";
import { CandidateNotes } from "@/components/candidate-notes";
import { CandidateStatusSelect } from "@/components/candidate-status-select";
import { CvMarkdownPreview } from "@/components/cv-markdown-preview";
import { getCvDownloadSignedUrl } from "@/src/lib/candidate-cv-download";
import { type Candidate, redFlagsIsClear } from "@/src/types/candidate";

export type ProfileMode = "split" | "drawer" | "full";

interface CandidateProfilePanelProps {
  candidate: Candidate;
  mode?: ProfileMode;
  idx?: number;
  total?: number;
  onNav?: (dir: -1 | 1) => void;
  onClose?: () => void;
  onExpand?: () => void;
  /** Control de status contextual (ej. stage de plaza). Default: status global del candidato. */
  statusSlot?: React.ReactNode;
}

type TabKey = "analisis" | "notas" | "cv" | "contacto" | "actividad";

const DASH = "—";

function waHref(phone: string): string | null {
  const digits = phone.replace(/[^\d]/g, "");
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}

/**
 * Extrae la sección "Experiencia (Crítica y Logros)" del análisis markdown
 * (`cv_markdown`): desde el heading que empieza con "Experiencia" hasta el
 * siguiente heading. Devuelve null si no se encuentra.
 */
function extractExperienceSection(md: string): string | null {
  if (!md) return null;
  const lines = md.split("\n");
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^#{1,4}\s*Experiencia/i.test(lines[i].trim())) {
      start = i;
      break;
    }
  }
  if (start < 0) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#{1,4}\s+\S/.test(lines[i].trim())) {
      end = i;
      break;
    }
  }
  const section = lines.slice(start, end).join("\n").trim();
  return section.length > 0 ? section : null;
}

/** Icon-button con tooltip del valor; al hacer click copia el valor al portapapeles. */
function CopyBtn({ icon, value, label }: { icon: string; value: string; label: string }) {
  if (!value) return null;
  function copy() {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(value).then(
      () => toast.success(`${label} copiado`),
      () => toast.error("No se pudo copiar"),
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="icon-btn sm" onClick={copy} aria-label={`Copiar ${label.toLowerCase()}`}>
          <Icon name={icon} size={15} />
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <span className="mono">{value}</span>
      </TooltipContent>
    </Tooltip>
  );
}

export function CandidateProfilePanel({
  candidate,
  mode = "split",
  idx,
  total,
  onNav,
  onClose,
  onExpand,
  statusSlot,
}: CandidateProfilePanelProps) {
  const [tab, setTab] = useState<TabKey>("analisis");
  const [cvPending, startCv] = useTransition();
  const isFull = mode === "full";
  const hasNav = idx != null && total != null && total > 1;

  const c = candidate;
  const initials = getInitials(c.nombre);
  const hasFlags = !redFlagsIsClear(c.red_flags);
  const wa = waHref(c.telefono);
  const stack = [...c.lenguajes];
  const tools = [...c.frameworks, ...c.patrones];
  const added = c.created_at ? new Date(c.created_at).toLocaleDateString() : DASH;
  const experienceMd = extractExperienceSection(c.cv_markdown);

  function downloadCv() {
    if (!c.cv_storage_path) return;
    startCv(async () => {
      const res = await getCvDownloadSignedUrl(c.id);
      if (res.ok) window.open(res.url, "_blank", "noopener,noreferrer");
    });
  }

  const status = statusSlot ?? (
    <CandidateStatusSelect candidateId={c.id} currentStatus={c.status} />
  );

  const TABS: [TabKey, string, number | null][] = [
    ["analisis", "Análisis IA", null],
    ["notas", "Notas", null],
    ["cv", "Experiencia", null],
    ["contacto", "Contacto", null],
    ["actividad", "Actividad", null],
  ];

  const head = (
    <div className="panel-head">
      <div className="pnav">
        {hasNav && (
          <>
            <button className="icon-btn sm" onClick={() => onNav?.(-1)} disabled={idx! <= 0} aria-label="Anterior">
              <Icon name="arrowLeft" size={16} />
            </button>
            <button className="icon-btn sm" onClick={() => onNav?.(1)} disabled={idx! >= total! - 1} aria-label="Siguiente">
              <Icon name="arrowRight" size={16} />
            </button>
            <span className="mono pcount">
              {idx! + 1} <span style={{ color: "var(--faint)" }}>/ {total}</span>
            </span>
          </>
        )}
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          {!isFull && onExpand && (
            <button className="icon-btn sm" title="Expandir a página completa" onClick={onExpand}>
              <Icon name="expand" size={15} />
            </button>
          )}
          {!isFull && onClose && (
            <button className="icon-btn sm" onClick={onClose} aria-label="Cerrar">
              <Icon name="x" size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="pident">
        <Avatar initials={initials} size={isFull ? 60 : 52} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pname">{c.nombre || DASH}</div>
          <div className="prole">
            {c.rol_principal || DASH} · <span className="mono">{c.pais_residencia || "Sin país"}</span>
          </div>
        </div>
        <div style={{ flexShrink: 0 }}>{status}</div>
      </div>

      <div className="pactions">
        <button className="btn btn-secondary btn-sm" onClick={downloadCv} disabled={!c.cv_storage_path || cvPending}>
          <Icon name="download" size={14} />
          {cvPending ? "Generando…" : "Descargar CV"}
        </button>
        {wa ? (
          <a className="btn btn-wa btn-sm" href={wa} target="_blank" rel="noopener noreferrer">
            <Icon name="whatsapp" size={14} />
            WhatsApp
          </a>
        ) : (
          <button className="btn btn-wa btn-sm" disabled>
            <Icon name="whatsapp" size={14} />
            WhatsApp
          </button>
        )}
        <CopyBtn icon="mail" value={c.email} label="Correo" />
        <CopyBtn icon="phone" value={c.telefono} label="Teléfono" />
      </div>

      {/* At-a-glance: señal AI arriba de todo */}
      <div className="glance">
        <div className="g-ring">
          <ScoreRing score={null} size={72} stroke={7} />
        </div>
        <div className="g-cells">
          <div className="g-cell">
            <div className="k">Inglés (CEFR)</div>
            {c.nivel_ingles ? (
              <div className="v" style={{ color: "var(--eng)" }}>
                {c.nivel_ingles}
                {c.nivel_ingles_confianza != null && (
                  <span className="sub"> · {c.nivel_ingles_confianza}% conf.</span>
                )}
              </div>
            ) : (
              <div className="v" style={{ color: "var(--faint)" }}>Sin datos</div>
            )}
          </div>
          <div className="g-cell">
            <div className="k">Seniority</div>
            <div className="v">{c.seniority_estimado || DASH}</div>
          </div>
          <div className="g-cell">
            <div className="k">Experiencia</div>
            <div className="v mono" style={{ fontSize: 13 }}>{c.anos_experiencia_total} años</div>
          </div>
          <div className="g-cell">
            <div className="k">Alertas</div>
            <div className="v" style={{ color: hasFlags ? "var(--neg)" : "var(--pos)" }}>
              {hasFlags ? "Red flag" : "Sin alertas"}
            </div>
          </div>
        </div>
      </div>

      <div className="ptabs">
        {TABS.map(([k, label, n]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
            {label}
            {n != null && n > 0 && <span className="ptn">{n}</span>}
          </button>
        ))}
      </div>
    </div>
  );

  const mainBody = (
    <div className="pb-main">
      {tab === "analisis" && (
        <div className="stack">
          {c.resumen_ejecutivo && (
            <div className="ai-box">
              <div className="ai-h">
                <span className="i"><Icon name="spark" size={13} /></span>
                <span className="t">Resumen ejecutivo</span>
                <span className="by"><Icon name="spark" size={9} />IA</span>
              </div>
              <p>{c.resumen_ejecutivo}</p>
            </div>
          )}
          {hasFlags && (
            <div className="flag warn">
              <span className="fi"><Icon name="alert" size={13} /></span>
              <div>
                <b>Red flags detectadas</b>
                <p>{c.red_flags}</p>
              </div>
            </div>
          )}
          <div className="card2">
            <h4 style={{ marginBottom: 12 }}>
              Stack tecnológico{" "}
              <span className="badge b-ai" style={{ marginLeft: 6 }}><Icon name="spark" size={9} />extraído</span>
            </h4>
            {stack.length > 0 && (
              <>
                <div className="tglabel">Lenguajes</div>
                <div className="chips">{stack.map((l) => <Chip key={l}>{l}</Chip>)}</div>
              </>
            )}
            {tools.length > 0 && (
              <>
                <div className="tglabel" style={{ marginTop: 12 }}>Frameworks &amp; herramientas</div>
                <div className="chips">{tools.map((l) => <Chip key={l}>{l}</Chip>)}</div>
              </>
            )}
            {stack.length === 0 && tools.length === 0 && (
              <p style={{ fontSize: 13, color: "var(--faint)" }}>Sin stack extraído.</p>
            )}
          </div>
          {c.sectores.length > 0 && (
            <div className="card2">
              <h4 style={{ marginBottom: 12 }}>Sectores</h4>
              <div className="chips">{c.sectores.map((s) => <Chip key={s}>{s}</Chip>)}</div>
            </div>
          )}
        </div>
      )}

      {tab === "notas" && <CandidateNotes candidateId={c.id} />}

      {tab === "cv" && (
        <div className="stack">
          {experienceMd && (
            <div className="card2">
              <CvMarkdownPreview markdown={experienceMd} />
            </div>
          )}
          {c.educacion_formal && (
            <div className="card2">
              <h4 style={{ marginBottom: 8 }}>Educación</h4>
              <p style={{ fontSize: 13, color: "var(--faint)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{c.educacion_formal}</p>
            </div>
          )}
          {c.certificaciones.length > 0 && (
            <div className="card2">
              <h4 style={{ marginBottom: 12 }}>Certificaciones</h4>
              <div className="chips">{c.certificaciones.map((s) => <Chip key={s}>{s}</Chip>)}</div>
            </div>
          )}
          {!experienceMd && !c.educacion_formal && c.certificaciones.length === 0 && (
            <p style={{ fontSize: 13, color: "var(--faint)" }}>Sin datos de experiencia.</p>
          )}
        </div>
      )}

      {tab === "contacto" && (
        <div className="stack">
          <div className="card2">
            <h4 style={{ marginBottom: 14 }}>Ubicación y contacto</h4>
            <div className="kv">
              <div className="row"><span className="k">País de residencia</span><b>{c.pais_residencia || DASH}</b></div>
              <div className="row">
                <span className="k">Correo</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <b className="mono" style={{ fontSize: 13 }}>{c.email || DASH}</b>
                  {c.email && (
                    <button className="icon-btn sm" onClick={() => navigator.clipboard?.writeText(c.email)} aria-label="Copiar correo">
                      <Icon name="copy" size={13} />
                    </button>
                  )}
                </span>
              </div>
              <div className="row">
                <span className="k">Teléfono</span>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <b className="mono" style={{ fontSize: 13 }}>{c.telefono || DASH}</b>
                  {c.telefono && (
                    <button className="icon-btn sm" onClick={() => navigator.clipboard?.writeText(c.telefono)} aria-label="Copiar teléfono">
                      <Icon name="copy" size={13} />
                    </button>
                  )}
                </span>
              </div>
              <div className="row">
                <span className="k">WhatsApp</span>
                {wa ? (
                  <a className="badge b-wa" href={wa} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={11} />Abrir chat</a>
                ) : (
                  <span className="badge b-neutral">Solo email</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "actividad" && (
        <div className="stack">
          <div className="card2">
            <h4 style={{ marginBottom: 16 }}>Línea de tiempo</h4>
            <div className="tl">
              <div className="tli">
                <span className="dot pos" />
                <div className="r">Análisis de IA completado</div>
                <div className="pe mono">{added}</div>
              </div>
              <div className="tli">
                <span className="dot" />
                <div className="r">Cargado al sistema</div>
                <div className="pe mono">{added}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const sideBody = isFull ? (
    <div className="pb-side">
      <div className="card2">
        <h4 style={{ marginBottom: 14 }}>Contacto</h4>
        <div className="kv">
          <div className="row"><span className="k">Correo</span><b className="mono" style={{ fontSize: 12 }}>{c.email || DASH}</b></div>
          <div className="row"><span className="k">Teléfono</span><b className="mono" style={{ fontSize: 12 }}>{c.telefono || DASH}</b></div>
          <div className="row"><span className="k">País</span><b>{c.pais_residencia || DASH}</b></div>
        </div>
      </div>
      <div className="card2">
        <h4 style={{ marginBottom: 12 }}>Nivel de inglés</h4>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
          <span className="mono" style={{ fontSize: 26, fontWeight: 700, color: c.nivel_ingles ? "var(--eng)" : "var(--faint)" }}>
            {c.nivel_ingles ?? DASH}
          </span>
          <span style={{ fontSize: 12, color: "var(--faint)" }}>
            {c.nivel_ingles
              ? c.nivel_ingles_confianza != null
                ? `· ${c.nivel_ingles_confianza}% conf.`
                : ""
              : "· sin evaluar"}
          </span>
        </div>
        <CefrMeter level={c.nivel_ingles} />
      </div>
    </div>
  ) : null;

  const panel = (
    <div className={`panel mode-${mode}`}>
      {head}
      <div className="panel-body">
        <div className={isFull ? "full-grid" : ""}>
          {mainBody}
          {sideBody}
        </div>
      </div>
    </div>
  );

  if (mode === "drawer") {
    return (
      <>
        <div className="scrim" onClick={onClose} />
        <div className="drawer" role="dialog" aria-modal>{panel}</div>
      </>
    );
  }

  if (mode === "full") {
    return (
      <div className="fullpage" role="dialog" aria-modal>
        <div className="fullpage-bar">
          <button className="crumb" onClick={onClose}>
            <Icon name="arrowLeft" size={14} /> Volver
          </button>
        </div>
        <div className="fullpage-body">{panel}</div>
      </div>
    );
  }

  // split
  return <aside className="detail-side">{panel}</aside>;
}
