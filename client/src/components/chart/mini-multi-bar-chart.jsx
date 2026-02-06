"use client";

import React from "react";
import { BarChart, Bar, ResponsiveContainer } from "recharts";

const defaultColors = {
  alpha: "#3B82F6", // blue
  beta: "#6366F1", // indigo
  gamma: "#8B5CF6", // violet
  delta: "#06B6D4", // cyan
};

export default function MiniMultiBarChart({ colors = defaultColors }) {
  const data = [
    { name: "Jan", alpha: 4000, beta: 3000, gamma: 2400, delta: 2800 },
    { name: "Feb", alpha: 3500, beta: 2500, gamma: 3200, delta: 2100 },
    { name: "Mar", alpha: 2000, beta: 1800, gamma: 1500, delta: 2700 },
    { name: "Apr", alpha: 2780, beta: 3900, gamma: 2000, delta: 3100 },
    { name: "May", alpha: 4890, beta: 3000, gamma: 4200, delta: 3300 },
    { name: "Jun", alpha: 2390, beta: 3800, gamma: 2900, delta: 2600 },
    { name: "Jul", alpha: 3490, beta: 4300, gamma: 3600, delta: 3900 },
    { name: "Aug", alpha: 4100, beta: 3700, gamma: 4500, delta: 3400 },
    { name: "Sep", alpha: 2900, beta: 3100, gamma: 2800, delta: 3000 },
    { name: "Oct", alpha: 4200, beta: 4500, gamma: 4000, delta: 3700 },
  ];

  return (
    <div className="w-full h-[180px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          barGap={4}
          margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
        >
          {/* ❌ No CartesianGrid, XAxis, or YAxis */}
          <Bar
            dataKey="alpha"
            fill={colors.alpha}
            radius={[4, 4, 0, 0]}
            barSize={6}
          />
          <Bar
            dataKey="beta"
            fill={colors.beta}
            radius={[4, 4, 0, 0]}
            barSize={6}
          />
          <Bar
            dataKey="gamma"
            fill={colors.gamma}
            radius={[4, 4, 0, 0]}
            barSize={6}
          />
          <Bar
            dataKey="delta"
            fill={colors.delta}
            radius={[4, 4, 0, 0]}
            barSize={6}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
