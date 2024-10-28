let socket;

$(() => {
  /**
   * Terminal setup
   */
  const terminalContainer = $("#terminal")[0];

  const term = new Terminal({
    cursorBlink: true,
    cursorStyle: "block",
  });
  const fitAddon = new FitAddon.FitAddon();
  term.loadAddon(fitAddon);

  term.open(terminalContainer);
  fitAddon.fit();

  window.addEventListener("resize", () => {
    fitAddon.fit();
  });

  socket = io.connect();
  socket.on("connect", () => {
    term.write("\r\nConnected to socket server\r\n");
    term.write("\r\nClick 'New Connect' to start a new SSH session\r\n");

    term.onData((data) => {
      socket.emit("data", data);
    });

    socket.on("data", (data) => {
      term.write(data);
    });

    socket.on("disconnect", () => {
      term.write("\r\nDisconnected from socket server\r\n");
    });
  });

  term.focus();

  /**
   * Modal setup
   */
  const modalBg = $("#modal-background");
  const modal = $("#modal");
  const closeBtn = $(".close-modal");
  const connectBtn = $("#connect");

  const openModal = () => {
    modalBg.fadeIn();
    modal.fadeIn();
  };

  const closeModal = () => {
    modalBg.fadeOut();
    modal.fadeOut();
  };

  closeBtn.click(() => {
    closeModal();
  });

  const form = $("#connect-form");

  connectBtn.click(() => {
    form.submit();
  });

  modalBg.click(() => {
    closeModal();
  });

  form.submit((e) => {
    e.preventDefault();
    const host = $("#host").val();
    const port = $("#port").val();
    const username = $("#username").val();
    const password = $("#password").val();

    const setErrors = (id, message) => {
      $(`#${id}-error`).text(message);
    };

    const clearErrors = () => {
      $(".error-msg").text("");
    };

    if (!host) {
      setErrors("host", "Host is required");
      return;
    }

    const portRegex = /^\d+$/;
    if (!port || !portRegex.test(port)) {
      setErrors("port", "Port is required and must be a number");
      return;
    }

    if (!username) {
      setErrors("username", "Username is required");
      return;
    }

    clearErrors();

    socket.emit("close");
    term.clear();
    socket.emit("new-connect", { host, port, username, password });
    term.write(`\r\nConnecting to ${host}:${port} as ${username}...\r\n`);
    closeModal();
  });

  /**
   * Status setup
   */
  const status = $("#status");
  const sshHost = $(".ssh-host");
  const sshPort = $(".ssh-port");
  const sshUsername = $(".ssh-username");

  const closeStatus = $("#close-status");

  closeStatus.click(() => {
    closeStatus.toggleClass("close");

    if (closeStatus.hasClass("close")) {
      status.slideUp();
    } else {
      status.slideDown();
    }
  });

  socket.on("status", (data) => {
    sshPort.text(data.port);
    sshHost.text(data.host);
    sshUsername.text(data.username);
  });

  /**
   * Button event listeners
   */
  $("#reconnect").click(() => {
    socket.emit("close");
    term.clear();
    socket.emit("reconnect");
  });

  $("#disconnect").click(() => {
    socket.emit("close");
  });

  $("#new-connect").click(() => {
    openModal();
  });
});
