import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ChatboxSessionService, ChatRequest } from '../../../application/services/chatbox-session.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatboxService: ChatboxSessionService) {}

  @Post()
  async chat(@Body() request: ChatRequest) {
    return this.chatboxService.processMessage(request);
  }

  @Get(':sessionId')
  async getHistory(@Param('sessionId') sessionId: string) {
    const session = await this.chatboxService.getSessionHistory(sessionId);
    return session || { message: 'Session not found' };
  }
}
