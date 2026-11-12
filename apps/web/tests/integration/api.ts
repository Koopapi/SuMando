// Llamar a los handlers de `app/api` con un `Request`, sin navegador, y seguir las cookies como lo haría uno.
import { parseCookies } from "@/server/auth/cookies";

export class ApiClient {
  readonly cookies: Record<string, string> = {};

  private cookieHeader() {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  async call(fn: (req: Request) => Promise<Response>, path: string, init: { method?: string; body?: unknown } = {}) {
    const cookie = this.cookieHeader();
    const req = new Request(`http://test${path}`, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: { "content-type": "application/json", "user-agent": "vitest", ...(cookie ? { cookie } : {}) },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    return this.send(fn, req);
  }

  /** Envía un formulario (`multipart/form-data`), como la subida de un archivo. */
  async form(fn: (req: Request) => Promise<Response>, path: string, form: FormData) {
    const cookie = this.cookieHeader();
    return this.send(fn, new Request(`http://test${path}`, { method: "POST", headers: { "user-agent": "vitest", ...(cookie ? { cookie } : {}) }, body: form }));
  }

  private async send(fn: (req: Request) => Promise<Response>, req: Request) {
    const res = await fn(req);
    for (const raw of res.headers.getSetCookie()) {
      const [pair, ...attrs] = raw.split(";");
      const name = pair.slice(0, pair.indexOf("=")).trim();
      const cleared = attrs.some((a) => a.trim() === "Max-Age=0");
      if (cleared) delete this.cookies[name];
      else this.cookies[name] = parseCookies(pair)[name];
    }
    return res;
  }
}

export const json = async (res: Response) => (res.status === 204 ? null : res.json());
