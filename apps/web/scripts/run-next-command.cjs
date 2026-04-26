const path = require("node:path");
const { spawnSync, spawn } = require("node:child_process");

const appDir = path.resolve(__dirname, "..");
const args = process.argv.slice(2);
const nextCommand = args[0];
const nextArgs = args.slice(1);

if (!nextCommand) {
  console.error("Missing Next.js command.");
  process.exit(1);
}

const env = {
  ...process.env,
  NEXT_BUILD_DIR: ".next-build",
};

if (nextArgs.includes("--analyze")) {
  env.ANALYZE = "true";
}

const filteredNextArgs = nextArgs.filter((arg) => arg !== "--analyze");
const resolvedNextArgs = [...filteredNextArgs];

if (nextCommand === "start") {
  const hasPortArg = resolvedNextArgs.includes("-p") || resolvedNextArgs.includes("--port");
  const hasHostArg = resolvedNextArgs.includes("-H") || resolvedNextArgs.includes("--hostname");

  if (!hasPortArg) {
    resolvedNextArgs.push("-p", env.PORT || "3000");
  }

  if (!hasHostArg) {
    resolvedNextArgs.push("-H", env.HOSTNAME || "0.0.0.0");
  }
}

const cleanMode = nextCommand === "start" ? "ensure" : "clean";
const cleanScript = path.join(__dirname, "clean-next-build.cjs");
const nextBin = require.resolve("next/dist/bin/next", { paths: [appDir] });

const cleanResult = spawnSync(process.execPath, [cleanScript, cleanMode], {
  cwd: appDir,
  stdio: "inherit",
  env,
});

if (cleanResult.status !== 0) {
  process.exit(cleanResult.status ?? 1);
}

const child = spawn(process.execPath, [nextBin, nextCommand, ...resolvedNextArgs], {
  cwd: appDir,
  stdio: "inherit",
  env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(`Failed to run next ${nextCommand}:`, error.message);
  process.exit(1);
});
