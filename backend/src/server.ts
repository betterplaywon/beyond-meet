import http from 'http';
import { Server } from 'socket.io';
import createApp from './app';
import { authenticateSocket, setupMatchHandlers, startPeriodicMatching, stopPeriodicMatching } from './sockets/match-handler';

const PORT = process.env.PORT || 3000;

const app = createApp();
const server = http.createServer(app);

// Socket.io 설정
const io = new Server(server, {
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Socket.io 인증 미들웨어
io.use(authenticateSocket);

// Socket.io 연결 핸들러
io.on('connection', (socket) => {
  setupMatchHandlers(io, socket as any);
});

// 주기적 재매칭 시스템 시작
startPeriodicMatching(io);

server.listen(PORT, () => {
  console.log(`🚀 Beyond Meet API server running on port ${PORT}`);
  console.log(`🔌 Socket.io server ready`);
  console.log(`🔄 Periodic matching system started`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  stopPeriodicMatching();
  io.close(() => {
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  stopPeriodicMatching();
  io.close(() => {
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
});

export default server;
