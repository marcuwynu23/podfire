"use client";

import { UserProfileSettings } from "./user-profile/UserProfileSettings";
import { ThemeSettings } from "./theme/ThemeSettings";

type User = {
  id: string;
  email: string | null;
  githubId: string | null;
  githubLogin: string | null;
};

export function SettingsForm({ user }: { user: User }) {
  return (
    <div className="space-y-8">
      <UserProfileSettings user={user} />
      <ThemeSettings />
    </div>
  );
}
