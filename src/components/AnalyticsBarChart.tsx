import type { MinuteBucket } from "@/lib/analytics";

const SERIES = [
  { key: "visits" as const, label: "Visits", color: "#2a78d6" },
  { key: "pageViews" as const, label: "Page views", color: "#eb6834" },
  { key: "plays" as const, label: "Plays", color: "#1baf7a" },
];

const WIDTH = 720;
const HEIGHT = 260;
const PADDING_LEFT = 32;
const PADDING_BOTTOM = 28;
const PADDING_TOP = 16;
const PADDING_RIGHT = 12;

export default function AnalyticsBarChart({ buckets }: { buckets: MinuteBucket[] }) {
  const maxValue = Math.max(1, ...buckets.flatMap((b) => [b.visits, b.pageViews, b.plays]));
  const plotWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const groupWidth = plotWidth / buckets.length;
  const barGap = 3;
  const barWidth = (groupWidth - barGap * (SERIES.length + 1)) / SERIES.length;

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Visits, page views and plays over the last 30 minutes">
        {gridLines.map((frac) => {
          const y = PADDING_TOP + plotHeight * (1 - frac);
          return (
            <line
              key={frac}
              x1={PADDING_LEFT}
              x2={WIDTH - PADDING_RIGHT}
              y1={y}
              y2={y}
              stroke="#e1e0d9"
              strokeWidth={1}
            />
          );
        })}
        <line
          x1={PADDING_LEFT}
          x2={WIDTH - PADDING_RIGHT}
          y1={PADDING_TOP + plotHeight}
          y2={PADDING_TOP + plotHeight}
          stroke="#c3c2b7"
          strokeWidth={1}
        />

        {buckets.map((bucket, groupIndex) => {
          const groupX = PADDING_LEFT + groupIndex * groupWidth;
          return (
            <g key={bucket.label}>
              {SERIES.map((series, seriesIndex) => {
                const value = bucket[series.key];
                const barHeight = (value / maxValue) * plotHeight;
                const x = groupX + barGap + seriesIndex * (barWidth + barGap);
                const y = PADDING_TOP + plotHeight - barHeight;

                return (
                  <g key={series.key}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(barHeight, value > 0 ? 2 : 0)}
                      rx={2}
                      fill={series.color}
                    >
                      <title>
                        {series.label} at {bucket.label}: {value}
                      </title>
                    </rect>
                    {value > 0 && (
                      <text
                        x={x + barWidth / 2}
                        y={y - 4}
                        textAnchor="middle"
                        fontSize="9"
                        fill="#52514e"
                      >
                        {value}
                      </text>
                    )}
                  </g>
                );
              })}
              <text
                x={groupX + groupWidth / 2}
                y={PADDING_TOP + plotHeight + 16}
                textAnchor="middle"
                fontSize="10"
                fill="#898781"
              >
                {bucket.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex gap-4 text-xs text-gray-600">
        {SERIES.map((series) => (
          <span key={series.key} className="flex items-center gap-1">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: series.color }}
            />
            {series.label}
          </span>
        ))}
      </div>
    </div>
  );
}
