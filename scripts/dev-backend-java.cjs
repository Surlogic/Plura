const path = require("node:path");
const { spawn } = require("node:child_process");

const backendDir = path.resolve(__dirname, "..", "backend-java");
const isWindows = process.platform === "win32";
const command = isWindows ? "gradlew.bat" : "./gradlew";
const gradleArgs = process.argv.slice(2);

const child = spawn(command, gradleArgs.length > 0 ? gradleArgs : ["bootRun"], {
  cwd: backendDir,
  stdio: "inherit",
  env: {
    ...process.env,
    SPRING_FLYWAY_VALIDATE_ON_MIGRATE: "false",
  },
  shell: isWindows,
});

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
