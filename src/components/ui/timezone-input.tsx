"use client";
import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}
function getSnapshot() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}
function getServerSnapshot() {
  return "";
}

/** Hidden input carrying the browser's IANA time zone (so due dates use the home's local day). */
export function TimezoneInput({ name = "timezone", defaultValue }: { name?: string; defaultValue?: string }) {
  const detected = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return <input type="hidden" name={name} value={defaultValue ?? detected} />;
}
