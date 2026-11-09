import Hero from "@/components/Hero";
import Categories from "@/components/Categories";
import NewArrivals from "@/components/NewArrivals";
import Campaign from "@/components/Campaign";
import BestSellers from "@/components/BestSellers";
import Craft from "@/components/Craft";
import Testimonials from "@/components/Testimonials";
import SocialGallery from "@/components/SocialGallery";

export default function Home() {
  return (
    <div className="flex flex-col w-full">
      <Hero />
      <Categories />
      <NewArrivals />
      <Campaign />
      <BestSellers />
      <Craft />
      <Testimonials />
      <SocialGallery />
    </div>
  );
}
