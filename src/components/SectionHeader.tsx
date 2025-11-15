import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  seeAllHref?: string;
}

export const SectionHeader = ({ title, seeAllHref }: SectionHeaderProps) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-2xl sm:text-3xl font-bold text-text-primary">{title}</h2>
      {seeAllHref && (
        <Link
          href={seeAllHref}
          className="text-primary font-medium text-sm sm:text-base hover:text-green-light transition-colors flex items-center gap-1"
        >
          see all
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
};
