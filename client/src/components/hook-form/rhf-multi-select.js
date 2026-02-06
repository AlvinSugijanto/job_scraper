"use client";

import React from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MultiSelect } from "@/components/ui/multi-select"; // ✅ pastikan path sesuai projek kamu

/**
 * Reusable RHF wrapper for MultiSelect
 */
export default function RHFMultiSelect({
  name,
  label,
  helperText,
  options,
  placeholder = "Select options",
  className,
  variant = "default",
  disabled = false,
  ...rest
}) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, value }, fieldState: { error } }) => (
        <div className={cn("flex flex-col gap-1", className)}>
          {label && (
            <Label htmlFor={name} className="text-sm font-medium">
              {label}
            </Label>
          )}

          <MultiSelect
            options={options}
            onValueChange={onChange}
            value={value || []}
            placeholder={placeholder}
            variant={variant}
            disabled={disabled}
            className="h-fit"
            {...rest}
          />

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
