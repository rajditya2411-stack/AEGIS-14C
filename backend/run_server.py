import asyncio
import sys
from uvicorn import Config, Server
from app.main import app

async def run_server():
    config = Config(app=app, host="127.0.0.1", port=8000, log_level="info")
    server = Server(config=config)
    sock = config.bind_socket()
    await server.serve(sockets=[sock])

if __name__ == "__main__":
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(run_server())
