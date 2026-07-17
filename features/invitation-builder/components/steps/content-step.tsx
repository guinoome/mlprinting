"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { saveContentStep } from "../../actions";
import { useAutosave } from "../use-autosave";
import { SaveIndicator } from "../save-indicator";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * Invitation content — Ph3.md §5.
 *
 * Plain fields only. §5 says "No free-form HTML editing", and this is where that
 * is honoured: a rich-text editor here would produce markup the PDF generator
 * (Ph6) cannot lay out and a future mobile app cannot render — the exact
 * coupling §12 exists to prevent.
 *
 * Character counters are visible rather than enforced only on submit: §9 asks
 * for character limits, and a limit you discover after writing 900 words is a
 * punishment, not a guide.
 */

export interface PersonRow {
  key: string;
  group: "PARENT" | "SPONSOR";
  name: string;
  role: string;
}

export interface ProgramRow {
  key: string;
  time: string;
  title: string;
  description: string;
}

export interface ContentValues {
  welcomeMessage: string;
  invitationMessage: string;
  giftsPreference: string;
  specialNotes: string;
  closingMessage: string;
}

/** Mirrors the limits in schema.ts. */
const LIMITS: Record<keyof ContentValues, number> = {
  welcomeMessage: 500,
  invitationMessage: 1200,
  giftsPreference: 500,
  specialNotes: 800,
  closingMessage: 300,
};

