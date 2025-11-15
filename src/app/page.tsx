import { Header } from "@/components/Header";
import { ProductCard } from "@/components/ProductCard";
import { CategoryTile } from "@/components/CategoryTile";
import { FeatureCard } from "@/components/FeatureCard";
import { SectionHeader } from "@/components/SectionHeader";
import { Zap } from "lucide-react";

export default function Home() {
  // Mock data for products
  const essentialMedicines = [
    {
      id: "1",
      name: "Paracetamol 500mg",
      image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/59bab76a-7627-4491-bd17-e21ca5f293f1/generated_images/modern-medicine-bottle-with-pills-parace-ddd7ba50-20251115093225.jpg",
      price: 25,
      originalPrice: 35,
      unit: "10 tablets",
      deliveryTime: "10 mins",
      inStock: true,
      discount: 28,
    },
    {
      id: "2",
      name: "Vitamin C 1000mg",
      image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/59bab76a-7627-4491-bd17-e21ca5f293f1/generated_images/vitamin-c-supplement-bottle-with-orange--ce568335-20251115093225.jpg",
      price: 180,
      originalPrice: 250,
      unit: "30 tablets",
      deliveryTime: "12 mins",
      inStock: true,
      discount: 28,
    },
    {
      id: "3",
      name: "First Aid Kit",
      image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/59bab76a-7627-4491-bd17-e21ca5f293f1/generated_images/medical-first-aid-kit-box-in-red-and-whi-c3c2f9ee-20251115093226.jpg",
      price: 450,
      unit: "1 box",
      deliveryTime: "15 mins",
      inStock: true,
    },
    {
      id: "4",
      name: "Digital Thermometer",
      image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/59bab76a-7627-4491-bd17-e21ca5f293f1/generated_images/digital-thermometer-medical-device-moder-2d19b0de-20251115093225.jpg",
      price: 299,
      originalPrice: 399,
      unit: "1 piece",
      deliveryTime: "10 mins",
      inStock: true,
      discount: 25,
    },
    {
      id: "5",
      name: "BP Monitor",
      image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/59bab76a-7627-4491-bd17-e21ca5f293f1/generated_images/blood-pressure-monitor-medical-device-he-56d054cc-20251115093225.jpg",
      price: 1299,
      unit: "1 piece",
      deliveryTime: "15 mins",
      inStock: true,
    },
    {
      id: "6",
      name: "Hand Sanitizer 500ml",
      image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/59bab76a-7627-4491-bd17-e21ca5f293f1/generated_images/hand-sanitizer-bottle-with-pump-dispense-2971ce69-20251115093225.jpg",
      price: 149,
      originalPrice: 199,
      unit: "500 ml",
      deliveryTime: "8 mins",
      inStock: true,
      discount: 25,
    },
  ];

  const categories = [
    {
      id: "1",
      name: "Medicines & Tablets",
      image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/59bab76a-7627-4491-bd17-e21ca5f293f1/generated_images/simple-flat-icon-illustration-of-medicin-fbdbd91e-20251115093225.jpg",
      href: "/category/medicines",
    },
    {
      id: "2",
      name: "Vitamins & Supplements",
      image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/59bab76a-7627-4491-bd17-e21ca5f293f1/generated_images/simple-flat-icon-illustration-of-vitamin-101d6cb9-20251115093225.jpg",
      href: "/category/vitamins",
    },
    {
      id: "3",
      name: "Medical Devices",
      image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/59bab76a-7627-4491-bd17-e21ca5f293f1/generated_images/simple-flat-icon-illustration-of-medical-d187129d-20251115093225.jpg",
      href: "/category/devices",
    },
    {
      id: "4",
      name: "First Aid",
      image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/59bab76a-7627-4491-bd17-e21ca5f293f1/generated_images/simple-flat-icon-illustration-of-first-a-261fdfd8-20251115093225.jpg",
      href: "/category/first-aid",
    },
    {
      id: "5",
      name: "Baby Care",
      image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/59bab76a-7627-4491-bd17-e21ca5f293f1/generated_images/simple-flat-icon-illustration-of-medicin-fbdbd91e-20251115093225.jpg",
      href: "/category/baby-care",
    },
    {
      id: "6",
      name: "Personal Care",
      image: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/project-uploads/59bab76a-7627-4491-bd17-e21ca5f293f1/generated_images/simple-flat-icon-illustration-of-vitamin-101d6cb9-20251115093225.jpg",
      href: "/category/personal-care",
    },
  ];

  return (
    <>
      <Header />
      
      {/* Main Content with top padding for fixed header */}
      <main className="pt-24 lg:pt-20 pb-16 bg-background min-h-screen">
        <div className="container mx-auto">
          
          {/* Hero Banner */}
          <section className="mb-10">
            <div className="relative h-64 sm:h-80 rounded-2xl overflow-hidden bg-gradient-to-r from-primary via-green-light to-success-green">
              <div className="absolute inset-0 p-8 sm:p-12 flex flex-col justify-center z-10">
                <div className="max-w-xl">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-6 h-6 text-accent-yellow fill-accent-yellow" />
                    <span className="text-white font-bold text-sm sm:text-base">10-15 MIN DELIVERY</span>
                  </div>
                  <h1 className="text-3xl sm:text-5xl font-bold text-white mb-4 leading-tight">
                    Medicines Delivered<br />in Minutes
                  </h1>
                  <p className="text-white/90 text-base sm:text-lg mb-6">
                    Search, order, and get your medicines delivered fast from nearby pharmacies
                  </p>
                  <button className="bg-white text-primary font-bold text-sm sm:text-base px-8 py-3 rounded-lg hover:bg-opacity-90 transition-colors">
                    Order Now
                  </button>
                </div>
              </div>
              <div className="absolute right-0 top-0 w-1/2 h-full opacity-20 bg-gradient-to-l from-white/30 to-transparent"></div>
            </div>
          </section>

          {/* Feature Cards */}
          <section className="mb-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <FeatureCard
                title="Prescription Upload"
                description="Upload & get verified medicines"
                image=""
                href="/prescription"
                gradient="bg-gradient-to-br from-accent-cyan to-cyan-600"
              />
              <FeatureCard
                title="Alternative Medicines"
                description="Find substitutes by salt name"
                image=""
                href="/alternatives"
                gradient="bg-gradient-to-br from-accent-blue to-blue-600"
              />
              <FeatureCard
                title="Track Delivery"
                description="Real-time order tracking"
                image=""
                href="/track"
                gradient="bg-gradient-to-br from-success-green to-green-700"
              />
            </div>
          </section>

          {/* Categories Section */}
          <section className="mb-10">
            <SectionHeader title="Shop by Category" seeAllHref="/categories" />
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {categories.map((category) => (
                <CategoryTile key={category.id} {...category} />
              ))}
            </div>
          </section>

          {/* Essential Medicines */}
          <section className="mb-10">
            <SectionHeader title="Essential Medicines" seeAllHref="/medicines" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {essentialMedicines.map((product) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
          </section>

          {/* Health & Wellness */}
          <section className="mb-10">
            <SectionHeader title="Health & Wellness" seeAllHref="/wellness" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {essentialMedicines.slice(0, 6).map((product) => (
                <ProductCard key={`wellness-${product.id}`} {...product} />
              ))}
            </div>
          </section>

          {/* Info Banner */}
          <section className="mb-10">
            <div className="bg-muted rounded-2xl p-8 sm:p-12 text-center">
              <h3 className="text-2xl sm:text-3xl font-bold text-text-primary mb-4">
                Why Choose MediFast?
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mt-8">
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">10-15</div>
                  <div className="text-text-secondary">Minutes Delivery</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">500+</div>
                  <div className="text-text-secondary">Partner Pharmacies</div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-primary mb-2">24/7</div>
                  <div className="text-text-secondary">Customer Support</div>
                </div>
              </div>
            </div>
          </section>

        </div>
      </main>
    </>
  );
}