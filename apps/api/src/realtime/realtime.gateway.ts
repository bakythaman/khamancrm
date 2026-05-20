import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  namespace: 'realtime',
  cors: { origin: '*' },
})
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected ${client.id}`);
  }

  @SubscribeMessage('workspace.join')
  joinWorkspace(@ConnectedSocket() client: Socket, @MessageBody('organizationId') organizationId: string) {
    void client.join(`org:${organizationId}`);
    return { joined: true };
  }

  emitToWorkspace(organizationId: string, event: string, payload: unknown) {
    this.server.to(`org:${organizationId}`).emit(event, {
      organizationId,
      timestamp: new Date().toISOString(),
      payload,
    });
  }
}
