"""Serves dist/ on :4173 with the headers from dist/_headers (so the CSP is enforced in tests)."""
import http.server, os, sys
ROOT = sys.argv[1] if len(sys.argv) > 1 else 'dist'
HEADERS = []
p = os.path.join(ROOT, '_headers')
if os.path.exists(p):
    for line in open(p):
        if line.startswith('  ') and ':' in line:
            k, v = line.strip().split(':', 1); HEADERS.append((k.strip(), v.strip()))
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def end_headers(self):
        for k, v in HEADERS: self.send_header(k, v)
        super().end_headers()
    def log_message(self, *a): pass
H.extensions_map['.js'] = 'text/javascript'
http.server.ThreadingHTTPServer(('127.0.0.1', 4173), H).serve_forever()
