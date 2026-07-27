#!/usr/bin/env python3
import http.server
import socketserver
import os
import sys

PORT = 5173

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and Disable caching for development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

if __name__ == '__main__':
    web_dir = os.path.dirname(os.path.realpath(__file__))
    os.chdir(web_dir)

    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"\n==================================================")
        print(f"✨ Gemini Local UI - Servidor Web Activo")
        print(f"==================================================")
        print(f"🌐 URL local: http://localhost:{PORT}")
        print(f"🤖 Ollama API por defecto: http://localhost:11434")
        print(f"==================================================\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido.")
            sys.exit(0)
