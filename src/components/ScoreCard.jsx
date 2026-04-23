import { useState, useEffect } from "react";
import HoleChart from "./HoleChart.jsx";

export default function ScoreCard({ round }) {
  const [holes, setHoles] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!round?.id) return;
    setHoles(null);
    setError(null);
    setLoading(true);

    fetch(`/api/scrape?round_id=${encodeURIComponent(round.id)}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) setError(json.error);
        else setHoles(json.holes);
      })
      .catch(() => setError("Failed to load scorecard."))
      .finally(() => setLoading(false));
  }, [round?.id]);

  if (!round) return null;

  return (
    <div className="scorecard-panel">
      <h3>
        {round.course} &mdash; {round.date} &nbsp;
        <span style={{ color: "#2ecc71" }}>Score: {round.score}</span>
      </h3>

      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#5a7a96" }}>
          <div className="spinner" style={{ width: 22, height: 22, borderWidth: 2 }} />
          Loading scorecard…
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      {holes && <HoleChart holes={holes} />}

      {holes && holes.length === 0 && (
        <p style={{ color: "#5a7a96" }}>Hole-by-hole data not available for this round.</p>
      )}
    </div>
  );
}
