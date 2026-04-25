import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Check, MapPin, X } from "lucide-react";

interface Props {
  value: string | null;
  onChange: (next: string | null) => void;
  /** All event tags already used in the dataset, used as suggestions. */
  options: string[];
}

/**
 * Inline-editable Event/Trip chip. Shows a soft "Daily Life" label when null,
 * and a colored chip when an event_tag is set. Click to pick from existing
 * events or type a new name.
 */
export function EventTagEditor({ value, onChange, options }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();
  const exactMatch = options.some((o) => o.toLowerCase() === lower);

  const choose = (next: string | null) => {
    onChange(next);
    setOpen(false);
    setQuery("");
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={
            value
              ? "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-primary/15 text-primary hover:bg-primary/25 transition-colors max-w-[160px]"
              : "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs text-muted-foreground hover:bg-secondary transition-colors"
          }
          title={value ?? "Daily Life — click to assign"}
        >
          {value ? (
            <>
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{value}</span>
            </>
          ) : (
            <>
              <span>🏠</span>
              <span>Daily Life</span>
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 rounded-2xl border-0 shadow-card w-64"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <Command>
          <CommandInput
            placeholder="Search or create event…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              {trimmed ? "Press enter below to create." : "No events yet."}
            </CommandEmpty>

            {options.length > 0 && (
              <CommandGroup heading="Existing events">
                {options.map((opt) => (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={() => choose(opt)}
                    className="rounded-lg"
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${value === opt ? "opacity-100" : "opacity-0"}`}
                    />
                    <MapPin className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                    {opt}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {trimmed && !exactMatch && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value={`__create__${trimmed}`}
                    onSelect={() => choose(trimmed)}
                    className="rounded-lg"
                  >
                    <span className="mr-2 text-base leading-none">＋</span>
                    Create &ldquo;{trimmed}&rdquo;
                  </CommandItem>
                </CommandGroup>
              </>
            )}

            {value && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value="__clear__"
                    onSelect={() => choose(null)}
                    className="rounded-lg text-muted-foreground"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear (Daily Life)
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
