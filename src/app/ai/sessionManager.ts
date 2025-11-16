import { randomUUID } from '@openai/agents-core/_shims';
import type { AgentInputItem, Session } from '@openai/agents-core';

/**
 * Custom memory session implementation for managing agent conversations
 */
export class CustomMemorySession implements Session {
    private readonly sessionId: string;
    private items: AgentInputItem[];

    constructor(
        options: {
            sessionId?: string;
            initialItems?: AgentInputItem[];
        } = {},
    ) {
        this.sessionId = options.sessionId ?? randomUUID();
        this.items = options.initialItems
            ? options.initialItems.map(cloneAgentItem)
            : [];
    }

    async getSessionId(): Promise<string> {
        return this.sessionId;
    }

    async getItems(limit?: number): Promise<AgentInputItem[]> {
        if (limit === undefined) {
            return this.items.map(cloneAgentItem);
        }

        if (limit <= 0) {
            return [];
        }

        const start = Math.max(this.items.length - limit, 0);
        return this.items.slice(start).map(cloneAgentItem);
    }

    async addItems(items: AgentInputItem[]): Promise<void> {
        if (items.length === 0) {
            return;
        }

        const cloned = items.map(cloneAgentItem);
        this.items = [...this.items, ...cloned];
    }

    async popItem(): Promise<AgentInputItem | undefined> {
        if (this.items.length === 0) {
            return undefined;
        }

        const item = this.items[this.items.length - 1];
        const cloned = cloneAgentItem(item);
        this.items = this.items.slice(0, -1);
        return cloned;
    }

    async clearSession(): Promise<void> {
        this.items = [];
    }
}

function cloneAgentItem<T extends AgentInputItem>(item: T): T {
    return structuredClone(item);
}

/**
 * Session manager to handle multiple sessions
 */
export class SessionManager {
    private sessions: Map<string, CustomMemorySession>;

    constructor() {
        this.sessions = new Map();
    }

    createSession(sessionId?: string): CustomMemorySession {
        const session = new CustomMemorySession({ sessionId });
        this.sessions.set(session.getSessionId() as unknown as string, session);
        return session;
    }

    getSession(sessionId: string): CustomMemorySession | undefined {
        return this.sessions.get(sessionId);
    }

    async clearSession(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (session) {
            await session.clearSession();
        }
    }

    deleteSession(sessionId: string): void {
        this.sessions.delete(sessionId);
    }

    getAllSessionIds(): string[] {
        return Array.from(this.sessions.keys());
    }
}
