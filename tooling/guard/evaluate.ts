import { existsSync } from "node:fs";
import { isAllowed, loadAllowlist } from "./allowlist.ts";
import { parseInstallCommand } from "./parse-install.ts";

const ADVICE =
  "Kies een alternatief uit STACK.md, of stel de dependency voor met reden en trade-off. " +
  "De gebruiker beslist en past dependency-allowlist.json aan.";

/** Returns a block reason for the command, or null when it may run. */
export const evaluateCommand = (command: string, allowlistPath: string): string | null => {
  const requested = parseInstallCommand(command);
  if (requested.length === 0) return null;
  if (!existsSync(allowlistPath)) {
    return `Installatie geblokkeerd: ${allowlistPath} ontbreekt.\n${ADVICE}`;
  }
  try {
    const list = loadAllowlist(allowlistPath);
    const denied = requested.filter((pkg) => !isAllowed(list, pkg.ecosystem, pkg.name));
    if (denied.length === 0) return null;
    const names = denied.map((pkg) => `${pkg.name} (${pkg.ecosystem})`).join(", ");
    return `Installatie geblokkeerd, niet op de allowlist: ${names}.\n${ADVICE}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `Installatie geblokkeerd: allowlist onleesbaar (${message}).`;
  }
};
