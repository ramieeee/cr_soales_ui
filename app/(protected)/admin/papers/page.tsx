import PapersTableManager from "@/components/papers-table-manager";

export default function AdminPapersPage() {
  return (
    <PapersTableManager
      variant="papers"
      title="Approved Papers"
      description="Client-ready paper records with extraction actions."
    />
  );
}
