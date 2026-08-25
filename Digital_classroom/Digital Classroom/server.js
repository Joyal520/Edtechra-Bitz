const http = require("http");
const fs = require("fs");
const path = require("path");

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT) || 5173;
const ROOT = __dirname;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp"
};

function send(response, statusCode, body, contentType = "text/plain; charset=utf-8") {
  response.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });
  response.end(body);
}

function safeResolve(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split("?")[0]);
  const relativePath = decodedPath === "/" ? "/index.html" : decodedPath;
  const normalizedPath = path.normalize(relativePath).replace(/^(\.\.[/\\])+/, "");
  const absolutePath = path.join(ROOT, normalizedPath);

  if (!absolutePath.startsWith(ROOT)) {
    return null;
  }

  return absolutePath;
}

const server = http.createServer((request, response) => {
  const filePath = safeResolve(request.url || "/");

  if (!filePath) {
    send(response, 403, "Forbidden");
    return;
  }

  fs.stat(filePath, (statError, stats) => {
    if (statError) {
      send(response, 404, "Not Found");
      return;
    }

    const resolvedPath = stats.isDirectory()
      ? path.join(filePath, "index.html")
      : filePath;

    fs.readFile(resolvedPath, (readError, data) => {
      if (readError) {
        send(response, 404, "Not Found");
        return;
      }

      const extension = path.extname(resolvedPath).toLowerCase();
      const contentType = MIME_TYPES[extension] || "application/octet-stream";
      send(response, 200, data, contentType);
    });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Edtechra Digital Classroom running at http://${HOST}:${PORT}/teacher-dashboard.html`);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Close the existing server or run with a different PORT.`);
    process.exit(1);
  }

  console.error(error);
  process.exit(1);
});
