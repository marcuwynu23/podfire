import { redirect } from "next/navigation";

export default function TraefikRedirect() {
  redirect("/dashboard/gateway");
}
