const express = require("express");
const http = require("http");
const SSHClient = require("ssh2").Client;
const utf8 = require("utf8");

const app = express();

const serverPort = 3000;

const server = http.createServer(app);

app.set("view engine", "ejs");

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("index");
});

server.listen(serverPort, () => {
  console.log(`Server running on port ${serverPort}`);
});

const createConnection = (socket, host, port, username, password) => {
  ssh = new SSHClient();

  ssh
    .on("ready", () => {
      socket.emit("data", "\r\n--- CONNECTED TO SSH SERVER, WELCOME ---\r\n");
      socket.emit("status", { host, port, username });

      ssh.shell((err, stream) => {
        if (err) {
          return socket.emit(
            "data",
            `\r\n--- SSH SHELL ERROR: ${err.message} ---\r\n`
          );
        }

        socket.on("data", (data) => {
          stream.write(data);
        });

        stream
          .on("data", (d) => {
            socket.emit("data", utf8.decode(d.toString("binary")));
          })
          .on("close", () => {
            ssh.destroy();
          });
      });
    })
    .on("close", () => {
      socket.emit("data", "\r\n--- SSH CONNECTION CLOSED ---\r\n");
    })
    .on("error", (err) => {
      console.error(err);
      socket.emit(
        "data",
        `\r\n--- SSH CONNECTION ERROR: ${err.message} ---\r\n`
      );
    });

  return ssh;
};

let host, port, username, password;

const io = require("socket.io")(server);

io.on("connection", (socket) => {
  let ssh = new SSHClient();

  socket.on("close", () => {
    ssh.destroy();
  });

  socket.on("reconnect", () => {
    if (host && port && username) {
      ssh.destroy();
      ssh = createConnection(socket, host, port, username, password);
      ssh.connect({
        host,
        port,
        username,
        password,
      });
    }
  });

  socket.on("new-connect", (data) => {
    host = data.host;
    port = Number(data.port);
    username = data.username;
    password = data.password;

    if (host && port && username) {
      ssh.destroy();
      ssh = createConnection(socket, host, port, username, password);
      ssh.connect({
        host,
        port,
        username,
        password,
      });
    }
  });
});
