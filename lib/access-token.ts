const toBase64Url = (bytes: Uint8Array) => {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
  }

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const sign = async (message: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );

  return toBase64Url(new Uint8Array(signature));
};

export const createAccessToken = async (
  secret: string,
  ttlSeconds: number,
  now = Date.now(),
) => {
  const expiresAt = now + ttlSeconds * 1000;
  const expRaw = String(expiresAt);
  const signature = await sign(expRaw, secret);
  return `${expRaw}.${signature}`;
};

export const verifyAccessToken = async (
  token: string | undefined,
  secret: string,
  now = Date.now(),
) => {
  if (!token) return false;

  const [expRaw, signature] = token.split(".");
  if (!expRaw || !signature) return false;

  const expiresAt = Number(expRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false;

  const expected = await sign(expRaw, secret);
  return signature === expected;
};
