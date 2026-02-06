"use client";

import * as React from "react";
import { CheckIcon, ChevronDown, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const sizeStyles = {
  xs: {
    button: "min-h-7 px-2 text-[10px]",
    badge: "text-[10px] px-1.5 py-0",
    icon: "w-3 h-3",
  },
  sm: {
    button: "min-h-8 px-2 text-xs",
    badge: "text-xs px-2 py-0.5",
    icon: "w-3.5 h-3.5",
  },
  md: {
    button: "min-h-10 px-3 text-sm",
    badge: "text-sm px-2.5 py-0.5",
    icon: "w-4 h-4",
  },
  lg: {
    button: "min-h-12 px-4 text-base",
    badge: "text-base px-3 py-1",
    icon: "w-5 h-5",
  },
};

export function MultiSelect({
  options,
  onValueChange,
  value,
  defaultValue = [],
  placeholder = "Select options",
  searchable = true,
  emptyText = "No results found",
  className,
  closeOnSelect = false,
  hideSelectAll = false,
  maxViewSelected = 1,
  size = "sm",
  disabled = false,
}) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");

  const isGrouped = options.length > 0 && "heading" in options[0];

  const isControlled = value !== undefined;
  const selectedValues = isControlled ? value : internalValue;

  const s = sizeStyles[size] ?? sizeStyles["md"];

  const toggleOption = (value) => {
    if (disabled) return;

    const newValues = selectedValues.includes(value)
      ? selectedValues.filter((v) => v !== value)
      : [...selectedValues, value];

    if (!isControlled) setInternalValue(newValues);
    onValueChange?.(newValues);
    if (closeOnSelect) setIsPopoverOpen(false);
  };

  const clearAll = () => {
    if (disabled) return;

    if (!isControlled) setInternalValue([]);
    onValueChange?.([]);
  };

  const allOptions = React.useMemo(() => {
    if (isGrouped) return options.flatMap((g) => g.options);
    return options;
  }, [options]);

  const toggleAll = () => {
    if (disabled) return;

    if (selectedValues.length === allOptions.length) {
      clearAll();
    } else {
      const all = allOptions.map((o) => o.value);
      if (!isControlled) setInternalValue(all);
      onValueChange?.(all);
    }
  };

  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options;
    const filterFn = (opt) => {
      const label = String(opt.label ?? "").toLowerCase();
      const value = String(opt.value ?? "").toLowerCase();
      const search = searchValue.toLowerCase();

      return label.includes(search) || value.includes(search);
    };

    if (isGrouped) {
      return options
        .map((g) => ({
          ...g,
          options: g.options.filter(filterFn),
        }))
        .filter((g) => g.options.length > 0);
    }
    return options.filter(filterFn);
  }, [options, searchValue]);

  return (
    <Popover
      open={isPopoverOpen && !disabled}
      onOpenChange={(open) => !disabled && setIsPopoverOpen(open)}
      modal={true}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("w-full justify-between", s.button, className)}
        >
          <div className="flex flex-wrap items-start gap-1">
            {selectedValues.length > 0 ? (
              <div className="flex items-center flex-wrap gap-1">
                {/* Ambil hanya maxViewSelected pertama */}
                {selectedValues.slice(0, maxViewSelected).map((value) => {
                  const label =
                    allOptions.find((o) => o.value === value)?.label || value;
                  return (
                    <Badge
                      key={value}
                      className={cn(
                        "flex items-center gap-1",
                        disabled
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer",
                        s.badge
                      )}
                      onClick={(e) => {
                        if (!disabled) {
                          e.stopPropagation();
                          toggleOption(value);
                        }
                      }}
                    >
                      {label}
                      <XCircle className="w-3 h-3" />
                    </Badge>
                  );
                })}

                {/* Jika masih ada sisa selected */}
                {selectedValues.length > maxViewSelected && (
                  <Badge variant="outline" className={s.badge}>
                    +{selectedValues.length - maxViewSelected}
                  </Badge>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground text-xs">
                {placeholder}
              </span>
            )}
          </div>
          <ChevronDown className="w-4 h-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={4}
        className="min-w-[280px] p-0"
        style={{
          zIndex: 9999,
        }}
      >
        <Command className="shadow-md" shouldFilter={false}>
          {searchable && (
            <CommandInput
              placeholder="Search..."
              value={searchValue}
              onValueChange={setSearchValue}
              className="h-9"
            />
          )}

          <CommandList className="max-h-64 overflow-auto">
            <CommandEmpty className="py-6 text-center text-sm">
              {emptyText}
            </CommandEmpty>

            {!hideSelectAll && (
              <CommandGroup className="border-b pb-1">
                <CommandItem
                  onSelect={toggleAll}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <div
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-[4px] border",
                      selectedValues.length === allOptions.length
                        ? "bg-primary border-primary"
                        : "dark:border-white/50 border-black/50"
                    )}
                  >
                    <CheckIcon
                      className={
                        selectedValues.length === allOptions.length
                          ? "text-primary-foreground"
                          : ""
                      }
                    />
                  </div>
                  <span>Select All</span>
                </CommandItem>
              </CommandGroup>
            )}

            {isGrouped ? (
              filteredOptions.map((group) => (
                <CommandGroup
                  key={group.heading}
                  heading={group.heading}
                  className="**:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground"
                >
                  {group.options.map((opt) => {
                    const isSelected = selectedValues.includes(opt.value);
                    return (
                      <CommandItem
                        key={opt.value}
                        value={String(opt.value)}
                        disabled={opt.disabled}
                        onSelect={() => toggleOption(opt.value)}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <div
                          className={cn(
                            "flex h-4 w-4 items-center justify-center rounded-[4px] border",
                            isSelected
                              ? "bg-primary border-primary"
                              : "dark:border-white/50 border-black/50"
                          )}
                        >
                          <CheckIcon
                            className={
                              isSelected ? "text-primary-foreground" : ""
                            }
                          />
                        </div>
                        {opt.label}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              ))
            ) : (
              <CommandGroup>
                {filteredOptions.map((opt) => {
                  const isSelected = selectedValues.includes(opt.value);
                  return (
                    <CommandItem
                      key={opt.value}
                      value={String(opt.value)}
                      disabled={opt.disabled}
                      onSelect={() => toggleOption(opt.value)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded-[4px] border",
                          isSelected
                            ? "bg-primary border-primary"
                            : "dark:border-white/50 border-black/50"
                        )}
                      >
                        <CheckIcon
                          className={
                            isSelected ? "text-primary-foreground" : ""
                          }
                        />
                      </div>
                      {opt.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
            {selectedValues.length > 0 && (
              <CommandGroup className="border-t pt-1">
                <CommandItem
                  onSelect={clearAll}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  Clear All
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
