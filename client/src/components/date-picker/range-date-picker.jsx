import { useEffect, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Iconify from "../iconify";
import { fDate } from "@/utils/format-time";
import { Calendar } from "../ui/calendar";

const RangeDatePicker = ({ from, to, onChange, showDescription, ...props }) => {
  const [open, setOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    from: from ? new Date(from) : new Date(),
    to: to ? new Date(to) : new Date(),
  });

  useEffect(() => {
    setDateRange({
      from: from ? new Date(from) : null,
      to: to ? new Date(to) : null,
    });
  }, [from, to]);

  const handleSelect = (range) => {
    setDateRange(range);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          // if closed, send the selected range
          if (dateRange?.from && dateRange?.to) {
            onChange?.(dateRange);
          }
        }
        setOpen(isOpen);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "justify-start text-left font-normal w-full border",
            "bg-card hover:dark:bg-gray-700/50",
            !dateRange?.from && "text-muted-foreground"
          )}
        >
          <Iconify icon="solar:calendar-bold" className="w-4 h-4" />
          {showDescription && (
            <div>
              {dateRange?.from ? (
                dateRange?.to ? (
                  <span className="text-xs">
                    {fDate(dateRange.from)} - {fDate(dateRange.to)}
                  </span>
                ) : (
                  <span className="text-xs">{fDate(dateRange.from)}</span>
                )
              ) : (
                <span className="text-xs cursor-pointer hover:underline">
                  Pick a date range
                </span>
              )}
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-2 w-auto" align="start">
        <Calendar
          mode="range"
          defaultMonth={dateRange?.from}
          selected={dateRange}
          onSelect={handleSelect}
          numberOfMonths={2}
          {...props}
        />
      </PopoverContent>
    </Popover>
  );
};

export default RangeDatePicker;
