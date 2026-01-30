import { ChatLayout } from '@/components/chat/chat-layout';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ChatLayout>
      {children}
    </ChatLayout>
  );
}
