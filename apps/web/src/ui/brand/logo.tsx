// Logo de SuMando (RF-1): perilla y nombre con la M en ámbar. El nombre sale de `es.common.appName`.
import { es } from "@/i18n";
import { dialSvg } from "./logo-svg";

const NAME = es.common.appName;

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0"
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: dialSvg({ small: size <= 44 }) }}
    />
  );
}

/** Nombre escrito: «Su» + «M» en ámbar + «ando». Se lee como un solo nombre para lectores de pantalla. */
export function Wordmark({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span aria-label={NAME} className={`font-brand leading-none tracking-tight ${size === "lg" ? "text-4xl" : "text-lg"}`}>
      <span aria-hidden className="font-medium">
        {NAME.slice(0, 2)}
      </span>
      <span aria-hidden className="font-bold text-accent-text">
        {NAME.slice(2, 3)}
      </span>
      <span aria-hidden className="font-bold">
        {NAME.slice(3)}
      </span>
    </span>
  );
}

export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size === "lg" ? 56 : 32} />
      <Wordmark size={size} />
    </span>
  );
}
