import { assurances } from "@/lib/collection-data";

export default function Assurances() {
  return (
    <section className="w-full bg-surface-container-low py-space-xl">
      <div className="max-w-[1536px] mx-auto px-margin-mobile lg:px-margin">
        <div className="grid grid-cols-3 gap-space-xs sm:gap-space-lg items-stretch md:items-center">
          {assurances.map((a) => (
            <div
              key={a.title}
              className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-space-xs md:gap-space-md p-space-sm md:p-space-md rounded-xl bg-surface-container-lowest shadow-sm"
            >
              <div className="w-9 h-9 md:w-12 md:h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed flex-shrink-0">
                <span className="material-symbols-outlined text-[18px] md:text-[24px]">
                  {a.icon}
                </span>
              </div>
              <div className="space-y-1">
                <h4 className="font-label-md text-label-md md:font-headline-sm md:text-headline-sm text-primary">
                  {a.title}
                </h4>
                <p className="hidden md:block font-body-sm text-body-sm text-on-surface-variant">
                  {a.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
