"use client";

import * as React from "react";
import { Plus, Trash2, MapPin } from "lucide-react";
import { saveVenueStep } from "../../actions";
import { useAutosave } from "../use-autosave";
import { SaveIndicator } from "../save-indicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Schedule & venue — Ph3.md §4.
 *
 * A list with a kind, because §4 names both Ceremony and Reception. Each venue
 * carries its own time: a 3pm ceremony and a 6pm reception are one event with
 * two clocks, which the single event time on the previous step cannot express.
 */

export interface VenueRow {
  key: string;
  kind: "CEREMONY" | "RECEPTION" | "OTHER";
  name: string;
  address: string;
  mapsUrl: string;
  parkingNotes: string;
  contactName: string;
  contactPhone: string;
  startTime: string;
}

const KINDS = [
  { value: "CEREMONY", label: "Ceremony" },
  { value: "RECEPTION", label: "Reception" },
  { value: "OTHER", label: "Other" },
] as const;

export function VenueStep({
  invitationId,
  initial,
}: {
  invitationId: string;
  initial: VenueRow[];
}) {
  const [venues, setVenues] = React.useState<VenueRow[]>(initial);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {},
  );

  const save = React.useCallback(async () => {
    const formData = new FormData();
    formData.set("invitationId", invitationId);
    formData.set(
      "venues",
      JSON.stringify(
        venues.map((venue) => ({
          kind: venue.kind,
          name: venue.name,
          address: venue.address || undefined,
          mapsUrl: venue.mapsUrl || undefined,
          parkingNotes: venue.parkingNotes || undefined,
          contactName: venue.contactName || undefined,
          contactPhone: venue.contactPhone || undefined,
          startTime: venue.startTime || undefined,
        })),
      ),
    );

    const result = await saveVenueStep({}, formData);
    setFieldErrors(result.fieldErrors ?? {});
    if (result.fieldErrors) return { error: "Some fields need attention." };
    return result;
  }, [invitationId, venues]);

  const autosave = useAutosave({ save });

  function update(index: number, patch: Partial<VenueRow>) {
    setVenues((current) =>
      current.map((venue, i) => (i === index ? { ...venue, ...patch } : venue)),
    );
    autosave.markDirty();
  }

  function add() {
    // Suggest Reception once a Ceremony exists — the usual second venue.
    const kind = venues.some((venue) => venue.kind === "CEREMONY")
      ? "RECEPTION"
      : "CEREMONY";

    setVenues((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        kind,
        name: "",
        address: "",
        mapsUrl: "",
        parkingNotes: "",
        contactName: "",
        contactPhone: "",
        startTime: "",
      },
    ]);
    autosave.markDirty();
  }

  function remove(index: number) {
    setVenues((current) => current.filter((_, i) => i !== index));
    autosave.markDirty();
  }

  const error = (index: number, field: string) =>
    fieldErrors[`venues.${index}.${field}`];

  return (
    <>
      <div className="mb-4 flex justify-end">
        <SaveIndicator autosave={autosave} />
      </div>

      {venues.length === 0 ? (
        <EmptyState
          icon={<MapPin />}
          title="No venues yet"
          description="Add where the event happens. You can add more than one — a ceremony and a reception, for example."
          action={
            <Button type="button" onClick={add}>
              <Plus aria-hidden="true" />
              Add a venue
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {venues.map((venue, index) => (
            <Card key={venue.key}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Venue {index + 1}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    aria-label={`Remove venue ${index + 1}`}
                  >
                    <Trash2 className="text-destructive" />
                  </Button>
                </div>

                <div className="grid gap-4 sm:grid-cols-[10rem_1fr_8rem]">
                  <div className="space-y-2">
                    <Label htmlFor={`kind-${venue.key}`}>Type</Label>
                    <Select
                      id={`kind-${venue.key}`}
                      value={venue.kind}
                      onChange={(event) =>
                        update(index, {
                          kind: event.target.value as VenueRow["kind"],
                        })
                      }
                    >
                      {KINDS.map((kind) => (
                        <option key={kind.value} value={kind.value}>
                          {kind.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`name-${venue.key}`}>Venue name</Label>
                    <Input
                      id={`name-${venue.key}`}
                      value={venue.name}
                      onChange={(event) =>
                        update(index, { name: event.target.value })
                      }
                      placeholder="Santo Niño Basilica"
                      aria-invalid={error(index, "name") ? true : undefined}
                    />
                    {error(index, "name") ? (
                      <p
                        role="alert"
                        className="text-xs font-medium text-destructive"
                      >
                        {error(index, "name")}
                      </p>
                    ) : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`time-${venue.key}`}>Time</Label>
                    <Input
                      id={`time-${venue.key}`}
                      type="time"
                      value={venue.startTime}
                      onChange={(event) =>
                        update(index, { startTime: event.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`address-${venue.key}`}>
                    Complete address
                  </Label>
                  <Textarea
                    id={`address-${venue.key}`}
                    value={venue.address}
                    onChange={(event) =>
                      update(index, { address: event.target.value })
                    }
                    rows={2}
                    placeholder="Osmeña Blvd, Cebu City, 6000 Cebu"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`maps-${venue.key}`}>Google Maps link</Label>
                  <Input
                    id={`maps-${venue.key}`}
                    type="url"
                    value={venue.mapsUrl}
                    onChange={(event) =>
                      update(index, { mapsUrl: event.target.value })
                    }
                    placeholder="https://maps.app.goo.gl/…"
                    aria-invalid={error(index, "mapsUrl") ? true : undefined}
                  />
                  {error(index, "mapsUrl") ? (
                    <p
                      role="alert"
                      className="text-xs font-medium text-destructive"
                    >
                      {error(index, "mapsUrl")}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Open the venue in Google Maps, tap Share, and paste the
                      link.
                    </p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor={`contact-${venue.key}`}>Contact name</Label>
                    <Input
                      id={`contact-${venue.key}`}
                      value={venue.contactName}
                      onChange={(event) =>
                        update(index, { contactName: event.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`phone-${venue.key}`}>Contact number</Label>
                    <Input
                      id={`phone-${venue.key}`}
                      type="tel"
                      value={venue.contactPhone}
                      onChange={(event) =>
                        update(index, { contactPhone: event.target.value })
                      }
                      placeholder="+63 32 000 0000"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`parking-${venue.key}`}>Parking notes</Label>
                  <Textarea
                    id={`parking-${venue.key}`}
                    value={venue.parkingNotes}
                    onChange={(event) =>
                      update(index, { parkingNotes: event.target.value })
                    }
                    rows={2}
                    placeholder="Parking available at the basement level."
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          <Button type="button" variant="outline" onClick={add}>
            <Plus aria-hidden="true" />
            Add another venue
          </Button>
        </div>
      )}
    </>
  );
}
