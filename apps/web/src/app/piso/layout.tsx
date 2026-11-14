// Spec 010: el teléfono de piso no lleva menú ni barra de SuMando: solo la banda con la marca.
import { LogoMark, Wordmark } from "@/ui/brand/logo";

export const dynamic = "force-dynamic";

export default function FloorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header className="flex items-center gap-2.5 bg-band px-5 pt-3 text-on-band">
        <LogoMark size={30} bare />
        <Wordmark tone="band" />
      </header>
      {children}
    </div>
  );
}
