import { Search } from "lucide-react";
import { Input } from "./ui/input";
import clsx from "clsx";

const SearchInput = ({
  value,
  onChange,
  placeholder = "Filter...",
  className,
  ...props
}) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className={clsx("pl-10", className)}
        {...props}
      />
    </div>
  );
};

export default SearchInput;
