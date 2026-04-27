"use client";

import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

type Point = { date: string; followers: number };

export function FollowerChart({ data }: { data: Point[] }) {
  if (data.length === 0) {
    return (
      <div className="text-sm text-ink-400 py-12 text-center">
        No follower snapshots yet.
      </div>
    );
  }
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="follow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fd1d1d" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#fd1d1d" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(v) =>
              new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            }
            stroke="rgba(255,255,255,0.25)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="rgba(255,255,255,0.25)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            width={42}
          />
          <Tooltip
            contentStyle={{
              background: "rgba(15,15,13,0.95)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(v) => new Date(v as string).toLocaleDateString()}
          />
          <Area
            type="monotone"
            dataKey="followers"
            stroke="#fd1d1d"
            strokeWidth={1.5}
            fill="url(#follow)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
