'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ChatHeader from '@/features/chat/components/ChatHeader'
import ChatConversation from '@/features/chat/components/ChatConversation'
import { useFinnicPanel } from '@/features/shell/finnic-panel/FinnicPanelProvider'

export default function ChatPage() {
  const { isDesktop, openPanel } = useFinnicPanel()
  const router = useRouter()

  // En desktop Finnic vive en el panel lateral: /chat lo abre y vuelve al inicio.
  useEffect(() => {
    if (!isDesktop) return
    openPanel()
    router.replace('/dashboard')
  }, [isDesktop, openPanel, router])

  if (isDesktop) return null

  return <div className="flex h-dvh flex-col overflow-hidden bg-background">
    <ChatHeader />
    <ChatConversation variant="page" />
  </div>
}
