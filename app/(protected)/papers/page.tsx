import PapersTableManager from "@/components/papers-table-manager";

export default function PapersPage() {
  return (
    <PapersTableManager
      variant="papers"
      title="papers"
      description="GET /paper_review/fetch/papers (offset, limit)"
    />
  );
}
