import { redirect } from "next/navigation";

export default function ServicesNewRedirect() {
  redirect("/dashboard/apps/new");
}
