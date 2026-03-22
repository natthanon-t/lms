import { useMemo } from "react";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const CELL = 13;
const GAP = 3;
const LEFT_W = 30;
const TOP_H = 20;

export default function LoginActivityHeatmap({ dates }) {
  const loginDateSet = useMemo(() => new Set(dates), [dates]);

  const { weeks, monthLabels, totalWeeks } = useMemo(() => {
    const pad = (n) => String(n).padStart(2, "0");
    const toLocalStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    const year = new Date().getFullYear();
    const jan1 = new Date(year, 0, 1);
    const startDay = new Date(jan1);
    startDay.setDate(jan1.getDate() - jan1.getDay());
    const dec31 = new Date(year, 11, 31);
    const endDay = new Date(dec31);
    endDay.setDate(dec31.getDate() + (6 - dec31.getDay()));
    const numWeeks = Math.round((endDay - startDay) / (7 * 24 * 60 * 60 * 1000)) + 1;

    const todayStr = toLocalStr(new Date());

    const builtWeeks = [];
    for (let w = 0; w < numWeeks; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(startDay);
        date.setDate(startDay.getDate() + w * 7 + d);
        const dateStr = toLocalStr(date);
        const isFuture = dateStr > todayStr;
        week.push({ dateStr, isActive: !isFuture && loginDateSet.has(dateStr), isFuture, dayOfWeek: d });
      }
      builtWeeks.push(week);
    }

    const builtMonthLabels = [];
    for (let w = 0; w < numWeeks; w++) {
      const hit = builtWeeks[w].find(({ dateStr }) => dateStr.slice(8) === "01");
      if (hit) {
        builtMonthLabels.push({ week: w, label: MONTH_NAMES[parseInt(hit.dateStr.slice(5, 7), 10) - 1] });
      }
    }

    return { weeks: builtWeeks, monthLabels: builtMonthLabels, totalWeeks: numWeeks };
  }, [loginDateSet]);

  const svgWidth = LEFT_W + totalWeeks * (CELL + GAP);
  const svgHeight = TOP_H + 7 * (CELL + GAP);

  return (
    <div className="heatmap-scroll">
      <svg width={svgWidth} height={svgHeight} style={{ display: "block" }}>
        {monthLabels.map(({ week, label }) => (
          <text key={`m-${week}`} x={LEFT_W + week * (CELL + GAP)} y={14} fontSize="11" fill="#6b8ab8">
            {label}
          </text>
        ))}
        {DAY_LABELS.map((label, d) =>
          label ? (
            <text key={`d-${d}`} x={LEFT_W - 4} y={TOP_H + d * (CELL + GAP) + CELL - 2} fontSize="11" fill="#6b8ab8" textAnchor="end">
              {label}
            </text>
          ) : null,
        )}
        {weeks.map((week, w) =>
          week.map(({ dateStr, isActive, isFuture, dayOfWeek }) => (
            <rect
              key={dateStr}
              x={LEFT_W + w * (CELL + GAP)}
              y={TOP_H + dayOfWeek * (CELL + GAP)}
              width={CELL}
              height={CELL}
              rx={2}
              fill={isActive ? "#2ea043" : isFuture ? "#f0f2f5" : "#dde3ed"}
            >
              <title>{dateStr}</title>
            </rect>
          )),
        )}
      </svg>
    </div>
  );
}
