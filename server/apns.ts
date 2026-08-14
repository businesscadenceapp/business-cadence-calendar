import { createSign } from "node:crypto";
import { connect } from "node:http2";
import { ENV } from "./_core/env";

const APNS_TOPIC = "com.businesscadence.calendar";
const TOKEN_TTL_MS = 50 * 60 * 1000;

type ApnsEnvironment = "sandbox" | "production";

let cachedJwt: { value: string; createdAt: number } | null = null;

function encode(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function getJwt() {
  if (cachedJwt && Date.now() - cachedJwt.createdAt < TOKEN_TTL_MS) return cachedJwt.value;
  if (!ENV.apnsAuthKey || !ENV.apnsKeyId || !ENV.apnsTeamId) return null;

  const signingInput = `${encode({ alg: "ES256", kid: ENV.apnsKeyId })}.${encode({ iss: ENV.apnsTeamId, iat: Math.floor(Date.now() / 1000) })}`;
  const signer = createSign("SHA256");
  signer.update(signingInput);
  signer.end();
  const normalizedKey = ENV.apnsAuthKey.replace(/\\n/g, "\n");
  const signature = signer.sign({ key: normalizedKey, dsaEncoding: "ieee-p1363" }).toString("base64url");
  const value = `${signingInput}.${signature}`;
  cachedJwt = { value, createdAt: Date.now() };
  return value;
}

function sendToEnvironment(environment: ApnsEnvironment, token: string, badge: number) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const jwt = getJwt();
    if (!jwt) {
      resolve({ status: 0, body: "APNs credentials are not configured" });
      return;
    }

    const client = connect(`https://api${environment === "sandbox" ? ".sandbox" : ""}.push.apple.com`);
    client.on("error", reject);
    const request = client.request({
      ":method": "POST",
      ":path": `/3/device/${token}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": APNS_TOPIC,
      "apns-push-type": "background",
      "apns-priority": "5",
      "content-type": "application/json",
    });

    let body = "";
    let status = 0;
    request.setEncoding("utf8");
    request.on("response", (headers) => { status = Number(headers[":status"]); });
    request.on("data", (chunk: string) => { body += chunk; });
    request.on("error", reject);
    request.on("end", () => {
      client.close();
      resolve({ status, body });
    });
    request.end(JSON.stringify({ aps: { "content-available": 1, badge: Math.max(0, badge) } }));
  });
}

/**
 * Updates an iPhone Home Screen badge without adding an unexpected in-app or
 * native alert. A token is sandbox or production depending on how the app was
 * installed, so the sender tries both Apple endpoints safely.
 */
export async function updateIosBadge(token: string, unreadCount: number) {
  if (!ENV.apnsAuthKey || !ENV.apnsKeyId || !ENV.apnsTeamId) return false;

  for (const environment of ["sandbox", "production"] as const) {
    try {
      const response = await sendToEnvironment(environment, token, unreadCount);
      if (response.status === 200) return true;
      if (response.status === 400 && response.body.includes("BadDeviceToken")) continue;
      console.warn(`[APNs] Badge update failed in ${environment}: ${response.status} ${response.body}`);
      return false;
    } catch (error) {
      console.warn(`[APNs] Badge update connection failed in ${environment}:`, error);
    }
  }

  return false;
}
