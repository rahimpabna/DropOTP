import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { redisSubscriber } from '../../db/redis';
import { prisma } from '../../db/prisma';
import { ENV } from '../../config/env';

export class WebSocketService {
  private static io: SocketIOServer | null = null;

  public static init(server: HttpServer): SocketIOServer {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.io.use(async (socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        const apiKey = socket.handshake.auth.apiKey || socket.handshake.query.apiKey;

        if (token) {
          const decoded = jwt.verify(token as string, ENV.JWT_SECRET) as { userId: string; role: string };
          socket.data.userId = decoded.userId;
          socket.data.role = decoded.role;
          return next();
        }

        if (apiKey) {
          const user = await prisma.user.findUnique({
            where: { apiKey: apiKey as string },
          });
          if (user) {
            socket.data.userId = user.id;
            socket.data.role = user.role;
            return next();
          }
        }

        // Allow guest / public connections (can join public domain updates)
        return next();
      } catch (err) {
        return next();
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.userId;
      const role = socket.data.role;

      if (userId) {
        socket.join(`user:${userId}`);
        console.log(`[WebSocket] User ${userId} joined room user:${userId}`);
      }

      if (role === 'ADMIN') {
        socket.join('admin:stream');
        console.log(`[WebSocket] Admin joined room admin:stream`);
      }

      socket.on('disconnect', () => {
        // Disconnected cleanly
      });
    });

    // Start Redis subscriber for OTP events
    this.startRedisSubscription();

    return this.io;
  }

  private static startRedisSubscription(): void {
    redisSubscriber.subscribe('email:otp:received', (err, count) => {
      if (err) {
        console.error('[WebSocket] Redis subscribe error:', err.message);
      } else {
        console.log(`[WebSocket] Subscribed to Redis channels (${count})`);
      }
    });

    redisSubscriber.on('message', (channel, message) => {
      if (channel === 'email:otp:received' && this.io) {
        try {
          const data = JSON.parse(message);
          // Push to specific user
          if (data.userId) {
            this.io.to(`user:${data.userId}`).emit('otp:update', data);
          }
          // Push to admin live stream
          this.io.to('admin:stream').emit('admin:email:stream', data);
        } catch (e: any) {
          console.error('[WebSocket] Error forwarding Redis message:', e.message);
        }
      }
    });
  }

  public static getIO(): SocketIOServer {
    if (!this.io) throw new Error('Socket.IO not initialized');
    return this.io;
  }
}
