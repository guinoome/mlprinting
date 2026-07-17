"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { updatePreferences } from "../actions";
import type { ActionState } from "@/features/auth/actions";
import { SubmitButton } from "@/features/auth/components/submit-button";
import { FormStatus } from "@/features/auth/components/form-status";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { applyTheme, type ThemePreference } from "@/lib/theme";

const initialState: ActionState = {};

const THEMES: { value: ThemePreference; label: string }[] = [
  { value: "LIGHT", label: "Light" },
  { value: "DARK", label: "Dark" },
  { value: "SYSTEM", label: "System" },
];

/**
 * Basic preferences — Ph1.md §5.
 *
 * The theme applies the moment it is picked, before the form is submitted:
 * a theme choice you cannot see until you save is a choice made blind. The
 * submit is what makes it persist across devices.
 */
export function PreferencesForm({
  theme,
  emailNotifications,
  marketingEmails,
}: {
  theme: ThemePreference;
  emailNotifications: boolean;
  marketingEmails: boolean;
}) {
  const [state, formAction] = useFormState(updatePreferences, initialState);
  const [selectedTheme, setSelectedTheme] =
    React.useState<ThemePreference>(theme);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <FormStatus state={state} />

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Theme</legend>
        <div className="flex flex-wrap gap-2">
          {THEMES.map(({ value, label }) => (
            <label
              key={value}
              className={`cursor-pointer rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                selectedTheme === value
                  ? "border-foreground bg-muted"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <input
                type="radio"
                name="theme"
                value={value}
                checked={selectedTheme === value}
                onChange={() => {
                  setSelectedTheme(value);
                  applyTheme(value);
                }}
                className="sr-only"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="emailNotifications">Email notifications</Label>
            <p className="text-xs text-muted-foreground">
              Updates about your events, orders, and approvals.
            </p>
          </div>
          <Switch
            id="emailNotifications"
            name="emailNotifications"
            defaultChecked={emailNotifications}
          />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="marketingEmails">Marketing emails</Label>
            <p className="text-xs text-muted-foreground">
              Offers and new templates from ML Printing. Off unless you ask.
            </p>
          </div>
          <Switch
            id="marketingEmails"
            name="marketingEmails"
            defaultChecked={marketingEmails}
          />
        </div>
      </div>

      <SubmitButton pendingLabel="Saving…">Save preferences</SubmitButton>
    </form>
  );
}
