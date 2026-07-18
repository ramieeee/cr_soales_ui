import QueueTableManager from "@/components/queue-table-manager";

export default function AdminQueuePage() {
  return (
    <QueueTableManager
      title="Queue"
      description="Job queue status for OCR and extraction workers"
    />
  );
}
