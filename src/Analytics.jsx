import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";

const GOLD = "#d4af37";
const BORDER = "#1a3a1a";
const BG_CARD = "#0d1f0d";
const TEXT_SEC = "#8aaa8a";
const TEXT_MUTED = "#4a6a4a";

function vsParColor(vp) {
  if (vp <= -0.5) return "#3498db";
  if (vp <= 0.1)  return "#2ecc71";
  if (vp <= 1.1)  return "#f39c12";
  if (vp <= 2.1)  return "#e74c3c";
  return "#c0392b";
}

function SectionTitle({ children }) {
  return <p className="section-title" style={{ marginTop: 32 }}>{children}</p>;
}

function StatMini({ label, value, sub, color }) {
  return (
    <div className="stat-card" style={{ minWidth: 130 }}>
      <div className="label">{label}</div>
      <div className="value" style={{ fontSize: "1.6rem", color: color || "#e8f2e8" }}>{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

// ─── Course × Marca table ────────────────────────────────────────────────────
function CourseMarcaTable({ rows }) {
  if (!rows.length) return null;
  return (
    <div className="round-table-wrap">
      <table className="round-table">
        <thead>
          <tr>
            <th>Course</th>
            <th>Marca</th>
            <th>Rounds</th>
            <th>Avg</th>
            <th>Best</th>
            <th>Worst</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ cursor: "default" }}>
              <td>{r.course}</td>
              <td style={{ color: TEXT_SEC }}>{r.marca}</td>
              <td style={{ color: TEXT_MUTED }}>{r.rounds}</td>
              <td><span className="badge-score">{r.avg}</span></td>
              <td style={{ color: "#2ecc71" }}>{r.best}</td>
              <td style={{ color: "#e74c3c" }}>{r.worst}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Par-type section ────────────────────────────────────────────────────────
function ParTypeSection({ parStats }) {
  const bars = [3, 4, 5].map((par) => {
    const s = parStats[String(par)];
    if (!s) return null;
    return { par, avg: s.avg, vs_par: s.vs_par, count: s.count };
  }).filter(Boolean);

  return (
    <>
      <div className="stat-grid">
        {bars.map(({ par, avg, vs_par, count }) => (
          <StatMini
            key={par}
            label={`Par ${par} avg`}
            value={avg.toFixed(2)}
            sub={`${vs_par > 0 ? "+" : ""}${vs_par.toFixed(2)} vs par · ${count} holes`}
            color={vsParColor(vs_par)}
          />
        ))}
      </div>
      <div className="chart-wrap" style={{ marginTop: 16 }}>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={bars} margin={{ top: 8, right: 16, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
            <XAxis dataKey="par" tickFormatter={(v) => `Par ${v}`} tick={{ fill: TEXT_MUTED, fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: TEXT_MUTED, fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, "auto"]} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.03)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
                    <div style={{ color: TEXT_MUTED, fontSize: 11 }}>PAR {d.par}</div>
                    <div style={{ fontFamily: "Georgia, serif", fontSize: 20, color: vsParColor(d.vs_par), fontWeight: 700 }}>{d.avg}</div>
                    <div style={{ color: TEXT_SEC, fontSize: 11 }}>{d.vs_par > 0 ? "+" : ""}{d.vs_par.toFixed(2)} vs par</div>
                  </div>
                );
              }}
            />
            <Bar dataKey="avg" name="Avg strokes" radius={[4, 4, 0, 0]}>
              {bars.map((b, i) => <Cell key={i} fill={vsParColor(b.vs_par)} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

// ─── Hole analysis section ────────────────────────────────────────────────────
function HoleAnalysisSection({ holeStatsByCourse, coursesSorted }) {
  const [activeCourse, setActiveCourse] = useState(coursesSorted[0] ?? null);
  const [selectedHole, setSelectedHole] = useState(null);

  const holeStats = activeCourse ? (holeStatsByCourse[activeCourse] ?? []) : [];
  const selected = selectedHole !== null ? holeStats.find((h) => h.hole === selectedHole) : null;

  function chooseCourse(c) {
    setActiveCourse(c);
    setSelectedHole(null);
  }

  return (
    <>
      {/* Course filter */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
        {coursesSorted.map((c) => {
          const active = c === activeCourse;
          return (
            <button
              key={c}
              onClick={() => chooseCourse(c)}
              style={{
                padding: "7px 16px",
                borderRadius: 999,
                border: `1px solid ${active ? GOLD : BORDER}`,
                background: active ? GOLD + "22" : "transparent",
                color: active ? GOLD : TEXT_SEC,
                fontSize: "0.82rem",
                fontWeight: active ? 700 : 400,
                cursor: "pointer",
                letterSpacing: "0.03em",
                transition: "all 0.15s",
              }}
            >
              {c}
            </button>
          );
        })}
      </div>

      {holeStats.length === 0 && (
        <p style={{ color: TEXT_MUTED, padding: "20px 0" }}>No scorecard data for this course.</p>
      )}

      {holeStats.length > 0 && (
        <>
          {/* Overview bar chart: vs_par per hole */}
          <div className="chart-wrap">
            <p style={{ fontSize: "0.72rem", color: TEXT_MUTED, marginBottom: 12, paddingLeft: 8, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Strokes vs par per hole — click a bar to inspect
            </p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={holeStats.map((h) => ({ ...h, label: `H${h.hole}` }))}
                margin={{ top: 4, right: 8, left: -24, bottom: 0 }}
                onClick={(e) => e?.activePayload && setSelectedHole(e.activePayload[0].payload.hole)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: TEXT_MUTED, fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: TEXT_MUTED, fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)", cursor: "pointer" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
                        <div style={{ color: TEXT_MUTED, fontSize: 11 }}>HOLE {d.hole} · PAR {d.par}</div>
                        <div style={{ fontFamily: "Georgia, serif", fontSize: 18, color: vsParColor(d.vs_par), fontWeight: 700, margin: "4px 0" }}>{d.avg}</div>
                        <div style={{ color: TEXT_SEC, fontSize: 11 }}>
                          {d.vs_par > 0 ? "+" : ""}{d.vs_par} vs par &nbsp;·&nbsp; Best <span style={{ color: "#2ecc71" }}>{d.best}</span> · Worst <span style={{ color: "#e74c3c" }}>{d.worst}</span>
                        </div>
                        <div style={{ color: TEXT_MUTED, fontSize: 10, marginTop: 4 }}>Click to inspect</div>
                      </div>
                    );
                  }}
                />
                <ReferenceLine y={0} stroke={TEXT_MUTED} strokeDasharray="4 4" strokeOpacity={0.5} />
                <Bar dataKey="vs_par" radius={[3, 3, 0, 0]} style={{ cursor: "pointer" }}>
                  {holeStats.map((d, i) => (
                    <Cell
                      key={i}
                      fill={vsParColor(d.vs_par)}
                      opacity={selectedHole === null || selectedHole === d.hole ? 1 : 0.3}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Hole pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {holeStats.map((h) => {
              const active = selectedHole === h.hole;
              return (
                <button
                  key={h.hole}
                  onClick={() => setSelectedHole(active ? null : h.hole)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 999,
                    border: `1px solid ${active ? vsParColor(h.vs_par) : BORDER}`,
                    background: active ? vsParColor(h.vs_par) + "22" : "transparent",
                    color: active ? vsParColor(h.vs_par) : TEXT_SEC,
                    fontSize: "0.8rem",
                    fontWeight: active ? 700 : 400,
                    cursor: "pointer",
                  }}
                >
                  H{h.hole}
                </button>
              );
            })}
            {selectedHole && (
              <button
                onClick={() => setSelectedHole(null)}
                style={{ padding: "5px 12px", borderRadius: 999, border: `1px solid ${BORDER}`, background: "transparent", color: TEXT_MUTED, fontSize: "0.8rem", cursor: "pointer" }}
              >
                Clear ✕
              </button>
            )}
          </div>

          {/* Selected hole detail */}
          {selected && (
            <div className="scorecard-panel" style={{ marginBottom: 20 }}>
              <h3>
                {activeCourse} &nbsp;·&nbsp; Hole {selected.hole} &nbsp;·&nbsp; Par {selected.par} &nbsp;·&nbsp;
                <span style={{ color: vsParColor(selected.vs_par) }}>
                  {selected.vs_par > 0 ? "+" : ""}{selected.vs_par} vs par
                </span>
              </h3>
              <div className="stat-grid">
                <StatMini label="Avg strokes" value={selected.avg} color={vsParColor(selected.vs_par)} />
                <StatMini label="Best" value={selected.best} color="#2ecc71" />
                <StatMini label="Worst" value={selected.worst} color="#e74c3c" />
                <StatMini label="Rounds" value={selected.rounds} />
              </div>
            </div>
          )}

          {/* Full table */}
          <div className="round-table-wrap">
            <table className="round-table">
              <thead>
                <tr>
                  <th>Hole</th>
                  <th>Par</th>
                  <th>Avg</th>
                  <th>Best</th>
                  <th>Worst</th>
                  <th>vs Par</th>
                  <th>Rounds</th>
                </tr>
              </thead>
              <tbody>
                {holeStats.map((h) => (
                  <tr
                    key={h.hole}
                    onClick={() => setSelectedHole(selectedHole === h.hole ? null : h.hole)}
                    className={selectedHole === h.hole ? "selected" : ""}
                  >
                    <td><strong>H{h.hole}</strong></td>
                    <td>{h.par}</td>
                    <td>{h.avg}</td>
                    <td style={{ color: "#2ecc71" }}>{h.best}</td>
                    <td style={{ color: "#e74c3c" }}>{h.worst}</td>
                    <td style={{ color: vsParColor(h.vs_par), fontWeight: 700 }}>
                      {h.vs_par > 0 ? "+" : ""}{h.vs_par}
                    </td>
                    <td style={{ color: TEXT_MUTED }}>{h.rounds}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

// ─── Main Analytics component ─────────────────────────────────────────────────
export default function Analytics({ sfId }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sfId) return;
    setLoading(true);
    fetch(`/api/scrape?sf_id=${encodeURIComponent(sfId)}&full=1`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setAnalytics(json.analytics);
      })
      .catch(() => setError("Network error loading analytics."))
      .finally(() => setLoading(false));
  }, [sfId]);

  if (loading) return (
    <div className="spinner-wrap">
      <div className="spinner" />
      <span>Fetching all scorecards &amp; computing analytics…</span>
    </div>
  );
  if (error) return <div className="error-box">{error}</div>;
  if (!analytics) return null;

  const {
    course_marca_stats = [],
    par_stats = {},
    hole_stats_by_course = {},
    courses_sorted = [],
  } = analytics;

  return (
    <div>
      <SectionTitle>By Course &amp; Marca</SectionTitle>
      <CourseMarcaTable rows={course_marca_stats} />

      <SectionTitle>Par Type Performance</SectionTitle>
      <ParTypeSection parStats={par_stats} />

      <SectionTitle>Hole-by-Hole Analysis</SectionTitle>
      <HoleAnalysisSection
        holeStatsByCourse={hole_stats_by_course}
        coursesSorted={courses_sorted}
      />
    </div>
  );
}
