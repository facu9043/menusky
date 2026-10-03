// Proxy de pruebas (solo Frontend, scratchpad): reenvía todo al mock de
// Supabase y, si se pide, hace fallar lecturas concretas con 500.
// POST /__fault {"categories":true} | {"categories":false}
import http from "node:http";
import net from "node:net";
const [listen, target] = [Number(process.argv[2]), Number(process.argv[3])];
const faults = { categories: false, menuItemsWrite: false };
const server = http.createServer((req, res) => {
  if (req.url.startsWith("/__fault")) {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      if (req.method === "POST") Object.assign(faults, JSON.parse(body || "{}"));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(faults));
    });
    return;
  }
  if (faults.categories && req.method === "GET" && req.url.startsWith("/rest/v1/categories")) {
    res.writeHead(500, { "content-type": "application/json" });
    res.end(JSON.stringify({ code: "XX000", message: "fault injected" }));
    return;
  }
  if (faults.menuItemsWrite && req.method === "PATCH" && req.url.startsWith("/rest/v1/menu_items")) {
    res.writeHead(500, { "content-type": "application/json", "access-control-allow-origin": "*" });
    res.end(JSON.stringify({ code: "XX000", message: "fault injected" }));
    return;
  }
  const up = http.request(
    { host: "127.0.0.1", port: target, method: req.method, path: req.url, headers: req.headers },
    (r) => {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res);
    }
  );
  up.on("error", () => {
    res.writeHead(502);
    res.end();
  });
  req.pipe(up);
});
server.on("upgrade", (req, socket, head) => {
  const up = net.connect(target, "127.0.0.1", () => {
    let raw = `${req.method} ${req.url} HTTP/1.1\r\n`;
    for (let i = 0; i < req.rawHeaders.length; i += 2) raw += `${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}\r\n`;
    up.write(raw + "\r\n");
    if (head?.length) up.write(head);
    up.pipe(socket);
    socket.pipe(up);
  });
  up.on("error", () => socket.destroy());
  socket.on("error", () => up.destroy());
});
server.listen(listen, "127.0.0.1", () => console.log(`fault proxy ${listen} -> ${target}`));
