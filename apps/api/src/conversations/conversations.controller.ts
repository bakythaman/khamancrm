import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AssignConversationDto } from './dto/assign-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { ConversationsService } from './conversations.service';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.conversationsService.list(user.organizationId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.conversationsService.get(user.organizationId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/assign')
  assign(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: AssignConversationDto,
  ) {
    return this.conversationsService.assign(user.organizationId, id, dto.ownerId ?? null);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/messages')
  send(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.conversationsService.send(user.organizationId, id, user.sub, dto.body);
  }

  @Post('webhooks/whatsapp')
  whatsappWebhook(@Body() body: unknown) {
    return this.conversationsService.receiveWhatsAppWebhook(body);
  }
}
