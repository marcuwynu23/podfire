import { redirect } from "next/navigation";

export default async function ServicesIdRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/apps/${id}`);
}
