import { prisma } from '../db/prisma';
import { Errors } from '../utils/errors';
import { chatRateLimiter } from '../utils/rateLimit';

const MAX_MESSAGE_LENGTH = 400;

export interface SendMessageInput {
  slug: string;
  roomKey: string;
  guestId: string;
  guestName: string;
  text: string;
  isAdmin?: boolean;
}

export interface ChatMessageDTO {
  id: string;
  roomId: string;
  guestId: string;
  guestName: string;
  text: string;
  createdAt: Date;
  editedAt: Date | null;
  isEdited: boolean;
  deletedAt: Date | null;
  isDeleted: boolean;
}

export interface EditMessageInput {
  messageId: string;
  guestId: string;
  newText: string;
  isAdmin?: boolean;
}

export interface DeleteMessageInput {
  messageId: string;
  guestId: string;
  isAdmin?: boolean;
}

export interface PaginatedMessagesResult {
  messages: ChatMessageDTO[];
  hasMore: boolean;
  nextCursor: string | null;
  prevCursor: string | null;
}

export class ChatService {
  async sendMessage(input: SendMessageInput): Promise<ChatMessageDTO> {
    const trimmedText = input.text.trim();

    if (!trimmedText) {
      throw Errors.MESSAGE_EMPTY();
    }

    if (trimmedText.length > MAX_MESSAGE_LENGTH) {
      throw Errors.MESSAGE_TOO_LONG();
    }

    if (!input.isAdmin && !chatRateLimiter.check(input.guestId)) {
      throw Errors.RATE_LIMIT_EXCEEDED();
    }

    const event = await prisma.event.findUnique({
      where: { slug: input.slug },
      select: { id: true },
    });

    if (!event) {
      throw Errors.EVENT_NOT_FOUND();
    }

    const room = await prisma.chatRoom.findUnique({
      where: {
        eventId_key: {
          eventId: event.id,
          key: input.roomKey,
        },
      },
    });

    if (!room) {
      throw Errors.ROOM_NOT_FOUND();
    }

    if (room.isAdminOnly && !input.isAdmin) {
      throw Errors.ADMIN_ONLY_ROOM();
    }

    const message = await prisma.chatMessage.create({
      data: {
        eventId: event.id,
        roomId: room.id,
        guestId: input.guestId,
        guestName: input.guestName,
        text: trimmedText,
      },
    });

    return {
      id: message.id,
      roomId: message.roomId,
      guestId: message.guestId,
      guestName: message.guestName,
      text: message.text,
      createdAt: message.createdAt,
      editedAt: message.editedAt,
      isEdited: message.isEdited,
      deletedAt: message.deletedAt,
      isDeleted: message.isDeleted,
    };
  }

  async getMessages(slug: string, roomKey: string, limit = 50) {
    const event = await prisma.event.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!event) {
      throw Errors.EVENT_NOT_FOUND();
    }

    const room = await prisma.chatRoom.findUnique({
      where: {
        eventId_key: {
          eventId: event.id,
          key: roomKey,
        },
      },
    });

    if (!room) {
      throw Errors.ROOM_NOT_FOUND();
    }

