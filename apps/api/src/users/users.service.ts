import { ConflictException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { InviteUserDto } from './dto/invite-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  list(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        avatarUrl: true,
        _count: { select: { ownedDeals: true, assignedChats: true, tasks: true } },
      } as NonNullable<Parameters<typeof this.prisma.user.findMany>[0]>['select'] & { phone: true },
      orderBy: { name: 'asc' },
    });
  }

  async invite(organizationId: string, dto: InviteUserDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('validation.userExists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        organizationId,
        name: dto.name,
        email,
        phone: dto.phone,
        role: dto.role,
        passwordHash,
        active: true,
      } as Parameters<typeof this.prisma.user.create>[0]['data'] & { phone: string },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        avatarUrl: true,
      } as Parameters<typeof this.prisma.user.create>[0]['select'] & { phone: true },
    });
    const invitedUser = user as typeof user & { phone?: string };
    await this.mail.sendInviteEmail(invitedUser.email, invitedUser.name, dto.password);
    return invitedUser;
  }

  update(organizationId: string, id: string, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id, organizationId },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.email ? { email: dto.email.toLowerCase() } : {}),
        ...(dto.phone ? { phone: dto.phone.trim() } : {}),
        ...(dto.role ? { role: dto.role } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
        ...(dto.avatarUrl !== undefined ? { avatarUrl: dto.avatarUrl || null } : {}),
      } as Parameters<typeof this.prisma.user.update>[0]['data'] & { phone?: string },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        active: true,
        avatarUrl: true,
      } as Parameters<typeof this.prisma.user.update>[0]['select'] & { phone: true },
    });
  }
}
