"use client";

import { useTheme } from "next-themes";
import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export default function TrackSpeedChart({ data = [], height = 260 }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const formattedData = data.map((item) => ({
    ...item,
    label: item.time || item.date || "",
    speedKmh: Number(Number((item.speed || 0) * 1.852).toFixed(2)),
  }));

  return (
    <div className="w-full h-full pt-8">
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />

            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              minTickGap={20}
              angle={-25}
              textAnchor="end"
            />

            <YAxis dataKey="speedKmh" tick={{ fontSize: 10 }} unit=" km/h" />

            <Tooltip
              contentStyle={{
                backgroundColor: isDark ? "#1f2937" : "#ffffff",
                border: isDark ? "1px solid #374151" : "1px solid #e5e7eb",
                borderRadius: "4px",
                padding: "10px 12px",
                boxShadow: isDark
                  ? "0 2px 6px rgba(0,0,0,0.4)"
                  : "0 2px 6px rgba(0,0,0,0.08)",
              }}
              itemStyle={{
                color: isDark ? "#d1d5db" : "#374151",
                fontSize: "12px",
                padding: "2px 0",
              }}
              labelStyle={{
                marginBottom: "6px",
                fontWeight: 600,
                fontSize: "12px",
                color: isDark ? "#f3f4f6" : "#111827",
                borderBottom: isDark
                  ? "1px solid #4b5563"
                  : "1px solid #e5e7eb",
                paddingBottom: "4px",
              }}
              formatter={(value) => [`${value} km/h`, "Speed"]}
              labelFormatter={(label) => `Time: ${label}`}
            />

            {/* <Legend wrapperStyle={{ fontSize: 11 }} /> */}

            <Line
              type="monotone"
              dataKey="speedKmh"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 0 }}
              activeDot={false}
              name="Speed (km/h)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
