import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthUser, CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiService } from './ai.service';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('conversation-summary')
  summarizeConversation(@CurrentUser() user: AuthUser, @Body('conversationId') conversationId: string) {
    return this.aiService.summarizeConversation(user.organizationId, conversationId);
  }

  @Post('call-note')
  summarizeCall(@CurrentUser() user: AuthUser, @Body('callId') callId: string) {
    return this.aiService.summarizeCall(user.organizationId, callId);
  }
}
