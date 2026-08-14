import { useEffect, useRef } from "react";
import { Capacitor, type PluginListenerHandle } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { trpc } from "@/lib/trpc";

interface NativePushRegistrationProps {
  accountId: number;
  personId: string;
}

/**
 * Native-only APNs registration. This has no UI and does nothing in a web
 * browser. Once the user allows notifications, the device token is stored for
 * their account so the server can update the iPhone Home Screen badge.
 */
export function NativePushRegistration({ accountId, personId }: NativePushRegistrationProps) {
  const registeredToken = useRef<string | null>(null);
  const registerDevice = trpc.pushDevice.register.useMutation();

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return;

    let cancelled = false;
    const handles: PluginListenerHandle[] = [];

    const setup = async () => {
      const registrationHandle = await PushNotifications.addListener("registration", (token) => {
        if (cancelled || registeredToken.current === token.value) return;
        registeredToken.current = token.value;
        registerDevice.mutate({ accountId, personId, platform: "ios", token: token.value });
      });
      handles.push(registrationHandle);

      const permission = await PushNotifications.checkPermissions();
      const status = permission.receive === "prompt"
        ? await PushNotifications.requestPermissions()
        : permission;
      if (!cancelled && status.receive === "granted") {
        await PushNotifications.register();
      }
    };

    void setup().catch((error) => console.warn("[APNs] Native registration failed", error));

    return () => {
      cancelled = true;
      void Promise.all(handles.map((handle) => handle.remove()));
    };
  }, [accountId, personId, registerDevice]);

  return null;
}
