import { Link, type LinkProps } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

export function BackLink({ label, ...link }: LinkProps & { label: string }) {
  return (
    <Link
      {...link}
      className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ChevronLeft className="size-4" /> {label}
    </Link>
  );
}
