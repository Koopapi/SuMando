// Borradores y preferencias de los asistentes (spec 015).
import type { WizardDraft } from "@/db/schema";

/** De quién es un borrador: una persona en una sucursal, o un empleado en un teléfono de piso. */
export type DraftOwner = { kind: "user"; userId: string; branchId: string } | { kind: "device"; floorDeviceId: string; employeeId: string };

export type DraftKey = { owner: DraftOwner; kind: string; target: string };

export type DraftValues = { businessId: string; branchId: string; step: string; data: unknown; at: Date };

export interface WizardsRepo {
  drafts: {
    find(key: DraftKey): Promise<WizardDraft | null>;
    /** Crea o reemplaza el borrador de esa llave. */
    save(key: DraftKey, values: DraftValues): Promise<WizardDraft>;
    remove(key: DraftKey): Promise<void>;
  };
  preferences: {
    listByUser(userId: string): Promise<{ kind: string; view: string }[]>;
    set(userId: string, kind: string, view: string, at: Date): Promise<void>;
  };
}
