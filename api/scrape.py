import json
import re
import sys
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

import requests
from bs4 import BeautifulSoup

SERVICIOS_BASE = "https://servicios.federacioncolombianadegolf.com"
AJAX_URL = "https://federacioncolombianadegolf.com/wp-admin/admin-ajax.php"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}


def get_player_info(codigo: str) -> dict:
    """Returns Salesforce ID plus player profile scraped from the AJAX response."""
    session = requests.Session()
    session.headers.update(HEADERS)
    session.get("https://federacioncolombianadegolf.com/handicap/", timeout=15)

    payload = {
        "action": "envio_salesforce",
        "type": "field_value",
        "tipo_busqueda": "cod",
        "termino_busqueda": codigo,
    }
    resp = session.post(AJAX_URL, data=payload, timeout=15)
    resp.raise_for_status()

    try:
        body = resp.json()
    except ValueError:
        raise ValueError(f"Unexpected response from federation site: {resp.text[:200]}")

    if not body.get("success"):
        raise ValueError(
            f"Federation site returned an error for código {codigo}. "
            "Check that the código is correct."
        )

    results = body.get("data", {}).get("BusquedaResult", [])
    if not results:
        raise ValueError(f"No player found for código {codigo}.")

    persona = results[0].get("Persona")
    if not persona or not persona.get("Id"):
        raise ValueError(f"Player data missing Salesforce ID for código {codigo}.")

    first = persona.get("FirstName", "")
    last = persona.get("LastName", "")
    return {
        "salesforce_id": persona["Id"],
        "name": f"{first} {last}".strip(),
        "club": persona.get("FCG_Club_Federado__c", ""),
        "handicap_index": persona.get("Indice__c"),
        "category": persona.get("Categoria__c", ""),
        "codigo": persona.get("CodigoJugador__c", codigo),
    }


def get_rounds(salesforce_id: str) -> list:
    url = f"{SERVICIOS_BASE}/apex/HistorialJuegoResultadoPp?user={salesforce_id}"
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")

    tables = soup.find_all("table")
    target = None
    for t in tables:
        first_tr = t.find("tr")
        if not first_tr:
            continue
        header_cells = [c.get_text(strip=True) for c in first_tr.find_all(["th", "td"])]
        if "FECHAS DE JUEGO" in header_cells:
            target = t
            break

    if not target:
        return []

    rounds = []
    for row in target.find_all("tr")[1:]:
        cols = [td.get_text(strip=True) for td in row.find_all("td")]
        if len(cols) < 8:
            continue

        round_id = None
        link = row.find("a", href=re.compile(r"TarjetaJuegoWebPp"))
        if link:
            id_match = re.search(r"id=([A-Za-z0-9]+)", link.get("href", ""))
            if id_match:
                round_id = id_match.group(1)

        # cols: [link_cell, date, club, course, marca, patterns, gross/adjusted, differential, marker]
        gross_raw = cols[6] if len(cols) > 6 else ""
        parts = gross_raw.split("/")
        gross = parts[0].strip() if parts else gross_raw
        holes_played = int(parts[1].strip()) if len(parts) > 1 and parts[1].strip().isdigit() else 18

        rounds.append({
            "id": round_id,
            "date": cols[1] if len(cols) > 1 else "",
            "club": cols[2] if len(cols) > 2 else "",
            "course": cols[3] if len(cols) > 3 else "",
            "marca": cols[4] if len(cols) > 4 else "",
            "score": gross,
            "score_raw": gross_raw,
            "holes_played": holes_played,
            "differential": cols[7] if len(cols) > 7 else "",
        })

    return rounds


def get_scorecard(round_id: str) -> dict:
    url = f"{SERVICIOS_BASE}/apex/TarjetaJuegoWebPp?id={round_id}"
    resp = requests.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")

    scorecard_table = None
    for t in soup.find_all("table"):
        first_row = t.find("tr")
        if first_row:
            first_cell = first_row.find(["th", "td"])
            if first_cell and first_cell.get_text(strip=True).upper() == "HOYO":
                scorecard_table = t
                break

    if not scorecard_table:
        return {"holes": []}

    rows = scorecard_table.find_all("tr")
    if len(rows) < 4:
        return {"holes": []}

    def row_vals(row_idx):
        return [td.get_text(strip=True) for td in rows[row_idx].find_all(["th", "td"])]

    hoyo_row = row_vals(0)
    par_row = row_vals(1)
    score_row = row_vals(3)

    holes = []
    for col_idx, label in enumerate(hoyo_row):
        if label in ("HOYO", "OUT", "IN", "TOTAL", ""):
            continue
        try:
            hole_num = int(label)
        except ValueError:
            continue
        holes.append({
            "hole": hole_num,
            "par": par_row[col_idx] if col_idx < len(par_row) else "",
            "strokes": score_row[col_idx] if col_idx < len(score_row) else "",
        })

    holes.sort(key=lambda h: h["hole"])
    return {"holes": holes}


def _fetch_scorecard_safe(r):
    """Parallel-safe scorecard fetcher; returns (round_id, scorecard | None)."""
    rid = r.get("id")
    if not rid or r.get("holes_played", 18) != 18:
        return rid, None
    try:
        return rid, get_scorecard(rid)
    except Exception:
        return rid, None


