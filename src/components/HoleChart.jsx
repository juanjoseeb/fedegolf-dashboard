import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine, ResponsiveContainer,
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
    </>
  );
}
