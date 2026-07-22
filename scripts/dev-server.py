#!/usr/bin/env python3
"""Static file server for local dev that disables caching entirely.

Plain `python3 -m http.server` sends no Cache-Control header, so browsers
apply heuristic caching and can silently keep serving a stale module (game.js,
strings.js, etc.) after an edit — confusing during iterative development.
This is dev-only tooling; it is never deployed (Cloudflare Pages serves the
static files directly, not this script).
"""
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8787
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # project root, not the caller's cwd


class NoCacheHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


if __name__ == "__main__":
    ThreadingHTTPServer(("", PORT), NoCacheHandler).serve_forever()
