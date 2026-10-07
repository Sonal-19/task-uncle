import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type SelectOption<T extends string = string> = {
  value: T;
  label: string;
};

// Radix Select reserves "" for "nothing selected", so "All"/"Myself"-style
// options with an empty value go through this stand-in.
const EMPTY = "__empty__";

/**
 * The app's dropdown: styled list on every device (no OS picker), full width,
 * touch-sized on phones. `value`/`onChange` use plain strings, "" included.
 */
export function SelectField<T extends string>({
  value,
  onChange,
  options,
  placeholder = "Select…",
  id,
  required,
  disabled,
  className,
  "aria-label": ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  placeholder?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const known = options.some((o) => o.value === value);
  return (
    <Select
      value={known ? value || EMPTY : ""}
      onValueChange={(v) => onChange((v === EMPTY ? "" : v) as T)}
      required={required}
      disabled={disabled || !options.length}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        className={cn("w-full min-w-0", className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value || EMPTY} value={o.value || EMPTY}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
