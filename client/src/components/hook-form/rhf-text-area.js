"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function RHFTextArea({
  name,
  label,
  placeholder = "Type your message here...",
  helperText,
  rows = 4,
  className,
}) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className={cn("flex flex-col gap-1", className)}>
          {/* Label */}
          {label && (
            <Label htmlFor={name} className="text-sm font-medium">
              {label}
            </Label>
          )}

          {/* Textarea */}
          <Textarea
            id={name}
            placeholder={placeholder}
            rows={rows}
            value={field.value || ""}
            onChange={field.onChange}
            onBlur={field.onBlur}
            className={cn(
              error
                ? "border-destructive focus-visible:ring-destructive"
                : "border-input focus-visible:ring-ring",
              "resize-y"
            )}
          />

          {/* Error / Helper text */}
          {error ? (
            <p className="text-sm text-destructive">{error.message}</p>
          ) : helperText ? (
            <p className="text-sm text-muted-foreground">{helperText}</p>
          ) : null}
        </div>
      )}
    />
  );
}
