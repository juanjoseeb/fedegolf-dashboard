import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import RoundTable from "./components/RoundTable.jsx";
import ScoreCard from "./components/ScoreCard.jsx";

const GOLD = "#d4af37";
const BORDER = "#1a3a1a";
const BG_CARD = "#0d1f0d";
const TEXT_MUTED = "#4a6a4a";
const TEXT_SEC = "#8aaa8a";

function parseScore(s) {
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="stat-card">
      <span className="icon">{icon}</span>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
      <div style={{ color: TEXT_SEC, marginBottom: 4 }}>{label}</div>
      <div style={{ color: TEXT_MUTED, fontSize: 11, marginBottom: 2 }}>GROSS SCORE</div>
      <div style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: GOLD }}>
        {payload[0].value}
      </div>
    </div>
  );
};

export default function Dashboard({ data }) {
  const [selectedRound, setSelectedRound] = useState(null);
  const { rounds = [] } = data;

  const fullRounds = rounds.filter((r) => (r.holes_played ?? 18) === 18);
  const scores = fullRounds.map((r) => parseScore(r.score)).filter((s) => s !== null);
  const avgScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : "—";
  const bestScore = scores.length ? Math.min(...scores) : "—";

  const diffs = fullRounds.map((r) => parseFloat(r.differential)).filter((d) => !isNaN(d));
  const avgDiff = diffs.length ? (diffs.reduce((a, b) => a + b, 0) / diffs.length).toFixed(1) : "—";

  const chartData = [...fullRounds]
    .filter((r) => parseScore(r.score) !== null)
    .slice(0, 20)
    .reverse()
    .map((r) => ({ date: r.date, score: parseScore(r.score) }));

  function handleSelectRound(round) {
    setSelectedRound(selectedRound?.id === round.id ? null : round);
  }

  return (
    <div>
      <div className="stat-grid">
        <StatCard icon="🏌️" label="Rounds Played" value={rounds.length} sub="All formats" />
        <StatCard icon="⛳" label="Avg Score" value={avgScore} sub="18-hole rounds" />
        <StatCard icon="🏆" label="Best Round" value={bestScore} sub="Lowest gross" />
        <StatCard icon="📊" label="Avg Differential" value={avgDiff} sub="18-hole rounds" />
      </div>

      {chartData.length > 1 && (
        <>
          <p className="section-title">Score Trend</p>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={chartData} margin={{ top: 8, right: 48, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="goldLine" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={BORDER} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: TEXT_MUTED, fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fill: TEXT_MUTED, fontSize: 11 }} tickLine={false} axisLine={false} domain={["auto", "auto"]} />
                <Tooltip content={<ChartTooltip />} />
                {avgScore !== "—" && (
                  <ReferenceLine
                    y={parseFloat(avgScore)}
                    stroke="#e8f2e8"
                    strokeOpacity={0.5}
                    strokeDasharray="6 3"
                    label={{ value: `Avg ${avgScore}`, fill: "#e8f2e8", fillOpacity: 0.65, fontSize: 11, position: "right" }}
                  />
                )}
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke={GOLD}
                  strokeWidth={2.5}
                  dot={{ fill: GOLD, r: 3.5, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: GOLD, stroke: "#e8f2e822", strokeWidth: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      <p className="section-title">Round History — click a row to see hole-by-hole scorecard</p>
      <RoundTable rounds={rounds} selectedId={selectedRound?.id} onSelect={handleSelectRound} />

      {selectedRound && <ScoreCard round={selectedRound} />}
    </div>
  );
}
