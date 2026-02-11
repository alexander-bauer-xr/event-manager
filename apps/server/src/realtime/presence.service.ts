export interface OnlineUser {
  socketId: string;
  guestId: string;
  guestName: string;
  joinedAt: number;
}

export interface PresenceState {
  users: Array<{ guestId: string; guestName: string; joinedAt: number }>;
  count: number;
}

export class PresenceService {
  private usersByEvent: Map<string, Map<string, OnlineUser>> = new Map();

  join(slug: string, socketId: string, guestId: string, guestName: string): void {
    if (!this.usersByEvent.has(slug)) {
      this.usersByEvent.set(slug, new Map());
    }

    const eventUsers = this.usersByEvent.get(slug)!;
    eventUsers.set(socketId, {
      socketId,
      guestId,
      guestName,
      joinedAt: Date.now(),
    });
  }

  leave(slug: string, socketId: string): void {
    const eventUsers = this.usersByEvent.get(slug);
    if (eventUsers) {
      eventUsers.delete(socketId);

      // Clean up empty event maps
      if (eventUsers.size === 0) {
        this.usersByEvent.delete(slug);
      }
    }
  }

  getOnlineUsers(slug: string): PresenceState {
    const eventUsers = this.usersByEvent.get(slug);

    if (!eventUsers || eventUsers.size === 0) {
      return { users: [], count: 0 };
    }

    // Deduplicate by guestId (in case same user has multiple connections)
    const uniqueUsers = new Map<string, OnlineUser>();
    for (const user of eventUsers.values()) {
      if (!uniqueUsers.has(user.guestId) || uniqueUsers.get(user.guestId)!.joinedAt > user.joinedAt) {
        uniqueUsers.set(user.guestId, user);
      }
    }

    const users = Array.from(uniqueUsers.values()).map((u) => ({
      guestId: u.guestId,
      guestName: u.guestName,
      joinedAt: u.joinedAt,
    }));

    return {
      users,
      count: users.length,
    };
  }

  getUserCount(slug: string): number {
    return this.getOnlineUsers(slug).count;
  }

  isUserOnline(slug: string, guestId: string): boolean {
    const eventUsers = this.usersByEvent.get(slug);
    if (!eventUsers) return false;

    for (const user of eventUsers.values()) {
      if (user.guestId === guestId) {
        return true;
      }
    }
    return false;
  }

  // For debugging/monitoring
  getStats(): { totalEvents: number; totalConnections: number } {
    let totalConnections = 0;
    for (const eventUsers of this.usersByEvent.values()) {
      totalConnections += eventUsers.size;
    }

    return {
      totalEvents: this.usersByEvent.size,
      totalConnections,
    };
  }
}

export const presenceService = new PresenceService();
