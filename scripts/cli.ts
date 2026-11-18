import { spawnSync } from "node:child_process";

type Opts = { input?: string; fatal?: boolean };

/**
 * Run the Flagsmith CLI and return stdout. By default a failure shows the exact error and stops (no guessing, no
 * workarounds). With fatal:false it warns and returns null, for steps that may legitimately be refused.
 */
export function flagsmith(args: string[], { input, fatal = true }: Opts = {}): string | null {
  const r = spawnSync("flagsmith", [...args, "--no-input"], { encoding: "utf8", input });
  // The CLI can print an error to stderr and still exit 0, so empty output with stderr text counts as a failure.
  const failed = r.error !== undefined || r.status !== 0 || (!r.stdout.trim() && r.stderr.trim() !== "");
  if (failed) {
    console.error(`\nflagsmith ${args.join(" ")} failed:\n${r.error?.message ?? (r.stderr || r.stdout).trim()}`);
    if (fatal) process.exit(1);
    return null;
  }
  return r.stdout;
}

export function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}
export const flag = (name: string): boolean => process.argv.includes(`--${name}`);
