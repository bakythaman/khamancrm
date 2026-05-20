import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateCallDto } from './dto/create-call.dto';

@Injectable()
export class CallsService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.call.findMany({
      where: { organizationId },
      include: { contact: true, owner: true, deal: true },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
  }

  create(organizationId: string, ownerId: string, dto: CreateCallDto) {
    return this.prisma.call.create({
      data: {
        organizationId,
        contactId: dto.contactId,
        dealId: dto.dealId,
        ownerId,
        direction: 'OUTBOUND',
        status: 'QUEUED',
      },
    });
  }
}