function CountedField({
  id,
  label,
  hint,
  value,
  limit,
  rows,
  placeholder,
  error,
  onChange,
}: {
  id: keyof ContentValues;
  label: string;
  hint?: string;
  value: string;
  limit: number;
  rows: number;
  placeholder?: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const over = value.length > limit;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        <span
          className={`text-xs tabular-nums ${over ? "font-medium text-destructive" : "text-muted-foreground"}`}
        >
          {value.length}/{limit}
        </span>
      </div>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        aria-invalid={over || error ? true : undefined}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
      {error ? (
        <p role="alert" className="text-xs font-medium text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function ContentStep({
  invitationId,
  initialContent,
  initialPeople,
  initialProgram,
}: {
  invitationId: string;
  initialContent: ContentValues;
  initialPeople: PersonRow[];
  initialProgram: ProgramRow[];
}) {
  const [content, setContent] = React.useState(initialContent);
  const [people, setPeople] = React.useState(initialPeople);
  const [program, setProgram] = React.useState(initialProgram);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {},
  );

  const save = React.useCallback(async () => {
    const formData = new FormData();
    formData.set("invitationId", invitationId);
    for (const [key, value] of Object.entries(content))
      formData.set(key, value);
    formData.set(
      "people",
      JSON.stringify(
        people
          .filter((person) => person.name.trim())
          .map((person) => ({
            group: person.group,
            name: person.name,
            role: person.role || undefined,
          })),
      ),
    );
    formData.set(
      "program",
      JSON.stringify(
        program
          .filter((item) => item.title.trim())
          .map((item) => ({
            time: item.time || undefined,
            title: item.title,
            description: item.description || undefined,
          })),
      ),
    );

    const result = await saveContentStep({}, formData);
    setFieldErrors(result.fieldErrors ?? {});
    if (result.fieldErrors) return { error: "Some fields need attention." };
    return result;
  }, [invitationId, content, people, program]);

  const autosave = useAutosave({ save });

  function setField(key: keyof ContentValues, value: string) {
    setContent((current) => ({ ...current, [key]: value }));
    autosave.markDirty();
  }

  function addPerson(group: PersonRow["group"]) {
    setPeople((current) => [
      ...current,
      { key: crypto.randomUUID(), group, name: "", role: "" },
    ]);
    autosave.markDirty();
  }

  function updatePerson(key: string, patch: Partial<PersonRow>) {
    setPeople((current) =>
      current.map((p) => (p.key === key ? { ...p, ...patch } : p)),
    );
    autosave.markDirty();
  }

  function removePerson(key: string) {
    setPeople((current) => current.filter((p) => p.key !== key));
    autosave.markDirty();
  }

  const parents = people.filter((p) => p.group === "PARENT");
  const sponsors = people.filter((p) => p.group === "SPONSOR");

  function PersonList({
    group,
    rows,
    label,
  }: {
    group: PersonRow["group"];
    rows: PersonRow[];
    label: string;
  }) {
    return (
      <div className="space-y-3">
        {rows.map((person) => (
          <div key={person.key} className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor={`name-${person.key}`} className="sr-only">
                {label} name
              </Label>
              <Input
                id={`name-${person.key}`}
                value={person.name}
                onChange={(event) =>
                  updatePerson(person.key, { name: event.target.value })
                }
                placeholder="Full name"
              />
            </div>
            <div className="w-44 space-y-2">
              <Label htmlFor={`role-${person.key}`} className="sr-only">
                {label} role
              </Label>
              <Input
                id={`role-${person.key}`}
                value={person.role}
                onChange={(event) =>
                  updatePerson(person.key, { role: event.target.value })
                }
                placeholder="Role (optional)"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removePerson(person.key)}
              aria-label={`Remove ${person.name || label}`}
            >
              <Trash2 className="text-destructive" />
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addPerson(group)}
        >
          <Plus aria-hidden="true" />
          Add {label.toLowerCase()}
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <SaveIndicator autosave={autosave} />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Messages</CardTitle>
            <CardDescription>
              The words guests read. Plain text — the design handles the rest.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <CountedField
              id="welcomeMessage"
              label="Welcome message"
              value={content.welcomeMessage}
              limit={LIMITS.welcomeMessage}
              rows={2}
              placeholder="Together with their families…"
              error={fieldErrors.welcomeMessage}
              onChange={(value) => setField("welcomeMessage", value)}
            />
            <CountedField
              id="invitationMessage"
              label="Invitation message"
              hint="The main body of the invitation."
              value={content.invitationMessage}
              limit={LIMITS.invitationMessage}
              rows={5}
              placeholder="request the honour of your presence…"
              error={fieldErrors.invitationMessage}
              onChange={(value) => setField("invitationMessage", value)}
            />
            <CountedField
              id="closingMessage"
              label="Closing message"
              value={content.closingMessage}
              limit={LIMITS.closingMessage}
              rows={2}
              placeholder="We cannot wait to celebrate with you."
              error={fieldErrors.closingMessage}
              onChange={(value) => setField("closingMessage", value)}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parents</CardTitle>
            <CardDescription>
              Named on the invitation, in the order you add them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PersonList group="PARENT" rows={parents} label="Parent" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Principal sponsors</CardTitle>
            <CardDescription>
              Ninong and ninang, if your event has them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PersonList group="SPONSOR" rows={sponsors} label="Sponsor" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Programme</CardTitle>
            <CardDescription>
              The order of events, if you want to show one.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {program.map((item, index) => (
              <div key={item.key} className="flex items-end gap-2">
                <div className="w-28 space-y-2">
                  <Label htmlFor={`ptime-${item.key}`} className="sr-only">
                    Time
                  </Label>
                  <Input
                    id={`ptime-${item.key}`}
                    type="time"
                    value={item.time}
                    onChange={(event) => {
                      setProgram((current) =>
                        current.map((p) =>
                          p.key === item.key
                            ? { ...p, time: event.target.value }
                            : p,
                        ),
                      );
                      autosave.markDirty();
                    }}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`ptitle-${item.key}`} className="sr-only">
                    What happens
                  </Label>
                  <Input
                    id={`ptitle-${item.key}`}
                    value={item.title}
                    onChange={(event) => {
                      setProgram((current) =>
                        current.map((p) =>
                          p.key === item.key
                            ? { ...p, title: event.target.value }
                            : p,
                        ),
                      );
                      autosave.markDirty();
                    }}
                    placeholder="Ceremony"
                    aria-invalid={
                      fieldErrors[`program.${index}.title`] ? true : undefined
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setProgram((current) =>
                      current.filter((p) => p.key !== item.key),
                    );
                    autosave.markDirty();
                  }}
                  aria-label={`Remove ${item.title || "programme item"}`}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setProgram((current) => [
                  ...current,
                  {
                    key: crypto.randomUUID(),
                    time: "",
                    title: "",
                    description: "",
                  },
                ]);
                autosave.markDirty();
              }}
            >
              <Plus aria-hidden="true" />
              Add programme item
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Gifts and notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <CountedField
              id="giftsPreference"
              label="Gift preference"
              value={content.giftsPreference}
              limit={LIMITS.giftsPreference}
              rows={3}
              placeholder="Your presence is the only gift we ask for."
              error={fieldErrors.giftsPreference}
              onChange={(value) => setField("giftsPreference", value)}
            />
            <CountedField
              id="specialNotes"
              label="Special notes"
              value={content.specialNotes}
              limit={LIMITS.specialNotes}
              rows={3}
              placeholder="Anything else guests should know."
              error={fieldErrors.specialNotes}
              onChange={(value) => setField("specialNotes", value)}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
