import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AiService {
  constructor(private readonly prisma: PrismaService) {}

  async summarizeConversation(organizationId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId },
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');

    return this.prisma.aiNote.create({
      data: {
        organizationId,
        conversationId,
        title: 'Chat summary',
        summary: 'Customer is interested, asked for price, and expects a follow-up today.',
        actionItems: ['Send proposal', 'Confirm delivery date'],
      },
    });
  }

  async summarizeCall(organizationId: string, callId: string) {
    const call = await this.prisma.call.findFirst({ where: { id: callId, organizationId } });
    if (!call) throw new NotFoundException('Call not found');

    return this.prisma.aiNote.create({
      data: {
        organizationId,
        callId,
        title: 'Call note',
        summary: 'Call completed. Customer wants a short quote and a WhatsApp recap.',
        actionItems: ['Create follow-up task'],
      },
    });
  }
}
