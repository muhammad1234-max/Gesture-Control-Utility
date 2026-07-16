import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Health endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Gesture Control Command Center Daemon' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Setup WebSocket Server for IPC
  const wss = new WebSocketServer({ server, path: '/api/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected to IPC bridge.');
    
    // Send initial status
    ws.send(JSON.stringify({ type: 'info', message: 'IPC Connected. Daemon listening for gestures.' }));

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        console.log('Received IPC message:', data);

        if (data.action === 'simulate_gesture') {
          const { trigger, targetAction, name } = data.payload;
          // In a real Windows environment, this is where we would call native C++ bindings
          // e.g. using `child_process` or native Addon to dispatch global keystrokes.
          ws.send(JSON.stringify({ 
            type: 'info', 
            message: `Daemon routing [${trigger}] -> Executing native call: ${targetAction}` 
          }));

          // Simulate latency of processing the system call
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'success',
              message: `System hook confirmed: '${name}' successfully fired.`
            }));
          }, 400);
        } else if (data.action === 'engine_status') {
          const status = data.payload.active ? 'enabled' : 'disabled';
          ws.send(JSON.stringify({
            type: data.payload.active ? 'success' : 'warning',
            message: `Skeletal Tracking Service ${status} via IPC.`
          }));
        }

      } catch (err) {
        console.error('Failed to parse IPC message:', err);
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected from IPC bridge.');
    });
  });
}

startServer();
