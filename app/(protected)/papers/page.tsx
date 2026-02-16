import PapersTableManager from "@/components/papers-table-manager";

export default function PapersPage() {
  return (
    <PapersTableManager
      variant="papers"
      title="papers"
      description="POST /paper_review/fetch/papers (offset, limit)"
    />
  );
}
