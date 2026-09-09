/**
 * Custom production entry point for cPanel's Node.js Selector (Phusion Passenger).
 *
 * Passenger starts this file directly (not via `next start`) and tells it which port to
 * listen on through process.env.PORT - `next start` alone has no way to honor that, hence
 * this wrapper. See docs/decisions.md and docs/README.md §5 for the cPanel-side setup.
 *
 * Plain CommonJS on purpose: this file runs directly under Node, unbundled by Next's
 * compiler, and package.json has no "type": "module" - keeping it CJS needs no project-wide
 * module-system change just for one entry file.
 */
const { createServer } = require("node:http");
const next = require("next");

const port = parseInt(process.env.PORT || "3000", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => {
      handle(req, res);
    }).listen(port, () => {
      console.log(
        `> Viora server listening on port ${port} (${dev ? "development" : process.env.NODE_ENV || "production"})`,
      );
    });
  })
  .catch((error) => {
    console.error("Failed to start Viora server:", error);
    process.exit(1);
  });
