import PapersTableManager from "@/components/papers-table-manager";

export default function PapersStagingPage() {
  return (
    <PapersTableManager
      variant="papers-staging"
      title="papers_staging"
      description="GET /paper_review/fetch/staging_papers (offset, limit)"
    />
  );
}
