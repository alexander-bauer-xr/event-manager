export const SocketEvents = {
  CLIENT_EVENT_JOIN: 'event:join',
  CLIENT_CHAT_JOIN: 'chat:join',
  CLIENT_CHAT_SEND: 'chat:send',
  CLIENT_CHAT_EDIT: 'chat:edit',
  CLIENT_CHAT_DELETE: 'chat:delete',
  CLIENT_CHAT_TYPING: 'chat:typing',
  CLIENT_ADMIN_NEXT: 'admin:next',
  CLIENT_ADMIN_ANNOUNCE: 'admin:announce',
  CLIENT_ADMIN_AUTH: 'admin:auth',

  SERVER_EVENT_SNAPSHOT: 'event:snapshot',
  SERVER_STATE_UPDATE: 'state:update',
  SERVER_ANNOUNCEMENT_NEW: 'announcement:new',
  SERVER_CHAT_NEW: 'chat:new',
  SERVER_CHAT_EDITED: 'chat:edited',
  SERVER_CHAT_DELETED: 'chat:deleted',
  SERVER_CHAT_TYPING: 'chat:typing',
  SERVER_PRESENCE_UPDATE: 'presence:update',
  SERVER_ERROR: 'error',
} as const;

export function eventRoom(slug: string): string {
  return `event:${slug}`;
}

export function chatRoom(slug: string, roomKey: string): string {
  return `event:${slug}:room:${roomKey}`;
}
