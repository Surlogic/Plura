const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const backendDir = path.join(repoRoot, "backend-java");
const rootBackendEnvFile = path.join(repoRoot, ".env.backend");
const backendEnvFile = path.join(backendDir, ".env");

const isWindows = process.platform === "win32";
const command = isWindows ? "gradlew.bat" : "./gradlew";
const gradleArgs = process.argv.slice(2);
const isBootRun = gradleArgs.length === 0 || gradleArgs.includes("bootRun");

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const env = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

const rootBackendEnv = isBootRun ? loadDotEnv(rootBackendEnvFile) : {};
const backendEnv = loadDotEnv(backendEnvFile);

const childEnv = {
  ...rootBackendEnv,
  ...backendEnv,
  ...process.env,
  SPRING_FLYWAY_VALIDATE_ON_MIGRATE:
    process.env.SPRING_FLYWAY_VALIDATE_ON_MIGRATE ??
    backendEnv.SPRING_FLYWAY_VALIDATE_ON_MIGRATE ??
    rootBackendEnv.SPRING_FLYWAY_VALIDATE_ON_MIGRATE ??
    "false",
  SPRING_JPA_DDL_AUTO:
    process.env.SPRING_JPA_DDL_AUTO ??
    backendEnv.SPRING_JPA_DDL_AUTO ??
    rootBackendEnv.SPRING_JPA_DDL_AUTO ??
    "none",
};

const child = spawn(
  command,
  gradleArgs.length > 0 ? gradleArgs : ["bootRun"],
  {
    cwd: backendDir,
    stdio: "inherit",
    env: childEnv,
    shell: isWindows,
  }
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(`Failed to start backend-java via ${command}:`, error.message);
  process.exit(1);
});
