import { BrandMark, type BrandLogo } from "./BrandMark";

type BrandLockupProps = {
  name: string;
  logo?: BrandLogo | null;
};

/** The office's mark with its name always beside it. */
export function BrandLockup({ name, logo = null }: BrandLockupProps) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <BrandMark name={name} logo={logo} />
      <b className="text-body font-office min-w-0 truncate leading-5 font-semibold">{name}</b>
    </span>
  );
}
