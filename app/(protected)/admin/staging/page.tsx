import PapersTableManager from "@/components/papers-table-manager";

export default function AdminStagingPage() {
  return (
    <PapersTableManager
      variant="papers-staging"
      title="Staging Review"
      description="Validate bibliographic records before they enter the client dataset."
    />
  );
}
