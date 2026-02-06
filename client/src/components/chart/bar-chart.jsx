"use client";

import React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export default function BarChartComponents({
  title,
  subtitle,
  data = [],
  footer,
}) {
  // Flatten nested array
  const flatData = data.flat();

  const formatXAxis = (tickItem) => {
    // Batasi panjang karakter pada sumbu X
    if (tickItem.length > 9) {
      return tickItem.slice(0, 9) + "...";
    }
    return tickItem;
  };

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>

      <CardContent>
        <ChartContainer className="aspect-auto h-[250px] w-full" config={{}}>
          <BarChart data={flatData} accessibilityLayer>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />

            <YAxis
              axisLine={false}
              tickLine={false}
              tickMargin={4}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            />

            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tick={{
                fontSize: 8,
                fontWeight: 600,
                fill: "hsl(var(--muted-foreground))",
              }}
              tickFormatter={formatXAxis}
            />

            {/* ✅ Custom tooltip agar tampil nama project */}
            <ChartTooltip
              cursor={false}
              content={({ active, payload }) => {
                if (active && payload?.length) {
                  const item = payload[0].payload;
                  return (
                    <div className="rounded-md border bg-background p-2 shadow-sm">
                      <div className="flex items-center gap-2">
                        {/* Warna bullet dari data */}
                        <span
                          className="size-3 rounded-sm"
                          style={{
                            backgroundColor: item.color || "var(--primary)",
                          }}
                        />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="text-muted-foreground text-xs mt-1">
                        {item.value} points
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Bar dataKey="value" radius={8}>
              {flatData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || "var(--primary)"}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>

      {footer && (
        <CardFooter className="flex-col items-start gap-2 text-sm">
          {footer}
        </CardFooter>
      )}
    </Card>
  );
}
