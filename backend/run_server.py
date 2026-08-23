import socket
import sys

if sys.platform == 'win32':
    def safe_socketpair(family=socket.AF_INET, type=socket.SOCK_STREAM, proto=0):
        listener = socket.socket(family, type, proto)
        listener.bind(('127.0.0.1', 0))
        listener.listen(1)
        port = listener.getsockname()[1]
        client = socket.socket(family, type, proto)
        client.connect(('127.0.0.1', port))
        server, _ = listener.accept()
        listener.close()
        return (server, client)
    socket.socketpair = safe_socketpair

import asyncio
import uvicorn
from app.main import app

import os

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="127.0.0.1", port=port, log_level="info")
