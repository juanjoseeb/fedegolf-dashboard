import { useState } from "react";
import Dashboard from "./Dashboard.jsx";
import Analytics from "./Analytics.jsx";

export default function App() {
  const [code, setCode] = useState("");
  const [sfId, setSfId] = useState("");
  const [showFallback, setShowFallback] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setData(null);
    setActiveTab("dashboard");
    setLoading(true);

    const param = showFallback && sfId.trim()
      ? `sf_id=${encodeURIComponent(sfId.trim())}`
      : `code=${encodeURIComponent(code.trim())}`;

    try {
      const res = await fetch(`/api/scrape?${param}`);
      const json = await res.json();
      if (json.error) setError(json.error);
      else setData(json);
    } catch {
      setError("Network error — make sure the API server is running.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <div className="header">
        <span className="header-icon">⛳</span>
        <div className="header-text">
          <h1>Fedegolf Dashboard</h1>
          <span className="header-sub">Federación Colombiana de Golf</span>
        </div>
        <span className="header-badge">FCG</span>
      </div>

      <form className="search-form" onSubmit={handleSubmit}>
        {showFallback ? (
          <input
            type="text"
            placeholder="Enter Salesforce User ID (e.g. 0035x00003Q302wAAB)"
            value={sfId}
            onChange={(e) => setSfId(e.target.value)}
            required
          />
        ) : (
          <input
            type="text"
            placeholder="Enter your Fedegolf código (e.g. 31888)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        )}
        <button type="submit" disabled={loading}>
          {loading ? "Loading…" : "Search"}
        </button>
      </form>

      <button
        className="fallback-toggle"
        type="button"
        onClick={() => { setShowFallback(!showFallback); setError(null); }}
      >
        {showFallback ? "← Use Fedegolf código instead" : "Having trouble? Enter Salesforce ID directly"}
      </button>

      {loading && (
        <div className="spinner-wrap">
          <div className="spinner" />
          <span>Fetching your golf data…</span>
        </div>
      )}

      {error && <div className="error-box">{error}</div>}

      {data && (
        <>
          <div className="tab-bar">
            <button
              className={`tab${activeTab === "dashboard" ? " tab--active" : ""}`}
              onClick={() => setActiveTab("dashboard")}
            >
              Dashboard
            </button>
            <button
              className={`tab${activeTab === "analytics" ? " tab--active" : ""}`}
              onClick={() => setActiveTab("analytics")}
            >
              Analytics
            </button>
          </div>

          {activeTab === "dashboard" && <Dashboard data={data} />}
          {activeTab === "analytics" && <Analytics sfId={data.salesforce_id} />}
        </>
      )}

      <footer className="app-footer">
        By: Juan José Escobar
      </footer>
    </div>
  );
}