    return prisma.chatMessage.findMany({
      where: {
        roomId: room.id,
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        roomId: true,
        guestId: true,
        guestName: true,
        text: true,
        createdAt: true,
        editedAt: true,
        isEdited: true,
        deletedAt: true,
        isDeleted: true,
      },
    });
  }

  async getMessagesPaginated(
    slug: string,
    roomKey: string,
    options: {
      limit?: number;
      cursor?: string;
      direction?: 'before' | 'after';
    } = {}
  ): Promise<PaginatedMessagesResult> {
    const limit = options.limit || 50;
    const direction = options.direction || 'before';

    const event = await prisma.event.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!event) {
      throw Errors.EVENT_NOT_FOUND();
    }

    const room = await prisma.chatRoom.findUnique({
      where: {
        eventId_key: {
          eventId: event.id,
          key: roomKey,
        },
      },
    });

    if (!room) {
      throw Errors.ROOM_NOT_FOUND();
    }

    // Build cursor condition
    let cursorCondition = {};
    if (options.cursor) {
      const cursorMessage = await prisma.chatMessage.findUnique({
        where: { id: options.cursor },
        select: { createdAt: true, id: true },
      });

      if (cursorMessage) {
        if (direction === 'before') {
          cursorCondition = {
            OR: [
              { createdAt: { lt: cursorMessage.createdAt } },
              {
                AND: [
                  { createdAt: cursorMessage.createdAt },
                  { id: { lt: cursorMessage.id } },
                ],
              },
            ],
          };
        } else {
          cursorCondition = {
            OR: [
              { createdAt: { gt: cursorMessage.createdAt } },
              {
                AND: [
                  { createdAt: cursorMessage.createdAt },
                  { id: { gt: cursorMessage.id } },
                ],
              },
            ],
          };
        }
      }
    }

    // Fetch messages with one extra to determine hasMore
    const messages = await prisma.chatMessage.findMany({
      where: {
        roomId: room.id,
        isDeleted: false,
        ...cursorCondition,
      },
      orderBy: [{ createdAt: direction === 'before' ? 'desc' : 'asc' }, { id: direction === 'before' ? 'desc' : 'asc' }],
      take: limit + 1,
      select: {
        id: true,
        roomId: true,
        guestId: true,
        guestName: true,
        text: true,
        createdAt: true,
        editedAt: true,
        isEdited: true,
        deletedAt: true,
        isDeleted: true,
      },
    });

    const hasMore = messages.length > limit;
    const resultMessages = hasMore ? messages.slice(0, limit) : messages;

    // Reverse if fetching 'before' to get chronological order
    if (direction === 'before') {
      resultMessages.reverse();
    }

    const nextCursor = resultMessages.length > 0 ? resultMessages[resultMessages.length - 1].id : null;
    const prevCursor = resultMessages.length > 0 ? resultMessages[0].id : null;

    return {
      messages: resultMessages,
      hasMore,
      nextCursor,
      prevCursor,
    };
  }

  async editMessage(input: EditMessageInput): Promise<ChatMessageDTO> {
    const trimmedText = input.newText.trim();

    if (!trimmedText) {
      throw Errors.MESSAGE_EMPTY();
    }

    if (trimmedText.length > MAX_MESSAGE_LENGTH) {
      throw Errors.MESSAGE_TOO_LONG();
    }

    const message = await prisma.chatMessage.findUnique({
      where: { id: input.messageId },
    });

    if (!message) {
      throw Errors.MESSAGE_NOT_FOUND();
    }

    if (message.isDeleted) {
      throw Errors.MESSAGE_ALREADY_DELETED();
    }

    // Authorization: Only owner or admin can edit
    if (message.guestId !== input.guestId && !input.isAdmin) {
      throw Errors.FORBIDDEN('Cannot edit other users messages');
    }

    // Build edit history
    const currentHistory = message.editHistory
      ? (JSON.parse(message.editHistory as string) as Array<{ text: string; editedAt: string }>)
      : [];

    // Limit edit history to 10 entries
    const newHistory = [
      ...currentHistory.slice(-9),
      {
        text: message.text,
        editedAt: new Date().toISOString(),
      },
    ];

    const updated = await prisma.chatMessage.update({
      where: { id: input.messageId },
      data: {
        text: trimmedText,
        editedAt: new Date(),
        isEdited: true,
        editHistory: JSON.stringify(newHistory),
      },
    });

    return {
      id: updated.id,
      roomId: updated.roomId,
      guestId: updated.guestId,
      guestName: updated.guestName,
      text: updated.text,
      createdAt: updated.createdAt,
      editedAt: updated.editedAt,
      isEdited: updated.isEdited,
      deletedAt: updated.deletedAt,
      isDeleted: updated.isDeleted,
    };
  }

  async deleteMessage(input: DeleteMessageInput): Promise<{ messageId: string; deletedAt: Date }> {
    const message = await prisma.chatMessage.findUnique({
      where: { id: input.messageId },
    });

    if (!message) {
      throw Errors.MESSAGE_NOT_FOUND();
    }

    if (message.isDeleted) {
      throw Errors.MESSAGE_ALREADY_DELETED();
    }

    // Authorization: Only owner or admin can delete
    if (message.guestId !== input.guestId && !input.isAdmin) {
      throw Errors.FORBIDDEN('Cannot delete other users messages');
    }

    const updated = await prisma.chatMessage.update({
      where: { id: input.messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: input.guestId,
      },
    });

    return {
      messageId: updated.id,
      deletedAt: updated.deletedAt!,
    };
  }
}

export const chatService = new ChatService();
