import { useState } from "react";

const COLS = [
  { key: "date", label: "Date" },
  { key: "course", label: "Course" },
  { key: "score", label: "Score" },
  { key: "differential", label: "Differential" },
];

export default function RoundTable({ rounds, selectedId, onSelect }) {
  const [sortKey, setSortKey] = useState("date");
  const [sortAsc, setSortAsc] = useState(false);

  function handleSort(key) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  }

  function parseDate(str) {
    // Expect DD/MM/YYYY or DD/MM/YY
    if (!str) return 0;
    const parts = str.split("/");
    if (parts.length !== 3) return 0;
    const [d, m, y] = parts;
    const year = y.length === 2 ? 2000 + parseInt(y) : parseInt(y);
    return new Date(year, parseInt(m) - 1, parseInt(d)).getTime();
  }

  const sorted = [...rounds].sort((a, b) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    let cmp;
    if (sortKey === "date") {
      cmp = parseDate(av) - parseDate(bv);
    } else {
      const numA = parseFloat(av);
      const numB = parseFloat(bv);
      cmp = !isNaN(numA) && !isNaN(numB) ? numA - numB : av.localeCompare(bv);
    }
    return sortAsc ? cmp : -cmp;
  });

  return (
    <div className="round-table-wrap">
      <table className="round-table">
        <thead>
          <tr>
            {COLS.map((c) => (
              <th key={c.key} onClick={() => handleSort(c.key)}>
                {c.label} {sortKey === c.key ? (sortAsc ? "▲" : "▼") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr
              key={r.id || i}
              className={r.id === selectedId ? "selected" : ""}
              onClick={() => onSelect(r)}
            >
              <td>{r.date}</td>
              <td>{r.course}</td>
              <td>
                <span className="badge-score">{r.score}</span>
                {(r.holes_played ?? 18) !== 18 && (
                  <span style={{ marginLeft: 6, fontSize: "0.7rem", color: "#f39c12", fontWeight: 700 }}>
                    {r.holes_played}H
                  </span>
                )}
              </td>
              <td>{r.differential}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
