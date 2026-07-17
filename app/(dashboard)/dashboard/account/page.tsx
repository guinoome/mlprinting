import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProfileForm } from "@/features/account/components/profile-form";
import { AvatarForm } from "@/features/account/components/avatar-form";
import { PasswordForm } from "@/features/auth/components/password-form";
import { PreferencesForm } from "@/features/account/components/preferences-form";
import { getProfile } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { routes } from "@/lib/config";
import { logger } from "@/lib/logger";
import type { ThemePreference } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Account",
};

/** Defaults matching the Preference model, for a profile with no row yet. */
const DEFAULT_PREFERENCES = {
  theme: "SYSTEM" as ThemePreference,
  emailNotifications: true,
  marketingEmails: false,
};

async function loadPreferences(profileId: string) {
  try {
    const preferences = await prisma.preference.findUnique({
      where: { profileId },
      select: { theme: true, emailNotifications: true, marketingEmails: true },
    });
    return preferences ?? DEFAULT_PREFERENCES;
  } catch (error) {
    // Preferences are not worth failing the whole page over — the profile and
    // password sections are still useful without them.
    logger.report(error, { at: "loadPreferences", profileId });
    return DEFAULT_PREFERENCES;
  }
}

export default async function AccountPage() {
  const profile = await getProfile();
  if (!profile) redirect(routes.login);

  const preferences = await loadPreferences(profile.id);

  return (
    <>
      <PageHeader
        title="Account"
        description="Your profile, password, and preferences."
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard.root },
          { label: "Account" },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile</CardTitle>
            <CardDescription>
              How your name appears across the platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              displayName={profile.displayName}
              email={profile.email}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profile picture</CardTitle>
            <CardDescription>A photo or logo, up to 10 MB.</CardDescription>
          </CardHeader>
          <CardContent>
            <AvatarForm
              avatarUrl={profile.avatarUrl}
              name={profile.displayName?.trim() || profile.email}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Password</CardTitle>
            <CardDescription>
              Change the password you sign in with.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preferences</CardTitle>
            <CardDescription>
              Appearance and what we email you about.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PreferencesForm
              theme={preferences.theme as ThemePreference}
              emailNotifications={preferences.emailNotifications}
              marketingEmails={preferences.marketingEmails}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
