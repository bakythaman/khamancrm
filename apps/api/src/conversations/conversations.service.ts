import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.conversation.findMany({
      where: { organizationId },
      include: {
        contact: true,
        owner: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        tags: { include: { tag: true } },
      },
      orderBy: [{ unreadCount: 'desc' }, { lastMessageAt: 'desc' }],
    });
  }

  async get(organizationId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, organizationId },
      include: {
        contact: true,
        owner: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
        messages: { orderBy: { createdAt: 'asc' } },
        tags: { include: { tag: true } },
        aiNotes: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }

  async assign(organizationId: string, id: string, ownerId: string | null) {
    await this.ensureConversation(organizationId, id);
    return this.prisma.conversation.update({
      where: { id },
      data: { ownerId },
      include: { owner: true },
    });
  }

  async send(organizationId: string, id: string, senderId: string, body: string) {
    await this.ensureConversation(organizationId, id);
    return this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId: id,
          senderId,
          direction: 'OUTBOUND',
          body,
        },
      }),
      this.prisma.conversation.update({
        where: { id },
        data: { lastMessageAt: new Date(), unreadCount: 0 },
      }),
    ]);
  }

  receiveWhatsAppWebhook(body: unknown) {
    return { received: true, provider: 'whatsapp', body };
  }

  private async ensureConversation(organizationId: string, id: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id, organizationId },
      select: { id: true },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
  }
}
