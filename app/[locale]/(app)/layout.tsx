import { AppHeader } from "@/components/app-header";
import { QueueProvider } from "@/components/providers/queue-provider";

export default function AppGroupLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <QueueProvider>
      <AppHeader />
      {children}
    </QueueProvider>
  );
}
