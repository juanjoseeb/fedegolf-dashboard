"""Local dev server — run with: python3 api/local_server.py"""
from http.server import HTTPServer
from scrape import handler

if __name__ == "__main__":
    port = 3001
    print(f"Local API server running at http://localhost:{port}/api/scrape")
    HTTPServer(("", port), handler).serve_forever()
