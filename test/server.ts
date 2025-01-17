import { createServer, type Server } from "http";
let server: null | Server = null;

export function startServer(debug?: boolean) {
  if (!server) {
    server = createServer();
    server.on("request", (request, response) => {
      const body: Uint8Array[] = [];
      request
        .on("data", (chunk) => {
          body.push(chunk as Uint8Array);
        })
        .on("end", () => {
          if (debug) {
            console.log(`==== ${request.method ?? "UNKNOWN"} ${request.url ?? "UNKNOWN"}`);
            console.log("> Headers");
            console.log(request.headers);

            console.log("> Body");
            console.log(Buffer.concat(body).toString());
          }
          response.end();
        });
    });
    server.listen(8083);
  }
}

export function stopServer() {
  if (server) {
    server.close();
  }
}
