// RF-30: ninguna acción puede dejar al sistema sin un dueño activo.
export function wouldLeaveNoOwner(input: { target: { role: "owner" | "admin"; isActive: boolean }; otherActiveOwners: number }): boolean {
  return input.target.role === "owner" && input.target.isActive && input.otherActiveOwners === 0;
}
