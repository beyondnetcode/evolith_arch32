import { Injectable } from '@nestjs/common';
import { ChatboxSession, IChatboxSessionRepository } from '../../../domain/interfaces/chat/chatbox.interface';

@Injectable()
export class InMemoryChatboxSessionRepository implements IChatboxSessionRepository {
  private sessions: Map<string, ChatboxSession> = new Map();

  async getSession(id: string): Promise<ChatboxSession | null> {
    return this.sessions.get(id) || null;
  }

  async createSession(id: string): Promise<ChatboxSession> {
    if (this.sessions.has(id)) {
      throw new Error(`Session with ID ${id} already exists`);
    }

    const now = new Date();
    const session: ChatboxSession = {
      id,
      messages: [],
      createdAt: now,
      lastUpdatedAt: now,
    };

    this.sessions.set(id, session);
    return session;
  }

  async saveSession(session: ChatboxSession): Promise<void> {
    session.lastUpdatedAt = new Date();
    this.sessions.set(session.id, session);
  }
}
