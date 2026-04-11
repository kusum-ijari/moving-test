import http.server
import json
import os

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data.json')

class MovingTrackerHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/state':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            try:
                with open(DATA_FILE, 'r') as f:
                    data = f.read()
            except FileNotFoundError:
                data = '{}'
            self.wfile.write(data.encode())
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/state':
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length)
            try:
                # Validate it's valid JSON before saving
                json.loads(body)
                with open(DATA_FILE, 'w') as f:
                    f.write(body.decode())
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"ok":true}')
            except (json.JSONDecodeError, Exception) as e:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        # Only log API calls, not static file requests
        if '/api/' in (args[0] if args else ''):
            super().log_message(format, *args)

if __name__ == '__main__':
    port = 3456
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = http.server.HTTPServer(('', port), MovingTrackerHandler)
    print(f'Moving Tracker server running on http://localhost:{port}')
    server.serve_forever()
