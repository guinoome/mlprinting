"use client";

import * as React from "react";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { saveHostsStep } from "../../actions";
import { useAutosave } from "../use-autosave";
import { SaveIndicator } from "../save-indicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";
import { hostTypesFor } from "@/lib/config/host-types";

/**
 * Hosts — Ph3.md §3.
 *
 * A list, because §3's examples run from "Bride & Groom" to "Company". The host
 * types offered follow the event type (see lib/config/host-types.ts): asking a
 * birthday customer to pick between Bride and Groom is the sort of thing that
 * makes a guided interview feel like a form.
 */

export interface HostRow {
  /** Client-side key. Not the database id — an unsaved row has none. */
  key: string;
  role: string;
  displayName: string;
  biography: string;
}

export function HostsStep({
  invitationId,
  initial,
  eventType,
}: {
  invitationId: string;
  initial: HostRow[];
  eventType: string | null;
}) {
  const presets = hostTypesFor(eventType);
  const [hosts, setHosts] = React.useState<HostRow[]>(initial);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {},
  );

  const save = React.useCallback(async () => {
    const formData = new FormData();
    formData.set("invitationId", invitationId);
    formData.set(
      "hosts",
      JSON.stringify(
        hosts.map((host) => ({
          role: host.role,
          displayName: host.displayName,
          biography: host.biography || undefined,
        })),
      ),
    );

    const result = await saveHostsStep({}, formData);
    setFieldErrors(result.fieldErrors ?? {});
    if (result.fieldErrors) return { error: "Some fields need attention." };
    return result;
  }, [invitationId, hosts]);

  const autosave = useAutosave({ save });

  function update(index: number, patch: Partial<HostRow>) {
    setHosts((current) =>
      current.map((host, i) => (i === index ? { ...host, ...patch } : host)),
    );
    autosave.markDirty();
  }

  function add() {
    const suggested = presets.find((preset) => preset.suggested) ?? presets[0]!;
    // Offer the second suggested type for the second host: a wedding's first
    // host is the Bride and its second is almost never another Bride.
    const alreadyUsed = new Set(hosts.map((host) => host.role));
    const next =
      presets.find(
        (preset) => preset.suggested && !alreadyUsed.has(preset.slug),
      ) ?? suggested;

    setHosts((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        role: next.slug,
        displayName: "",
        biography: "",
      },
    ]);
    autosave.markDirty();
  }

  function remove(index: number) {
    setHosts((current) => current.filter((_, i) => i !== index));
    autosave.markDirty();
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= hosts.length) return;

    setHosts((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
    autosave.markDirty();
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <SaveIndicator autosave={autosave} />
      </div>

      {hosts.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No hosts yet"
          description="Add the person or people the event is for."
          action={
            <Button type="button" onClick={add}>
              <Plus aria-hidden="true" />
              Add a host
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {hosts.map((host, index) => (
            <Card key={host.key}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <GripVertical className="size-4" aria-hidden="true" />
                    <span className="text-xs font-medium">
                      Host {index + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Buttons rather than drag-and-drop: keyboard-operable by
                        default, and two hosts do not need a drag surface. */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`Move host ${index + 1} up`}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => move(index, 1)}
                      disabled={index === hosts.length - 1}
                      aria-label={`Move host ${index + 1} down`}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      aria-label={`Remove host ${index + 1}`}
                    >
                      <Trash2 className="text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
                  <div className="space-y-2">
                    <Label htmlFor={`role-${host.key}`}>Type</Label>
                    <Select
                      id={`role-${host.key}`}
                      value={host.role}
                      onChange={(event) =>
                        update(index, { role: event.target.value })
                      }
                    >
                      {presets.map((preset) => (
                        <option key={preset.slug} value={preset.slug}>
                          {preset.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`name-${host.key}`}>Display name</Label>
                    <Input
                      id={`name-${host.key}`}
                      value={host.displayName}
                      onChange={(event) =>
                        update(index, { displayName: event.target.value })
                      }
                      placeholder="Maria Santos"
                      aria-invalid={
                        fieldErrors[`hosts.${index}.displayName`]
                          ? true
                          : undefined
                      }
                    />
                    {fieldErrors[`hosts.${index}.displayName`] ? (
                      <p
                        role="alert"
                        className="text-xs font-medium text-destructive"
                      >
                        {fieldErrors[`hosts.${index}.displayName`]}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`bio-${host.key}`}>Short biography</Label>
                  <textarea
                    id={`bio-${host.key}`}
                    value={host.biography}
                    onChange={(event) =>
                      update(index, { biography: event.target.value })
                    }
                    rows={2}
                    placeholder="Optional — a line or two for the website."
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          <Button type="button" variant="outline" onClick={add}>
            <Plus aria-hidden="true" />
            Add another host
          </Button>
        </div>
      )}
    </>
  );
}
