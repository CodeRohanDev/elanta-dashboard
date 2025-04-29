import Image from 'next/image'
import { Heart, ShoppingCart } from 'lucide-react'

interface ProductCardProps {
  title: string
  price: number
  image: string
  category: string
}

export default function ProductCard({ title, price, image, category }: ProductCardProps) {
  return (
    <div className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
      {/* Product Image */}
      <div className="aspect-square relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100">
          {/* Placeholder for product image */}
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200" />
        </div>
        {/* Quick Actions */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-3">
            <button className="transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 bg-white p-3 rounded-full shadow-lg hover:bg-blue-600 hover:text-white hover:scale-110">
              <Heart className="h-5 w-5" />
            </button>
            <button className="transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 bg-white p-3 rounded-full shadow-lg hover:bg-blue-600 hover:text-white hover:scale-110">
              <ShoppingCart className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-5">
        <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
          {category}
        </span>
        <h3 className="text-lg font-semibold text-gray-900 mt-3 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
            ${price.toFixed(2)}
          </span>
          <button className="bg-gradient-to-r from-blue-600 to-blue-400 text-white px-5 py-2.5 rounded-xl hover:shadow-lg hover:shadow-blue-100 transition-all duration-300 text-sm font-medium">
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  )
} 