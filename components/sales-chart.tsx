"use client";

import { useId, useState } from "react";

export type SalesChartPoint = { date: string; revenueCents: number };

// Whole-dollar, no cents: axis ticks and the tooltip want a short label, not
// the $19.99-style precision lib/format.ts's formatPrice() is built for.
function formatWholeDollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

// Rounds a maximum up to a "clean" axis value: the next 1, 2 or 5 times a
// power of ten. 340 -> 500, 1,450 -> 2,000, 60 -> 100. Keeps the gridlines at
// numbers a reader can do mental math with, instead of an arbitrary top value.
function niceCeiling(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const steps = [1, 2, 5, 10];
  const step = steps.find((s) => value <= s * magnitude) ?? 10;
  return step * magnitude;
}

// A short, unambiguous label for a "YYYY-MM-DD" string, without going through
// `new Date("YYYY-MM-DD")` (JavaScript parses that as UTC midnight, then
// formatting it in the browser's local time zone can print the PREVIOUS day
// for anyone west of UTC). Splitting the string avoids that entirely.
const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
function formatDayLabel(isoDate: string): string {
  const [, month, day] = isoDate.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${day}`;
}

// Picks up to `count` indices spread evenly from 0 to lastIndex, always
// including both ends. Not "every Nth index": for 14 days that lands on
// 0, 3, 6, 9, 12 — and 12 sits right next to 13 (always shown), so their
// labels collide. Interpolating the positions directly keeps every gap even.
function evenlySpacedIndices(lastIndex: number, count: number): number[] {
  if (lastIndex === 0) return [0];
  const steps = Math.min(count, lastIndex + 1) - 1;
  const indices = Array.from({ length: steps + 1 }, (_, k) =>
    Math.round((k * lastIndex) / steps),
  );
  return Array.from(new Set(indices));
}

const WIDTH = 600;
const HEIGHT = 220;
const PAD = { top: 28, right: 24, bottom: 28, left: 52 };
const PLOT_WIDTH = WIDTH - PAD.left - PAD.right;
const PLOT_HEIGHT = HEIGHT - PAD.top - PAD.bottom;

// A single-series line chart of daily revenue. One hue (no legend needed: the
// title already says what is plotted), a crosshair + tooltip that follows
// hover AND keyboard focus, and a visually-hidden table carrying the same
// numbers for screen readers — every value the chart shows is also reachable
// without it.
export function SalesChart({ data }: { data: SalesChartPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const gradientId = useId();

  const maxRevenue = Math.max(...data.map((d) => d.revenueCents), 0);
  const axisMax = niceCeiling(maxRevenue || 1);

  const x = (i: number) =>
    PAD.left + (data.length === 1 ? 0 : (i / (data.length - 1)) * PLOT_WIDTH);
  const y = (cents: number) =>
    PAD.top + PLOT_HEIGHT - (cents / axisMax) * PLOT_HEIGHT;

  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(d.revenueCents)}`)
    .join(" ");
  const areaPath = `${linePath} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;

  const lastIndex = data.length - 1;
  const active = hovered ?? lastIndex;
  const activePoint = data[active];
  const xAxisIndices = new Set(evenlySpacedIndices(lastIndex, 6));

  // The day-columns are evenly spaced; a column's width is the gap to its
  // neighbor (half on each side), so hovering or tabbing to ANY point along
  // that gap — not just the exact pixel the line passes through — selects it.
  const columnWidth = data.length > 1 ? PLOT_WIDTH / (data.length - 1) : PLOT_WIDTH;

  const gridTicks = [0, axisMax / 2, axisMax];

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label={`Revenue by day, ${formatDayLabel(data[0].date)} to ${formatDayLabel(data[lastIndex].date)}. See the table below for exact values.`}
        onPointerLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity="0.1" />
            <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Gridlines: hairline, recessive, with clean rounded values. */}
        {gridTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 8}
              y={y(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {formatWholeDollars(tick)}
            </text>
          </g>
        ))}

        {/* A handful of x-axis labels, not all 14 days: at this width, one
            label per day would collide with its neighbors. The first and last
            are anchored to start/end rather than centered, so a wide label
            ("Sep 22") never extends past the chart's edge and gets clipped. */}
        {data.map((d, i) => {
          if (!xAxisIndices.has(i)) return null;
          return (
            <text
              key={d.date}
              x={x(i)}
              y={HEIGHT - 8}
              textAnchor={i === 0 ? "start" : i === lastIndex ? "end" : "middle"}
              className="fill-muted-foreground text-[10px]"
            >
              {formatDayLabel(d.date)}
            </text>
          );
        })}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke="var(--color-chart-1)"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* The crosshair: a vertical hairline at whichever day is active. */}
        <line
          x1={x(active)}
          x2={x(active)}
          y1={PAD.top}
          y2={HEIGHT - PAD.bottom}
          stroke="var(--color-border)"
          strokeWidth={1}
        />
        <circle
          cx={x(active)}
          cy={y(activePoint.revenueCents)}
          r={4}
          fill="var(--color-chart-1)"
          stroke="var(--color-background)"
          strokeWidth={2}
        />

        {/* The value at the end of the line, always shown (not only on
            hover): "lines -> value at the end". Pinned at least this far
            above the baseline, so a value near zero never lands on top of
            the x-axis date label underneath it. */}
        <text
          x={x(lastIndex)}
          y={Math.min(y(data[lastIndex].revenueCents) - 10, HEIGHT - PAD.bottom - 8)}
          textAnchor="end"
          className="fill-foreground text-xs font-medium"
        >
          {formatWholeDollars(data[lastIndex].revenueCents)}
        </text>

        {/* Invisible, focusable hit columns: bigger than the line itself, and
            what makes the crosshair reachable by keyboard, not just a mouse. */}
        {data.map((d, i) => (
          <rect
            key={d.date}
            x={x(i) - columnWidth / 2}
            y={PAD.top}
            width={columnWidth}
            height={PLOT_HEIGHT}
            fill="transparent"
            tabIndex={0}
            aria-label={`${formatDayLabel(d.date)}: ${formatWholeDollars(d.revenueCents)}`}
            onPointerEnter={() => setHovered(i)}
            onFocus={() => setHovered(i)}
            onBlur={() => setHovered(null)}
          />
        ))}
      </svg>

      {/* The tooltip: an HTML element positioned by percentage of the SVG's
          own coordinate space, so it tracks the point correctly at any
          rendered size without measuring pixels on every hover. */}
      {hovered !== null && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap text-popover-foreground shadow-md"
          style={{
            left: `${(x(hovered) / WIDTH) * 100}%`,
            top: `${(y(activePoint.revenueCents) / HEIGHT) * 100 - 4}%`,
          }}
        >
          <p className="font-semibold">{formatWholeDollars(activePoint.revenueCents)}</p>
          <p className="text-muted-foreground">{formatDayLabel(activePoint.date)}</p>
        </div>
      )}

      {/* The same numbers, as a real table: reachable without hovering, and
          what a screen reader announces instead of the SVG. */}
      <table className="sr-only">
        <caption>Revenue by day</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Revenue</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <th scope="row">{formatDayLabel(d.date)}</th>
              <td>{formatWholeDollars(d.revenueCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
