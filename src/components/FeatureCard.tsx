import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface FeatureCardProps {
  title: string;
  description: string;
  image: string;
  href: string;
  gradient: string;
}

export const FeatureCard = ({
  title,
  description,
  image,
  href,
  gradient,
}: FeatureCardProps) => {
  return (
    <Link href={href}>
      <div
        className={`relative h-48 sm:h-52 rounded-2xl overflow-hidden cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-105 ${gradient}`}
      >
        <div className="absolute inset-0 p-6 flex flex-col justify-between text-white z-10">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold mb-2">{title}</h3>
            <p className="text-sm sm:text-base opacity-90">{description}</p>
          </div>
          <button className="bg-white text-text-primary font-bold text-sm px-6 py-2 rounded-lg hover:bg-opacity-90 transition-colors flex items-center gap-2 w-fit">
            Explore
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div
          className="absolute right-0 top-0 w-1/2 h-full bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${image})` }}
        ></div>
      </div>
    </Link>
  );
};
