"use client";

import { useFormContext, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import { cn } from "@/utils/cn";

export function RHFInput({
  name,
  label,
  description,
  className,
  inputClassName,
  disabled,
  ...other
}) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <Field data-invalid={!!error} className={className}>
          {label && <FieldLabel htmlFor={name}>{label}</FieldLabel>}
          <Input
            id={name}
            aria-invalid={!!error}
            disabled={disabled}
            className={inputClassName}
            {...field}
            {...other}
          />
          {description && !error && (
            <FieldDescription>{description}</FieldDescription>
          )}
          {error && <FieldError>{error.message}</FieldError>}
        </Field>
      )}
    />
  );
}

export function RHFTextarea({
  name,
  label,
  description,
  className,
  disabled,
  ...other
}) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <Field data-invalid={!!error} className={className}>
          {label && <FieldLabel htmlFor={name}>{label}</FieldLabel>}
          <Textarea
            id={name}
            aria-invalid={!!error}
            disabled={disabled}
            {...field}
            {...other}
          />
          {description && !error && (
            <FieldDescription>{description}</FieldDescription>
          )}
          {error && <FieldError>{error.message}</FieldError>}
        </Field>
      )}
    />
  );
}

export function RHFSelect({
  name,
  label,
  description,
  children,
  placeholder,
  className,
  disabled,
  ...other
}) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <Field data-invalid={!!error} className={className}>
          {label && <FieldLabel>{label}</FieldLabel>}
          <Select
            onValueChange={field.onChange}
            value={field.value}
            defaultValue={field.value}
            disabled={disabled}
            {...other}
          >
            <SelectTrigger aria-invalid={!!error}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>{children}</SelectContent>
          </Select>
          {description && !error && (
            <FieldDescription>{description}</FieldDescription>
          )}
          {error && <FieldError>{error.message}</FieldError>}
        </Field>
      )}
    />
  );
}

export function RHFCheckbox({
  name,
  label,
  description,
  className,
  disabled,
  ...other
}) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <Field
          orientation="horizontal"
          data-invalid={!!error}
          className={cn("items-center gap-2", className)}
        >
          <Checkbox
            id={name}
            checked={field.value}
            onCheckedChange={field.onChange}
            disabled={disabled}
            {...other}
          />
          <div className="grid gap-1.5 leading-none">
            {label && (
              <FieldLabel htmlFor={name} className="font-normal cursor-pointer">
                {label}
              </FieldLabel>
            )}
            {description && !error && (
              <FieldDescription>{description}</FieldDescription>
            )}
            {error && <FieldError>{error.message}</FieldError>}
          </div>
        </Field>
      )}
    />
  );
}
