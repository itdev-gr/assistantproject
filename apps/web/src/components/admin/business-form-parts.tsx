'use client';

import { useState } from 'react';
import type { BusinessUpsert } from '@aga/api-contracts';
import { Input, Label } from '@aga/ui';

/**
 * Form pieces shared by the admin BusinessForm and the partner-facing
 * PartnerBusinessForm.
 */

const OPENING_HOURS_DAYS = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
] as const satisfies readonly { key: DayKey; label: string }[];

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type OpeningHoursValue = NonNullable<BusinessUpsert['openingHours']>;
type DayRow = { open: string; close: string; closed: boolean };
type DayRows = Record<DayKey, DayRow>;

function openingHoursToRows(value: OpeningHoursValue | undefined): DayRows {
  const rows = {} as DayRows;
  for (const { key } of OPENING_HOURS_DAYS) {
    const entry = value?.[key];
    if (Array.isArray(entry) && entry.length === 0) {
      rows[key] = { open: '', close: '', closed: true };
    } else if (Array.isArray(entry) && entry.length === 1) {
      rows[key] = { open: entry[0][0], close: entry[0][1], closed: false };
    } else {
      rows[key] = { open: '', close: '', closed: false };
    }
  }
  return rows;
}

function rowsToOpeningHours(rows: DayRows): OpeningHoursValue {
  const value: OpeningHoursValue = {};
  for (const { key } of OPENING_HOURS_DAYS) {
    const row = rows[key];
    if (row.closed) {
      value[key] = [];
    } else if (row.open && row.close) {
      value[key] = [[row.open, row.close]];
    }
    // Otherwise the day is omitted entirely (unknown hours).
  }
  return value;
}

export function OpeningHoursEditor({
  value,
  onChange,
}: {
  value: OpeningHoursValue | undefined;
  onChange: (value: OpeningHoursValue) => void;
}) {
  const [rows, setRows] = useState<DayRows>(() => openingHoursToRows(value));

  function updateRow(day: DayKey, patch: Partial<DayRow>) {
    const nextRows = { ...rows, [day]: { ...rows[day], ...patch } };
    setRows(nextRows);
    onChange(rowsToOpeningHours(nextRows));
  }

  return (
    <div className="border-input space-y-2 rounded-md border p-3">
      {OPENING_HOURS_DAYS.map(({ key, label }) => {
        const row = rows[key];
        return (
          <div key={key} className="grid grid-cols-[96px_1fr_1fr_auto] items-center gap-3">
            <span className="text-sm">{label}</span>
            <Input
              id={`openingHours-${key}-open`}
              type="time"
              value={row.open}
              disabled={row.closed}
              onChange={(e) => updateRow(key, { open: e.target.value })}
            />
            <Input
              id={`openingHours-${key}-close`}
              type="time"
              value={row.close}
              disabled={row.closed}
              onChange={(e) => updateRow(key, { close: e.target.value })}
            />
            <label className="flex items-center gap-1.5 whitespace-nowrap text-xs">
              <input
                type="checkbox"
                checked={row.closed}
                onChange={(e) => updateRow(key, { closed: e.target.checked })}
              />
              Closed
            </label>
          </div>
        );
      })}
    </div>
  );
}

export function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
