import Image from "next/image";
import Link from "next/link";

interface CategoryTileProps {
  id: string;
  name: string;
  image: string;
  href: string;
}

export const CategoryTile = ({ id, name, image, href }: CategoryTileProps) => {
  return (
    <Link href={href}>
      <div className="flex flex-col items-center justify-center w-28 sm:w-32 h-40 sm:h-48 bg-white rounded-2xl border border-border hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer p-3">
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 mb-2">
          <Image
            src={image}
            alt={name}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 80px, 96px"
          />
        </div>
        <p className="text-xs sm:text-sm font-medium text-text-primary text-center line-clamp-2">
          {name}
        </p>
      </div>
    </Link>
  );
};
