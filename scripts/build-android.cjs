/* Web build for the Android app, then copy it into android/.
   PUBLIC_URL must be "/" (same as Netlify, see netlify.toml): package.json's
   "homepage": "./" is for Electron (file://), and with relative paths every
   lazy chunk opened from a deep route (/returns/menu) is fetched from
   /returns/static/js/… → ChunkLoadError → blank screen inside the app. */
const { execSync } = require("child_process");

const env = { ...process.env, PUBLIC_URL: "/", GENERATE_SOURCEMAP: "false" };
const run = (cmd) => execSync(cmd, { stdio: "inherit", env, cwd: require("path").join(__dirname, "..") });

run("npx react-scripts build");
run("npx cap sync android");
