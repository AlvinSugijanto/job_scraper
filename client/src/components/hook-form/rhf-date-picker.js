"use client";

import * as React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { fDate } from "@/utils/format-time";

// --- helpers

function isValidDate(date) {
  return date instanceof Date && !isNaN(date.getTime());
}

export default function RHFDatePicker({
  name,
  label,
  placeholder = "Select a date",
  helperText,
  className,
  propsEndInput,
}) {
  const { control } = useFormContext();
  const [open, setOpen] = React.useState(false);
  const [month, setMonth] = React.useState(new Date());

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        // convert value ke Date jika ada
        const currentDate = field.value ? new Date(field.value) : undefined;
        const value = fDate(currentDate);

        return (
          <div className={cn("flex flex-col gap-1", className)}>
            {label && (
              <Label htmlFor={name} className="text-sm font-medium">
                {label}
              </Label>
            )}

            <div className="relative flex gap-2">
              {/* Input manual */}
              <Input
                id={name}
                value={value}
                placeholder={placeholder}
                className={cn(
                  "bg-background pr-10 w-full",
                  error
                    ? "border-destructive focus-visible:ring-destructive"
                    : ""
                )}
                onChange={(e) => {
                  const date = new Date(e.target.value);
                  if (isValidDate(date)) {
                    field.onChange(date.toISOString());
                    setMonth(date);
                  } else {
                    field.onChange("");
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setOpen(true);
                  }
                }}
              />

              {/* Calendar popover */}
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                  >
                    <CalendarIcon className="size-3.5" />
                    <span className="sr-only">Select date</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto overflow-hidden p-0"
                  align="end"
                  alignOffset={-8}
                  sideOffset={10}
                >
                  <Calendar
                    mode="single"
                    selected={currentDate}
                    captionLayout="dropdown"
                    month={month}
                    fromYear={2000}
                    toYear={2035}
                    onMonthChange={setMonth}
                    onSelect={(date) => {
                      field.onChange(date ? date.toISOString() : "");
                      setOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>

              {propsEndInput}
            </div>

            {/* helper / error message */}
            {error ? (
              <p className="text-sm text-destructive">{error.message}</p>
            ) : helperText ? (
              <p className="text-sm text-muted-foreground">{helperText}</p>
            ) : null}
          </div>
        );
      }}
    />
  );
}
