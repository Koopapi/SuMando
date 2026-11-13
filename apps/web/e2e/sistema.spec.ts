// Criterios de la spec 002: componentes del sistema de diseño en el catálogo (entrega 3).
import { expect, test } from "./fixtures";

test("catálogo de componentes", async ({ page }) => {
  await page.goto("/sistema");
  const main = page.getByRole("main");

  await test.step("RF-40 el catálogo muestra cada grupo de componentes", async () => {
    for (const name of ["Acciones", "Formularios", "Avisos en línea", "Avisos flotantes", "Diálogo", "Insignias y rótulos", "Perilla", "Estados de lista", "Formatos"]) {
      await expect(main.getByRole("heading", { name, exact: true })).toBeVisible();
    }
  });

  await test.step("RF-21 todo lo que se toca mide al menos 44 × 44 px", async () => {
    const small = await main.locator("button, select, input:not([type=checkbox]), label:has(input[type=checkbox])").evaluateAll((els) =>
      els
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .map((el) => ({ el: el.outerHTML.slice(0, 80), r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.height < 44 || r.width < 44)
        .map(({ el, r }) => `${el} ${Math.round(r.width)}×${Math.round(r.height)}`),
    );
    expect(small).toEqual([]);
  });

  await test.step("RF-22 cantidades y dinero abren el teclado numérico", async () => {
    await expect(main.getByLabel("Piezas")).toHaveAttribute("inputmode", "decimal");
    await expect(main.getByLabel("Fondo inicial")).toHaveAttribute("inputmode", "decimal");
  });

  await test.step("RF-23 y RF-24 pesos y fechas con formato de México", async () => {
    await expect(main.getByTestId("money-sample")).toHaveText("$1,234.50");
    await expect(main.getByTestId("date-sample")).toHaveText("11 nov 2026");
  });

  await test.step("RF-25 el error aparece debajo del campo y se anuncia", async () => {
    const email = main.getByLabel("Correo");
    await email.fill("admin@");
    await main.getByRole("button", { name: "Validar" }).click();
    await expect(email).toHaveAttribute("aria-invalid", "true");
    const describedBy = (await email.getAttribute("aria-describedby"))!;
    const error = page.locator(`#${describedBy.split(" ").pop()!.replace(/:/g, "\\:")}`);
    await expect(error).toHaveText("Escribe un correo completo.");
    await expect(error).toHaveAttribute("role", "alert");
    const [fieldBox, errorBox] = [await email.boundingBox(), await error.boundingBox()];
    expect(errorBox!.y).toBeGreaterThan(fieldBox!.y);
  });

  await test.step("RF-26 mientras guarda, el botón está ocupado y no acepta un segundo toque", async () => {
    const button = main.getByTestId("busy-button");
    await button.click();
    await button.click({ force: true }).catch(() => undefined);
    await expect(button).toHaveAttribute("aria-busy", "true");
    await expect(button).toBeDisabled();
    await expect(main.getByTestId("saves")).toHaveText("Guardados: 1");
    await expect(button).toBeEnabled();
    await page.waitForTimeout(1000);
    await expect(main.getByTestId("saves")).toHaveText("Guardados: 1");
  });

  await test.step("RF-27 el aviso de guardado se va solo a los 4 segundos", async () => {
    await main.getByRole("button", { name: "Mostrar aviso de guardado" }).click();
    const toast = page.getByTestId("toast-success");
    await expect(toast).toHaveText("Negocio guardado.");
    await page.waitForTimeout(3300);
    await expect(toast).toBeVisible();
    await expect(toast).toBeHidden({ timeout: 2000 });
  });

  await test.step("RF-28 el aviso de error se queda hasta cerrarlo y no borra lo capturado", async () => {
    const note = main.getByLabel("Nota del turno");
    await note.fill("Faltaron 20 pesos");
    await main.getByRole("button", { name: "Mostrar aviso de error" }).click();
    const toast = page.getByTestId("toast-error");
    await expect(toast).toContainText("No se pudo guardar");
    await page.waitForTimeout(5000);
    await expect(toast).toBeVisible();
    await expect(note).toHaveValue("Faltaron 20 pesos");
    await toast.getByRole("button", { name: "Cerrar aviso" }).click();
    await expect(toast).toBeHidden();
  });

  await test.step("RF-29 la lista tiene estados de cargando, vacío y error con texto", async () => {
    await expect(main.locator("[data-state=loading]")).toContainText("Cargando");
    await expect(main.locator("[data-state=empty]")).toContainText("Ningún producto coincide");
    await expect(main.locator("[data-state=error]")).toContainText("No pudimos cargar la lista");
  });

  await test.step("RF-37 con el diálogo abierto el foco no sale y Escape lo cierra", async () => {
    await main.getByRole("button", { name: "Abrir diálogo" }).click();
    const dialog = page.getByRole("dialog", { name: "¿Salir sin terminar el corte?" });
    await expect(dialog).toBeVisible();
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press("Shift+Tab");
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  await test.step("RF-38 el foco del teclado se ve en cada control", async () => {
    await main.getByLabel("Nombre del negocio").focus();
    await page.keyboard.press("Tab");
    const outline = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement!);
      return { style: s.outlineStyle, width: s.outlineWidth };
    });
    expect(outline.style).not.toBe("none");
    expect(outline.width).not.toBe("0px");
  });

  await test.step("RF-39 con movimiento reducido no hay transiciones", async () => {
    const duration = () => main.getByRole("button", { name: "Guardar", exact: true }).evaluate((b) => getComputedStyle(b).transitionDuration);
    expect(await duration()).not.toBe("0s");
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await duration()).toBe("0s");
  });
});
