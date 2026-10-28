'use client'
import ChatHeader from '@/features/chat/components/ChatHeader'
import ChatConversation from '@/features/chat/components/ChatConversation'
export default function ChatPage() {
  return <div className="flex h-dvh flex-col overflow-hidden bg-background">
    <ChatHeader />
    <ChatConversation variant="page" />
  </div>
}
