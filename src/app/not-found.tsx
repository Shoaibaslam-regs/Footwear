import Link from "next/link";
import ShopLayout from "./(shop)/layout";

export default function NotFound() {
  return (
    <ShopLayout>
      <section className="w-full max-w-[1536px] mx-auto px-margin-mobile lg:px-margin py-space-xl flex flex-col items-center text-center gap-space-md">
        <span className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-[0.25em]">
          Error 404 · Page Not Found
        </span>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile lg:font-headline-lg lg:text-headline-lg text-primary tracking-tight">
          We Can&apos;t Find This Page
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant font-light max-w-xl">
          The page you are looking for has moved or no longer exists.
        </p>
        <div className="flex flex-col sm:flex-row gap-space-md pt-space-sm">
          <Link
            className="h-[52px] px-8 rounded-full bg-primary-container text-secondary-fixed hover:bg-secondary-fixed hover:text-on-secondary-fixed transition-all duration-300 font-label-uppercase text-label-uppercase uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl"
            href="/collections"
          >
            Shop Now
          </Link>
          <Link
            className="h-[52px] px-8 rounded-full bg-surface-container hover:bg-surface-container-high text-primary transition-all duration-300 font-label-uppercase text-label-uppercase uppercase tracking-widest flex items-center justify-center"
            href="/"
          >
            Go to Home Page
          </Link>
        </div>
      </section>
    </ShopLayout>
  );
}
