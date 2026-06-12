export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatboxMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: Date;
}

export interface ChatboxSession {
  id: string;
  messages: ChatboxMessage[];
  createdAt: Date;
  lastUpdatedAt: Date;
}

export interface IChatboxSessionRepository {
  /**
   * Retrieves a session by its ID.
   */
  getSession(id: string): Promise<ChatboxSession | null>;

  /**
   * Creates a new chat session.
   */
  createSession(id: string): Promise<ChatboxSession>;

  /**
   * Saves or updates an existing chat session.
   */
  saveSession(session: ChatboxSession): Promise<void>;
}

export const CHATBOX_SESSION_REPOSITORY = Symbol('IChatboxSessionRepository');
