// Una fecha de calendario («2026-11-13») como «13 nov 2026».
import { formatDate } from "@/ui";

export const showDate = (d: string | null) => (d ? formatDate(new Date(`${d}T12:00:00Z`)) : "—");
