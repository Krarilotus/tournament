// app/(public-tournament)/[slug]/(public-control-panel)/page.tsx
import { redirect } from "next/navigation";

export default async function PublicTournamentIndex({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/${slug}/standings`);
}
