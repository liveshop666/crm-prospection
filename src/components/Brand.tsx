import Image from "next/image";

/** Logo SolveLab + « CRM ». */
export function Brand({ size = 40 }: { size?: number }) {
  return (
    <span className="flex items-center gap-2.5">
      <Image src="/logo.png" alt="SolveLab" width={size} height={size} priority className="shrink-0 rounded-full" />
      <span className="leading-none">
        <span className="block font-head text-[22px] font-extrabold tracking-wide uppercase">CRM</span>
        <span className="block text-[11px] font-medium tracking-[.18em] text-muted uppercase">SolveLab</span>
      </span>
    </span>
  );
}
