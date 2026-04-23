import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine, ResponsiveContainer,
  LineChart, Line, Dot,
} from "recharts";

const COLOR = {
  eagle: "#3498db",
  birdie: "#9b59b6",
  par: "#2ecc71",
  bogey: "#f39c12",
  double: "#e74c3c",
  worse: "#c0392b",
};

function holeColor(strokes, par) {
  const diff = strokes - par;
  if (diff <= -2) return COLOR.eagle;
  if (diff === -1) return COLOR.birdie;
  if (diff === 0) return COLOR.par;
  if (diff === 1) return COLOR.bogey;
  if (diff === 2) return COLOR.double;
  return COLOR.worse;
}

function holeLabel(strokes, par) {
  const diff = strokes - par;
  if (diff <= -2) return "Eagle";
  if (diff === -1) return "Birdie";
  if (diff === 0) return "Par";
  if (diff === 1) return "Bogey";
  if (diff === 2) return "Double";
  return `+${diff}`;
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: "#0d1f0d", border: "1px solid #1a3a1a", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
      <div style={{ color: "#8aaa8a", fontSize: 11, marginBottom: 4 }}>HOLE {d.hole} · PAR {d.par}</div>
      <div style={{ fontFamily: "Georgia, serif", fontSize: 22, fontWeight: 700, color: holeColor(d.strokes, d.par), lineHeight: 1 }}>
        {d.strokes}
      </div>
      <div style={{ color: holeColor(d.strokes, d.par), fontWeight: 700, marginTop: 4, fontSize: 12 }}>
        {holeLabel(d.strokes, d.par)}
      </div>
    </div>
  );
};

const CumulativeTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const sign = d.cumDiff > 0 ? "+" : "";
  return (
    <div style={{ background: "#0d1f0d", border: "1px solid #1a3a1a", borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
      <div style={{ color: "#8aaa8a", fontSize: 11, marginBottom: 4 }}>THROUGH HOLE {d.hole}</div>
      <div style={{ fontFamily: "Georgia, serif", fontSize: 20, fontWeight: 700, color: d.cumDiff <= 0 ? "#2ecc71" : "#e74c3c" }}>
        {sign}{d.cumDiff}
      </div>
      <div style={{ color: "#8aaa8a", fontSize: 11, marginTop: 2 }}>{d.cumStrokes} strokes · {d.cumPar} par</div>
    </div>
  );
};

export default function HoleChart({ holes }) {
  const data = holes
    .filter((h) => h.hole && !isNaN(parseInt(h.strokes)) && !isNaN(parseInt(h.par)))
    .map((h) => ({
      hole: parseInt(h.hole),
      par: parseInt(h.par),
      strokes: parseInt(h.strokes),
    }))
    .sort((a, b) => a.hole - b.hole);

  if (!data.length) return <p style={{ color: "#5a7a96" }}>No hole data available.</p>;

  let cumStrokes = 0, cumPar = 0;
  const cumulativeData = data.map((h) => {
    cumStrokes += h.strokes;
    cumPar += h.par;
    return { hole: h.hole, cumStrokes, cumPar, cumDiff: cumStrokes - cumPar };
  });

  return (
    <>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a3a1a" vertical={false} />
          <XAxis dataKey="hole" tick={{ fill: "#4a6a4a", fontSize: 11 }} tickLine={false} axisLine={false} label={{ value: "Hole", position: "insideBottom", offset: -2, fill: "#4a6a4a", fontSize: 11 }} />
          <YAxis tick={{ fill: "#4a6a4a", fontSize: 11 }} tickLine={false} axisLine={false} domain={[0, "auto"]} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <ReferenceLine y={0} stroke="#1a3a1a" />
          <Bar dataKey="strokes" radius={[3, 3, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={holeColor(entry.strokes, entry.par)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div className="hole-legend">
        {[
          ["Eagle / Albatross", COLOR.eagle],
          ["Birdie", COLOR.birdie],
          ["Par", COLOR.par],
          ["Bogey", COLOR.bogey],
          ["Double Bogey", COLOR.double],
          ["Triple+", COLOR.worse],
        ].map(([label, color]) => (
          <span key={label}>
            <span className="dot" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>

      <p style={{ fontSize: "0.72rem", color: "#4a6a4a", marginTop: 28, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Cumulative score vs par
      </p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={cumulativeData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a3a1a" vertical={false} />
          <XAxis dataKey="hole" tick={{ fill: "#4a6a4a", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "#4a6a4a", fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip content={<CumulativeTooltip />} cursor={{ stroke: "#1a3a1a" }} />
          <ReferenceLine y={0} stroke="#4a6a4a" strokeDasharray="4 4" label={{ value: "Even", position: "right", fill: "#4a6a4a", fontSize: 10 }} />
          <Line
            type="monotone"
            dataKey="cumDiff"
            stroke="#d4af37"
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, payload } = props;
              return <Dot key={payload.hole} cx={cx} cy={cy} r={3} fill={payload.cumDiff <= 0 ? "#2ecc71" : "#e74c3c"} stroke="none" />;
            }}
            activeDot={{ r: 5, fill: "#d4af37", stroke: "none" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}
