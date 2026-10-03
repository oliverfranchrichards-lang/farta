import { notFound } from 'next/navigation';
import { listDirectConversations, listDirectMessages } from '@/modules/chat/chat.actions';
import { ChatConversation } from './chat-conversation';

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  const [conversations, messages] = await Promise.all([listDirectConversations(), listDirectMessages(conversationId)]);
  if (!conversations.ok || !messages.ok) notFound();
  const conversation = conversations.conversations.find(item => item.id === conversationId);
  if (!conversation) notFound();
  return <ChatConversation conversation={conversation} initialMessages={messages.messages} />;
}
