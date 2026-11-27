import { spawnSync } from "node:child_process";

type Opts = { input?: string; fatal?: boolean };

/**
 * Did a CLI call fail? A non-zero exit is a failure. The CLI also prints some errors to stderr and exits 0 (for example
 * "Error: OS keychain unavailable"), so empty stdout plus an error line on stderr counts too. Success messages such as
 * "✓ Added variant ..." also go to stderr with empty stdout, and are NOT failures.
 */
export function looksFailed(status: number | null, stdout: string, stderr: string, spawnError?: Error): boolean {
  if (spawnError !== undefined || status !== 0) return true;
  return stdout.trim() === "" && /^\s*error\b/im.test(stderr);
}

/**
 * Run the Flagsmith CLI and return stdout. By default a failure shows the exact error and stops (no guessing, no
 * workarounds). With fatal:false it warns and returns null, for steps that may legitimately be refused.
 */
export function flagsmith(args: string[], { input, fatal = true }: Opts = {}): string | null {
  const r = spawnSync("flagsmith", [...args, "--no-input"], { encoding: "utf8", input });
  const failed = looksFailed(r.status, r.stdout ?? "", r.stderr ?? "", r.error);
  if (failed) {
    console.error(`\nflagsmith ${args.join(" ")} failed:\n${r.error?.message ?? (r.stderr || r.stdout).trim()}`);
    if (fatal) process.exit(1);
    return null;
  }
  return r.stdout;
}

/** Like flagsmith(), but never exits: returns the exit status and both streams, so a caller can tell "not found" from a real failure. */
export function flagsmithStatus(args: string[]): { status: number; stdout: string; stderr: string } {
  const r = spawnSync("flagsmith", [...args, "--no-input"], { encoding: "utf8" });
  const failed = looksFailed(r.status, r.stdout ?? "", r.stderr ?? "", r.error);
  return { status: failed ? (r.status || 1) : 0, stdout: r.stdout ?? "", stderr: r.error ? r.error.message : (r.stderr ?? "") };
}

export function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}
export const flag = (name: string): boolean => process.argv.includes(`--${name}`);
