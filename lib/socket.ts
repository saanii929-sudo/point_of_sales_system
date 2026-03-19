import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export function initSocket(server: HTTPServer) {
  if (io) return io;

  io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('join-tenant', (tenantId: string) => {
      socket.join(`tenant-${tenantId}`);
      console.log(`Socket ${socket.id} joined tenant-${tenantId}`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function emitToTenant(tenantId: string, event: string, data: any) {
  if (io) {
    io.to(`tenant-${tenantId}`).emit(event, data);
  }
}
