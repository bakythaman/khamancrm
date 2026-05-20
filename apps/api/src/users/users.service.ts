import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../common/prisma/prisma.service';
import { InviteUserDto } from './dto/invite-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        avatarUrl: true,
        _count: { select: { ownedDeals: true, assignedChats: true, tasks: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async invite(organizationId: string, dto: InviteUserDto) {
    const passwordHash = await bcrypt.hash(randomUUID(), 12);
    return this.prisma.user.create({
      data: {
        organizationId,
        name: dto.name,
        email: dto.email.toLowerCase(),
        role: dto.role,
        passwordHash,
        active: true,
      },
      select: { id: true, name: true, email: true, role: true, active: true },
    });
  }
}
