"use client";

import { Controller, useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function RHFInput({
  name,
  label,
  type = "text",
  placeholder,
  helperText,
  customChange,
  className,
  propsEndInput,
  disabled = false,
}) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <div className={cn("flex flex-col gap-1", className)}>
          {label && (
            <Label htmlFor={name} className="text-sm font-medium">
              {label}
            </Label>
          )}

          <div className="relative">
            <Input
              id={name}
              type={type}
              placeholder={placeholder}
              value={type === "number" && field.value === 0 ? "" : field.value}
              onChange={(e) => {
                const value =
                  type === "number" ? Number(e.target.value) : e.target.value;
                field.onChange(value);
                customChange?.(value);
              }}
              onWheel={(e) => e.currentTarget.blur()} // untuk mencegah scroll ubah nilai number
              disabled={disabled}
              className={cn(
                error
                  ? "border-destructive focus-visible:ring-destructive"
                  : "",
                "w-full"
              )}
            />

            {propsEndInput}
          </div>

          {/* error message */}
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
