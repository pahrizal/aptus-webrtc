import express, { type Express } from "express";
import http from "http";
import https from "https";
import fs from "fs";
import type { IConfig } from "./config";
import defaultConfig from "./config";
import type { PeerServerEvents } from "./instance";
import { createInstance } from "./instance";
import type { IClient } from "./models/client";
import type { IMessage } from "./models/message";
import path from "path";

export type { MessageType } from "./enums";
export type { IClient, IConfig, IMessage, PeerServerEvents };

const PORT = parseInt(process.env.PORT || "5100");

function ExpressPeerServer(
  server: https.Server | http.Server,
  options?: Partial<IConfig>
) {
  const app = express();

  const newOptions: IConfig = {
    ...defaultConfig,
    ...options,
  };

  if (newOptions.proxied) {
    app.set(
      "trust proxy",
      newOptions.proxied === "false" ? false : !!newOptions.proxied
    );
  }

  app.on("mount", () => {
    if (!server) {
      throw new Error(
        "Server is not passed to constructor - " + "can't start PeerServer"
      );
    }

    createInstance({ app, server, options: newOptions });
  });

  return app as Express & PeerServerEvents;
}

function PeerServer(
  options: Partial<IConfig> = {},
  callback?: (server: https.Server | http.Server) => void
) {
  const app = express();

  let newOptions: IConfig = {
    ...defaultConfig,
    ...options,
  };

  const port = newOptions.port;
  const host = newOptions.host;

  let server: https.Server | http.Server;

  const { ssl, ...restOptions } = newOptions;
  if (ssl && Object.keys(ssl).length) {
    console.log("serving using HTTPS");
    server = https.createServer(
      {
        key: fs.readFileSync("localhost.key"),
        cert: fs.readFileSync("localhost.cert"),
      },
      app
    );

    newOptions = restOptions;
  } else {
    server = http.createServer(app);
  }

  const peerjs = ExpressPeerServer(server, newOptions);
  app.use(peerjs);

  server.listen(port, host, () => callback?.(server));

  return peerjs;
}

const app = PeerServer(
  {
    port: PORT,
    path: "/webrtc/",
    allow_discovery: true,
    ssl:
      process.env.NODE_ENV === "production" ? undefined : { key: "", cert: "" },
  },
  () => {
    console.log("server listening on port " + PORT);
  }
);

const static_folder = path.join(__dirname, "/ui");
console.log(static_folder);
app.use(express.static(static_folder));
app.get("/", (_, res) => {
  res.sendFile(path.join(__dirname, "/ui/index.html"));
});

export { ExpressPeerServer, PeerServer };
