import Image from "next/image";
import { socialTiles } from "@/lib/data";
import { accent, eyebrow, sectionTitle } from "@/lib/home-type";

export default function SocialGallery() {
  return (
    <section className="w-full py-space-xl">
      <div className="max-w-[1536px] mx-auto px-margin-mobile lg:px-margin">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-space-sm mb-space-lg">
          <div data-reveal>
            <span className={eyebrow}>As Seen on Instagram</span>
            <h2 className={`${sectionTitle} mt-2`}>
              #Rose<em className={accent}>Atelier</em>
            </h2>
          </div>
          <a
            className="font-label-uppercase text-label-uppercase text-primary hover:text-secondary uppercase tracking-widest flex items-center gap-1 transition-colors"
            href="https://instagram.com"
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="link-draw">Follow @RoseAtelier</span>
            <span className="material-symbols-outlined text-base">
              arrow_forward
            </span>
          </a>
        </div>

        <div data-reveal-stagger className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-space-sm">
          {socialTiles.map((tile, i) => (
            <a
              key={tile.image}
              className={`group relative aspect-square overflow-hidden rounded-lg bg-surface-container-low shadow-sm${
                i === socialTiles.length - 1 ? " col-span-2 md:col-span-1" : ""
              }`}
              href="#social"
            >
              <Image
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                alt={tile.alt}
                src={tile.image}
                fill
                sizes="(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 50vw"
              />
              <div className="absolute inset-0 bg-primary/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-surface">
                <span className="material-symbols-outlined text-2xl">
                  photo_camera
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
