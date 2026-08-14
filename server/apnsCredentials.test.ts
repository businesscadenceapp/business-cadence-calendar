import { describe, expect, it } from "vitest";
import { createSign } from "node:crypto";
import { connect } from "node:http2";

const APNS_AUTH_KEY = process.env.APNS_AUTH_KEY;
const APNS_KEY_ID = process.env.APNS_KEY_ID;
const APNS_TEAM_ID = process.env.APNS_TEAM_ID;
const APNS_TOPIC = "com.businesscadence.calendar";

function encode(value: object) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function createApnsToken() {
  if (!APNS_AUTH_KEY || !APNS_KEY_ID || !APNS_TEAM_ID) {
    throw new Error("APNs credentials are missing");
  }

  const signingInput = `${encode({ alg: "ES256", kid: APNS_KEY_ID })}.${encode({ iss: APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) })}`;
  const signer = createSign("SHA256");
  signer.update(signingInput);
  signer.end();
  const normalizedKey = APNS_AUTH_KEY.replace(/\\n/g, "\n");
  const signature = signer.sign({ key: normalizedKey, dsaEncoding: "ieee-p1363" }).toString("base64url");
  return `${signingInput}.${signature}`;
}

function sendValidationRequest(token: string) {
  return new Promise<{ status: number; body: string }>((resolve, reject) => {
    const client = connect("https://api.sandbox.push.apple.com");
    client.on("error", reject);

    const request = client.request({
      ":method": "POST",
      ":path": `/3/device/${"0".repeat(64)}`,
      authorization: `bearer ${token}`,
      "apns-topic": APNS_TOPIC,
      "apns-push-type": "alert",
      "apns-priority": "10",
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
    request.end(JSON.stringify({ aps: { badge: 1 } }));
  });
}

describe("APNs credentials", () => {
  it("authenticates to Apple’s sandbox endpoint without sending a real notification", async () => {
    const response = await sendValidationRequest(createApnsToken());

    // A valid APNs credential reaches device-token validation; an invalid one returns 403.
    expect(response.status).toBe(400);
    expect(response.body).toContain("BadDeviceToken");
  }, 20_000);
});
