"use client";

import { Plus, Clock } from "lucide-react";
import Image from "next/image";

interface ProductCardProps {
  id: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  unit: string;
  deliveryTime?: string;
  inStock: boolean;
  discount?: number;
}

export const ProductCard = ({
  id,
  name,
  image,
  price,
  originalPrice,
  unit,
  deliveryTime = "10 mins",
  inStock,
  discount,
}: ProductCardProps) => {
  return (
    <div className="bg-white border border-border rounded-xl p-3 hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer relative flex flex-col h-full min-w-[160px] sm:min-w-[179px]">
      {/* Discount Badge */}
      {discount && (
        <div className="absolute top-2 left-2 bg-accent-blue text-white text-xs font-medium px-2 py-1 rounded z-10">
          {discount}% OFF
        </div>
      )}

      {/* Product Image */}
      <div className="relative w-full aspect-square mb-3 flex items-center justify-center">
        <Image
          src={image}
          alt={name}
          fill
          className="object-contain rounded-lg"
          sizes="(max-width: 768px) 160px, 179px"
        />
        
        {/* Delivery Time Badge */}
        {deliveryTime && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{deliveryTime}</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-medium text-text-primary line-clamp-2 mb-1">
            {name}
          </h3>
          <p className="text-xs text-text-secondary mb-2">{unit}</p>
        </div>

        {/* Price and Add Button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-text-primary">
                ₹{price}
              </span>
              {originalPrice && (
                <span className="text-xs text-text-tertiary line-through">
                  ₹{originalPrice}
                </span>
              )}
            </div>
          </div>
          
          {inStock ? (
            <button className="bg-primary hover:bg-green-light text-white font-bold text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap">
              ADD
              <Plus className="w-4 h-4" />
            </button>
          ) : (
            <button disabled className="bg-gray-300 text-gray-500 font-bold text-sm px-4 py-2 rounded-lg cursor-not-allowed">
              Out of Stock
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
