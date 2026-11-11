import { reviewRecordAction } from "@/actions/records";

export function ReviewForm({
  recordId,
  redirectTo = "/admin/submissions",
  compact = false,
}: {
  recordId: string;
  redirectTo?: string;
  compact?: boolean;
}) {
  return (
    <form action={reviewRecordAction} className="space-y-2">
      <input type="hidden" name="record_id" value={recordId} />
      <input type="hidden" name="redirect_to" value={redirectTo} />
      <input
        name="note"
        className="input"
        placeholder="Reviewer note (optional, shown to the player)"
        maxLength={500}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          name="decision"
          value="approved"
          className={`btn btn-success ${compact ? "btn-sm" : ""}`}
        >
          Approve
        </button>
        <button
          type="submit"
          name="decision"
          value="rejected"
          className={`btn btn-danger ${compact ? "btn-sm" : ""}`}
        >
          Reject
        </button>
      </div>
    </form>
  );
}
