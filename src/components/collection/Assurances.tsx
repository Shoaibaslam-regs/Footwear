import { assurances } from "@/lib/collection-data";

export default function Assurances() {
  return (
    <section className="w-full bg-surface-container-low py-space-xl">
      <div className="max-w-[1536px] mx-auto px-margin-mobile lg:px-margin">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg items-center">
          {assurances.map((a) => (
            <div
              key={a.title}
              className="flex items-start gap-space-md p-space-md rounded-xl bg-surface-container-lowest shadow-sm"
            >
              <div className="w-12 h-12 rounded-full bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed flex-shrink-0">
                <span className="material-symbols-outlined text-[24px]">
                  {a.icon}
                </span>
              </div>
              <div className="space-y-1">
                <h4 className="font-headline-sm text-headline-sm text-primary">
                  {a.title}
                </h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
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
