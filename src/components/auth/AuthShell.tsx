import Image from "next/image";
import { heroImage } from "@/lib/data";

/** Editorial split layout shared by sign-in and registration. */
export default function AuthShell({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <section className="w-full max-w-[1536px] mx-auto px-margin-mobile lg:px-margin pt-space-md pb-space-xl">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter lg:gap-space-xl items-stretch">
        <div className="hidden lg:block lg:col-span-6 relative min-h-[640px] rounded-xl overflow-hidden bg-primary-container">
          <Image
            alt="Sculpted Italian stilettos on a Venetian marble ledge"
            className="object-cover opacity-90"
            fill
            priority
            sizes="50vw"
            src={heroImage}
          />
          <div className="absolute inset-0 bg-linear-to-t/srgb from-primary via-primary/30 to-transparent" />
          <div className="absolute bottom-0 p-space-xl flex flex-col gap-space-sm">
            <span className="font-label-uppercase text-label-uppercase uppercase tracking-[0.25em] text-secondary-fixed">
              Client Salon
            </span>
            <p className="font-headline-md text-headline-md text-surface-container-lowest max-w-md">
              Private access to atelier previews, fittings and your order archive.
            </p>
          </div>
        </div>
        <div className="lg:col-span-6 flex flex-col justify-center">
          <div className="w-full max-w-md mx-auto bg-surface-container-lowest rounded-xl shadow-sm p-space-lg sm:p-space-xl flex flex-col gap-space-lg">
            <div>
              <span className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-[0.2em]">
                {eyebrow}
              </span>
              <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary tracking-tight mt-1">
                {title}
              </h1>
              <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs">
                {intro}
              </p>
            </div>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
