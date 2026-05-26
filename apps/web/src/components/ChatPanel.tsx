import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store/useStore';

const MAX_MESSAGE_LENGTH = 400;
const RATE_LIMIT_MESSAGES = 5;
const RATE_LIMIT_WINDOW = 10000; // 10 seconds in milliseconds

export function ChatPanel() {
  const { slug } = useParams<{ slug: string }>();
  const { t, i18n } = useTranslation();
  const rooms = useStore((s) => s.rooms);
  const currentRoomKey = useStore((s) => s.chat.currentRoomKey);
  const messagesByRoom = useStore((s) => s.chat.messagesByRoom);
  const typingUsers = useStore((s) => s.chat.typingUsers);
  const presence = useStore((s) => s.presence);
  const isAdmin = useStore((s) => s.isAdmin);
  const guestName = useStore((s) => s.guestName);
  const guestId = useStore((s) => s.guestId);
  const joinRoom = useStore((s) => s.joinRoom);
  const sendMessage = useStore((s) => s.sendMessage);
  const editMessage = useStore((s) => s.editMessage);
  const deleteMessage = useStore((s) => s.deleteMessage);
  const sendTyping = useStore((s) => s.sendTyping);
  const loadMoreMessages = useStore((s) => s.loadMoreMessages);
  const setCurrentRoom = useStore((s) => s.setCurrentRoom);
  const error = useStore((s) => s.error);

  const [messageText, setMessageText] = useState('');
  const [messageSentTimes, setMessageSentTimes] = useState<number[]>([]);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [typingTimeout, setTypingTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const currentRoom = rooms.find((r) => r.key === currentRoomKey);
  const roomState = messagesByRoom[currentRoomKey];
  const messages = roomState?.messages || [];
  const hasMore = roomState?.hasMore || false;
  const isLoadingMore = roomState?.isLoading || false;
  const roomTypingUsers = typingUsers[currentRoomKey] || new Set();

  const availableRooms = rooms.filter((room) => !room.isAdminOnly || isAdmin);

  // Character count
  const charCount = messageText.length;
  const charCountColor = charCount > MAX_MESSAGE_LENGTH * 0.9 ? 'warning' : charCount > MAX_MESSAGE_LENGTH * 0.8 ? 'info' : 'normal';

  // Calculate if rate limited
  const now = Date.now();
  const recentMessages = messageSentTimes.filter(time => now - time < RATE_LIMIT_WINDOW);
  const isRateLimited = recentMessages.length >= RATE_LIMIT_MESSAGES;
  const canSend = !isRateLimited && messageText.trim().length > 0;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Only auto-scroll if user is near the bottom (within 100px)
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Rate limit countdown timer
  useEffect(() => {
    if (isRateLimited && recentMessages.length > 0) {
      const oldestMessageTime = Math.min(...recentMessages);
      const unlockTime = oldestMessageTime + RATE_LIMIT_WINDOW;

      const updateCountdown = () => {
        const remaining = Math.ceil((unlockTime - Date.now()) / 1000);
        if (remaining <= 0) {
          setRateLimitCountdown(0);
          // Clean up old timestamps
          setMessageSentTimes(prev => prev.filter(time => Date.now() - time < RATE_LIMIT_WINDOW));
        } else {
          setRateLimitCountdown(remaining);
          requestAnimationFrame(updateCountdown);
        }
      };

      updateCountdown();
    } else {
      setRateLimitCountdown(0);
    }
  }, [isRateLimited, recentMessages.length]);

  const handleRoomChange = async (roomKey: string) => {
    if (!slug) return;
    setIsLoadingHistory(true);
    setCurrentRoom(roomKey);
    joinRoom(slug, roomKey);
    // Give time for the history to load
    setTimeout(() => setIsLoadingHistory(false), 500);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !canSend) return;

    sendMessage(slug, currentRoomKey, messageText);
    setMessageText('');

    // Clear typing indicator
    if (typingTimeout) clearTimeout(typingTimeout);
    sendTyping(slug, currentRoomKey, false);

    // Track message send time for rate limiting
    setMessageSentTimes(prev => [...prev, Date.now()]);

    // Scroll to bottom after sending
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const formatTimestamp = (time: string) => {
    const date = new Date(time);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return t('chat.justNow');
    if (diffMins < 60) return t('chat.minutesAgo', { count: diffMins });
    if (diffMins < 1440) return t('chat.hoursAgo', { count: Math.floor(diffMins / 60) });
    return date.toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' });
  };

  const isOwnMessage = (msg: { guestName: string; guestId?: string }) => {
    // Check by guestId if available, fallback to guestName
    if (msg.guestId && guestId) {
      return msg.guestId === guestId;
    }
    return msg.guestName === guestName;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSend(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageText(e.target.value);

    // Send typing indicator
    if (slug) {
      sendTyping(slug, currentRoomKey, true);

      // Clear previous timeout
      if (typingTimeout) clearTimeout(typingTimeout);

      // Stop typing after 2 seconds of inactivity
      const timeout = setTimeout(() => {
        sendTyping(slug, currentRoomKey, false);
      }, 2000);
      setTypingTimeout(timeout);
    }
  };

  const startEdit = (messageId: string, currentText: string) => {
    setEditingMessageId(messageId);
    setEditText(currentText);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const handleEdit = (e: React.FormEvent, messageId: string) => {
    e.preventDefault();
    if (!slug || !editText.trim()) return;

    editMessage(slug, currentRoomKey, messageId, editText);
    setEditingMessageId(null);
    setEditText('');
  };

  const handleDelete = (messageId: string) => {
    if (!slug) return;

    if (confirm(t('chat.deleteConfirm'))) {
      deleteMessage(slug, currentRoomKey, messageId);
    }
  };

  const handleLoadMore = () => {
    if (!slug || !hasMore || isLoadingMore) return;
    loadMoreMessages(slug, currentRoomKey);
  };

  // Build typing indicator text
  const getTypingText = () => {
    const users = Array.from(roomTypingUsers);
    if (users.length === 0) return null;

    if (users.length === 1) {
      return t('chat.typingOne', { name: users[0] });
    }

    const displayNames = users.slice(0, 3).join(', ');
    if (users.length > 3) {
      return t('chat.typingMany', { names: displayNames + ' ' + t('chat.typingOthers', { count: users.length - 3 }) });
    }
    return t('chat.typingMany', { names: displayNames });
  };

  // Clear typing indicator when sending message
  useEffect(() => {
    return () => {
      if (typingTimeout) clearTimeout(typingTimeout);
      if (slug) sendTyping(slug, currentRoomKey, false);
    };
  }, [currentRoomKey]);

  return (
    <div className="chat-panel">
      <div className="chat-panel-header">
        <div className="chat-rooms">
          {availableRooms.map((room) => (
            <button
              key={room.key}
              className={`chat-room-btn ${room.key === currentRoomKey ? 'active' : ''}`}
              onClick={() => handleRoomChange(room.key)}
            >
              {room.title}
              {room.isAdminOnly && <span className="admin-badge">{t('chat.adminBadge')}</span>}
            </button>
          ))}
        </div>
        <div className="chat-presence">
          <span className="chat-presence-dot"></span>
          <span className="chat-presence-count">{t('chat.online', { count: presence.count })}</span>
        </div>
      </div>

      {error && <div className="chat-error">{t(error as any)}</div>}

      <div className="chat-messages" ref={messagesContainerRef}>
        {hasMore && (
          <button
            className="chat-load-more"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? t('chat.loadingMore') : t('chat.loadMore')}
          </button>
        )}
        {isLoadingHistory ? (
          <div className="chat-loading">
            <div className="chat-loading-spinner"></div>
            <span>{t('chat.loadingMessages')}</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-empty-state">
            <div className="chat-empty-icon">💬</div>
            <div className="chat-empty-title">{t('chat.emptyTitle')}</div>
            <div className="chat-empty-subtitle">
              {currentRoom?.isAdminOnly
                ? t('chat.emptySubtitleAdmin')
                : t('chat.emptySubtitlePublic')}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => {
              const own = isOwnMessage(msg);
              const showAuthor = index === 0 || messages[index - 1].guestName !== msg.guestName;

              return (
                <div
                  key={msg.id}
                  className={`chat-message ${own ? 'own-message' : ''}`}
                >
                  {showAuthor && (
                    <div className="chat-message-header">
                      <span className="chat-message-author">
                        {own ? t('chat.you') : msg.guestName}
                      </span>
                      <span className="chat-message-time">{formatTimestamp(msg.createdAt)}</span>
                    </div>
                  )}

                  {editingMessageId === msg.id ? (
                    <form onSubmit={(e) => handleEdit(e, msg.id)} className="chat-message-edit-form">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        maxLength={MAX_MESSAGE_LENGTH}
                        autoFocus
                        className="chat-message-edit-input"
                      />
                      <div className="chat-message-edit-actions">
                        <button type="submit" className="chat-btn-save" disabled={!editText.trim()}>
                          {t('chat.save')}
                        </button>
                        <button type="button" onClick={cancelEdit} className="chat-btn-cancel">
                          {t('chat.cancel')}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="chat-message-content">
                        <div className="chat-message-text">{msg.text}</div>
                        {msg.isEdited && (
                          <span className="chat-message-edited" title={`${t('chat.edited')} ${formatTimestamp(msg.editedAt!)}`}>
                            {t('chat.edited')}
                          </span>
                        )}
                      </div>

                      {own && !editingMessageId && (
                        <div className="chat-message-actions">
                          <button
                            className="chat-action-btn chat-edit-btn"
                            onClick={() => startEdit(msg.id, msg.text)}
                            title={t('chat.editMessage')}
                          >
                            ✏️
                          </button>
                          <button
                            className="chat-action-btn chat-delete-btn"
                            onClick={() => handleDelete(msg.id)}
                            title={t('chat.deleteMessage')}
                          >
                            🗑️
                          </button>
                        </div>
                      )}

                      {isAdmin && !own && !editingMessageId && (
                        <div className="chat-message-actions">
                          <button
                            className="chat-action-btn chat-delete-btn admin"
                            onClick={() => handleDelete(msg.id)}
                            title={t('chat.deleteMessageAdmin')}
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            {roomTypingUsers.size > 0 && (
              <div className="chat-typing-indicator">
                <div className="chat-typing-text">
                  {getTypingText()}
                  <span className="chat-typing-dots">
                    <span>.</span><span>.</span><span>.</span>
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <form className="chat-input-form" onSubmit={handleSend}>
        <div className="chat-input-container">
          <input
            type="text"
            className="chat-input"
            placeholder={t('chat.messagePlaceholder', { room: currentRoom?.title || 'chat' })}
            value={messageText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            maxLength={MAX_MESSAGE_LENGTH}
            disabled={isRateLimited}
          />
          <button
            type="submit"
            className="chat-send-btn"
            disabled={!canSend}
            title={isRateLimited ? t('chat.rateLimitTitle', { seconds: rateLimitCountdown }) : t('chat.editMessage')}
          >
            {isRateLimited ? (
              <span className="chat-countdown">{rateLimitCountdown}s</span>
            ) : (
              <svg className="chat-send-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            )}
          </button>
        </div>

        <div className="chat-input-footer">
          <div className={`chat-char-count ${charCountColor !== 'normal' ? `chat-char-count-${charCountColor}` : ''}`}>
            {charCount}/{MAX_MESSAGE_LENGTH}
          </div>
          {isRateLimited && (
            <div className="chat-rate-limit-warning">
              ⏱️ {t('chat.rateLimitWarning', { seconds: rateLimitCountdown })}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
