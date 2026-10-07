import { cn } from "@/lib/utils";

export function Logo({
  className,
  withText = true,
}: {
  className?: string;
  withText?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-extrabold tracking-tight select-none",
        className,
      )}
    >
      <img
        src="/logo.svg"
        alt=""
        className="size-8 shrink-0 rounded-[10px] sm:size-9"
      />
      {withText && (
        <span className="text-lg whitespace-nowrap sm:text-xl">
          Task<span className="text-primary">Uncle</span>
        </span>
      )}
    </span>
  );
}
