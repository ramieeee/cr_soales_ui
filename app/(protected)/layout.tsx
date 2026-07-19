import { AdminRail } from "@/components/admin-rail";
import {
  UploadSessionProvider,
  UploadStatusCard,
} from "@/components/upload-session";

export default function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <UploadSessionProvider>
      <div className="soales-page min-h-dvh overflow-x-hidden">
        <AdminRail statusSlot={<UploadStatusCard />} />

        <main className="ml-48 min-h-dvh w-[calc(100%-12rem)] p-6 md:p-16">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>
    </UploadSessionProvider>
  );
}
