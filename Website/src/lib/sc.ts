/**
 * Supporting Cast's widget API, called directly.
 *
 * Their own embed makes these calls from this origin already, so there is nothing to proxy: the
 * API allows the browser through, and the token in localStorage is the member's own. Going direct
 * keeps the page fast and means a saved field is confirmed by the same response their widget gets.
 *
 * The shape below was read from their bundle rather than their docs, which do not cover it. If a
 * call starts failing, that is the first place to look.
 */

/** Publishable by design: it identifies the network, grants nothing, and ships in client code. */
export const SC_PK =
  "wpk_I8kt6WweVJg8cAvL8AtzisBdsdlW9T7eH6zEY38R5ubOaIxrQa6yqYV7BOS24w5sSk5FKSgLbbsDTnq7tmv5lR3vELNcRUlCbvN";

const API = "https://widget-api.supportingcast.fm";

/** Their user object, camelCase, as their widget reads it. */
export type ScUser = {
  uuid: string | null;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatarUrl: string;
  accountPageRestricted: boolean;
};

async function call<T>(path: string, method: "GET" | "PUT", token: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}/${path}`, {
    method,
    headers: {
      "Supportingcast-Widget-Publishable-Key": SC_PK,
      "Supportingcast-Widget-Access-Token": token,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 204) return {} as T;
  return (await res.json()) as T;
}

export const scGetUser = (token: string) => call<ScUser>("user", "GET", token);

/** Send only what changed — a full object would overwrite fields this page does not show. */
export const scPutUser = (token: string, patch: Partial<Pick<ScUser, "displayName" | "email">>) =>
  call<ScUser & { message?: string }>("user", "PUT", token, patch);

export const scPutAvatar = (token: string, dataUrl: string) =>
  call<{ success?: boolean; url?: string; message?: string }>("avatar", "PUT", token, { upload: dataUrl });

/**
 * A photo straight off a phone is several megabytes and takes seconds to upload as base64 — their
 * own widget takes nearly three. Drawn down to 512px first, which is larger than anywhere it is
 * ever displayed.
 */
export function shrinkToDataUrl(file: File, max = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("could not read that file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("that file is not an image"));
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas"));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