def compute_analytics(rounds, scorecards_by_id):
    full_rounds = [r for r in rounds if r.get("holes_played", 18) == 18]

    # --- Course stats ---
    course_scores = defaultdict(list)
    for r in full_rounds:
        try:
            course_scores[r["course"]].append(int(r["score"]))
        except (ValueError, TypeError):
            pass

    course_stats = sorted(
        [
            {
                "course": c,
                "avg": round(sum(v) / len(v), 1),
                "best": min(v),
                "worst": max(v),
                "rounds": len(v),
            }
            for c, v in course_scores.items()
        ],
        key=lambda x: x["avg"],
    )

    # --- Course + Marca stats ---
    cm_scores = defaultdict(list)
    for r in full_rounds:
        try:
            cm_scores[(r["course"], r.get("marca", ""))].append(int(r["score"]))
        except (ValueError, TypeError):
            pass

    course_marca_stats = sorted(
        [
            {
                "course": k[0],
                "marca": k[1],
                "avg": round(sum(v) / len(v), 1),
                "best": min(v),
                "worst": max(v),
                "rounds": len(v),
            }
            for k, v in cm_scores.items()
        ],
        key=lambda x: (x["course"], x["avg"]),
    )

    # --- Par-type & hole stats from scorecards, grouped by course ---
    par_type_strokes = defaultdict(list)
    # hole_data_by_course[course][hole_num] = [strokes, ...]
    hole_data_by_course = defaultdict(lambda: defaultdict(list))
    hole_par_by_course = defaultdict(dict)

    for r in full_rounds:
        sc = scorecards_by_id.get(r.get("id"))
        if not sc:
            continue
        course = r.get("course", "Unknown")
        for h in sc.get("holes", []):
            try:
                hole_num = int(h["hole"])
                par = int(h["par"])
                strokes = int(h["strokes"])
                par_type_strokes[par].append(strokes)
                hole_data_by_course[course][hole_num].append(strokes)
                hole_par_by_course[course][hole_num] = par
            except (ValueError, TypeError):
                pass

    par_stats = {
        str(par): {
            "avg": round(sum(v) / len(v), 2),
            "vs_par": round(sum(v) / len(v) - par, 2),
            "count": len(v),
        }
        for par, v in par_type_strokes.items()
    }

    def build_hole_stats(hole_data, hole_par):
        return sorted(
            [
                {
                    "hole": hn,
                    "par": hole_par.get(hn, 4),
                    "avg": round(sum(v) / len(v), 2),
                    "best": min(v),
                    "worst": max(v),
                    "vs_par": round(sum(v) / len(v) - hole_par.get(hn, 4), 2),
                    "rounds": len(v),
                }
                for hn, v in hole_data.items()
            ],
            key=lambda x: x["hole"],
        )

    hole_stats_by_course = {
        course: build_hole_stats(hole_data_by_course[course], hole_par_by_course[course])
        for course in hole_data_by_course
    }

    # Sort courses by number of rounds played (most-played first)
    courses_sorted = sorted(
        hole_stats_by_course.keys(),
        key=lambda c: -sum(len(v) for v in hole_data_by_course[c].values()),
    )

    return {
        "course_stats": course_stats,
        "course_marca_stats": course_marca_stats,
        "par_stats": par_stats,
        "hole_stats_by_course": {c: hole_stats_by_course[c] for c in courses_sorted},
        "courses_sorted": courses_sorted,
    }


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)

        code = params.get("code", [None])[0]
        sf_id_param = params.get("sf_id", [None])[0]
        round_id = params.get("round_id", [None])[0]
        full = params.get("full", [None])[0] == "1"

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self._send_cors_headers()
        self.end_headers()

        try:
            if round_id:
                self._write(get_scorecard(round_id))
                return

            player = None
            if sf_id_param:
                salesforce_id = sf_id_param
            elif code:
                player = get_player_info(code)
                salesforce_id = player["salesforce_id"]
            else:
                self._write({"error": "Missing ?code= or ?sf_id= parameter"})
                return

            rounds = get_rounds(salesforce_id)

            if full:
                scorecards = {}
                with ThreadPoolExecutor(max_workers=5) as executor:
                    futures = [executor.submit(_fetch_scorecard_safe, r) for r in rounds]
                    for future in as_completed(futures):
                        rid, sc = future.result()
                        if rid and sc:
                            scorecards[rid] = sc

                analytics = compute_analytics(rounds, scorecards)
                self._write({"salesforce_id": salesforce_id, "player": player, "rounds": rounds, "analytics": analytics})
            else:
                self._write({"salesforce_id": salesforce_id, "player": player, "rounds": rounds})

        except requests.Timeout:
            self._write({"error": "Request timed out. The federation site may be slow."})
        except requests.HTTPError as e:
            self._write({"error": f"HTTP error fetching data: {e}"})
        except ValueError as e:
            self._write({"error": str(e)})
        except Exception as e:
            self._write({"error": f"Unexpected error: {e}"})

    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _write(self, data):
        self.wfile.write(json.dumps(data).encode())


if __name__ == "__main__":
    test_code = sys.argv[1] if len(sys.argv) > 1 else "31888"
    print(f"Resolving player info for código: {test_code}")
    try:
        player = get_player_info(test_code)
        sf_id = player["salesforce_id"]
        print(f"Player: {player}")
        rounds = get_rounds(sf_id)
        print(f"Found {len(rounds)} rounds")
        for r in rounds[:2]:
            print(f"  {r}")

        print("\nFetching all scorecards for analytics...")
        scorecards = {}
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(_fetch_scorecard_safe, r) for r in rounds]
            for future in as_completed(futures):
                rid, sc = future.result()
                if rid and sc:
                    scorecards[rid] = sc
        print(f"Fetched {len(scorecards)} scorecards")

        analytics = compute_analytics(rounds, scorecards)
        print("Course stats:", analytics["course_stats"])
        print("Par stats:", analytics["par_stats"])
        print("Hole stats (first 3):", analytics["hole_stats"][:3])
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback; traceback.print_exc()
