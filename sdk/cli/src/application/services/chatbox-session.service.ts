import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { 
  CHATBOX_SESSION_REPOSITORY, 
  IChatboxSessionRepository, 
  ChatboxSession,
  ChatRole
} from '../../domain/interfaces/chat/chatbox.interface';

export interface ChatRequest {
  sessionId?: string;
  message: string;
}

export interface ChatResponse {
  sessionId: string;
  reply: string;
}

@Injectable()
export class ChatboxSessionService {
  constructor(
    @Inject(CHATBOX_SESSION_REPOSITORY)
    private readonly sessionRepository: IChatboxSessionRepository,
  ) {}

  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    const sessionId = request.sessionId || randomUUID();
    let session = await this.sessionRepository.getSession(sessionId);

    if (!session) {
      session = await this.sessionRepository.createSession(sessionId);
      // Opcional: Agregar mensaje de sistema inicial
      session.messages.push({
        id: randomUUID(),
        role: 'system',
        content: 'You are the Evolith Tracker Assistant, aware of the Evolith architecture context.',
        timestamp: new Date()
      });
    }

    // Guardar mensaje del usuario
    session.messages.push({
      id: randomUUID(),
      role: 'user',
      content: request.message,
      timestamp: new Date()
    });

    // TODO: Aquí llamaríamos al LLM (via LangChain, SDK de AI, etc.) o a herramientas MCP
    // Por ahora para MVP respondemos con un mock y guardamos la respuesta
    const mockReply = `Received your message: "${request.message}". This is a mock response from Evolith Core API. Session holds ${session.messages.length} messages.`;

    session.messages.push({
      id: randomUUID(),
      role: 'assistant',
      content: mockReply,
      timestamp: new Date()
    });

    await this.sessionRepository.saveSession(session);

    return {
      sessionId: session.id,
      reply: mockReply
    };
  }

  async getSessionHistory(sessionId: string): Promise<ChatboxSession | null> {
    return this.sessionRepository.getSession(sessionId);
  }
}
