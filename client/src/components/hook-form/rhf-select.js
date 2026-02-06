"use client";

import * as React from "react";
import { Controller, useFormContext } from "react-hook-form";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function RHFSelect({
  name,
  label,
  placeholder = "Select an option",
  helperText,
  className,
  options,
  customChange,
  onChange,
}) {
  const { control } = useFormContext();

  // Buat unique group list (jika ada)
  const grouped = React.useMemo(() => {
    const groups = options.reduce((acc, option) => {
      const group = option.group || "default";
      if (!acc[group]) acc[group] = [];
      acc[group].push(option);
      return acc;
    }, {});
    return groups;
  }, [options]);

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

          <Select
            value={field.value || ""}
            onValueChange={(val) => {
              if (onChange) onChange(val);

              field.onChange(val);
              customChange?.(val);
            }}
          >
            <SelectTrigger
              id={name}
              className={cn(
                "w-full",
                error ? "border-destructive focus-visible:ring-destructive" : ""
              )}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>

            <SelectContent>
              {Object.entries(grouped).map(([groupName, groupOptions]) => (
                <SelectGroup key={groupName}>
                  {groupName !== "default" && (
                    <SelectLabel>{groupName}</SelectLabel>
                  )}
                  {groupOptions.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>

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
