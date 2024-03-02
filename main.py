from http.server import HTTPServer, SimpleHTTPRequestHandler


def run(port=80, addr="", handler_class=SimpleHTTPRequestHandler):
    server_address = (addr, port)
    server = HTTPServer(server_address, handler_class)
    url = f"http://localhost:{port}" if port != 80 else f"http://localhost"
    print(f"Starting http server on {url}...")
    server.serve_forever()


if __name__ == "__main__":
    run()
