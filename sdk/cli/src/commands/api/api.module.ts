import { Module } from '@nestjs/common';
import { ChatController } from '../../infrastructure/api/controllers/chat.controller';
import { ChatboxSessionService } from '../../application/services/chatbox-session.service';
import { InMemoryChatboxSessionRepository } from '../../infrastructure/adapters/chat/in-memory-chatbox-session.repository';
import { CHATBOX_SESSION_REPOSITORY } from '../../domain/interfaces/chat/chatbox.interface';

@Module({
  controllers: [ChatController],
  providers: [
    ChatboxSessionService,
    {
      provide: CHATBOX_SESSION_REPOSITORY,
      useClass: InMemoryChatboxSessionRepository,
    },
  ],
})
export class ApiModule {}
