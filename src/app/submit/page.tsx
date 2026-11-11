import Link from "next/link";
import { redirect } from "next/navigation";

import { SubmitRecordForm } from "@/components/submit-record-form";
import { Notice } from "@/components/notice";
import { getSessionUser } from "@/lib/auth";
import { getLevelOptions } from "@/lib/data";

export const metadata = {
  title: "Submit a record",
  description: "Submit a Geometry Dash completion or verification to Schemonlist.",
};

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Fsubmit");

  const [levels, params] = await Promise.all([getLevelOptions(), searchParams]);
  const requested = params.level ? levels.find((level) => level.slug === params.level) : undefined;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <p className="eyebrow">Records</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">
          Submit a record
        </h1>
        <p className="mt-3 text-sm text-slate-400 sm:text-base">
          Claim a completion or a verification. Every submission is checked by a
          moderator against the video you provide.
        </p>
      </div>

      {user.is_banned ? (
        <div className="mb-6">
          <Notice variant="error" title="Your account is banned">
            You cannot submit records while banned. Contact an administrator if
            you believe this is a mistake.
          </Notice>
        </div>
      ) : null}

      <div className="card p-6 sm:p-8">
        <SubmitRecordForm
          levels={levels}
          defaultLevelId={requested?.id}
          disabled={user.is_banned || levels.length === 0}
        />
      </div>

      {levels.length === 0 ? (
        <Notice variant="warning" className="mt-6">
          There are no listed levels yet, so there is nothing to submit. An
          administrator needs to add levels first.
        </Notice>
      ) : null}

      <p className="mt-6 text-center text-xs text-slate-500">
        Signed in as <span className="text-slate-300">@{user.username}</span> ·{" "}
        <Link href="/profile" className="link">Manage your submissions</Link>
      </p>
    </div>
  );
}
