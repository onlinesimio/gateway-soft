import * as SerialPort from "serialport";
import { EventEmitter } from "events";
import logger from './logger';

export class Deferred {
  resolve: Function | null;
  reject: Function | null;
  timeout: number;
  timer: NodeJS.Timer;
  promise: Promise<any>;

  constructor(timeout: number) {
    this.resolve = null;
    this.reject = null;
    this.timeout = timeout || 5000;

    this.promise = new Promise((resolve, reject) => {
      this.timer = setTimeout(() => {
        reject("Time is up");
      }, this.timeout);
      this.resolve = (data: any) => {
        clearTimeout(this.timer);
        resolve(data);
      };
      this.reject = (reason: any) => {
        clearTimeout(this.timer);
        reject(reason);
      };
    });
    Object.freeze(this);
  }
}

export interface Command {
  deferr: Deferred;
  commandName: string;
}

export interface USSDResponse {
  code: string;
  message: string;
  length: number;
}

const events = [
  {
    expr: /^OVER-VOLTAGE WARNNING$/i,
    cb: function (m: Array<string>) {
      this.emit("over-voltage warnning");
    }
  },

  {
    expr: /^RING$/i,
    cb: function (m: Array<string>) {
      this.ringing = true;
      this.emit("ring");
    }
  },

  {
    expr: /^\+CMTI:(.+)$/i,
    cb: function (m: Array<string>) {
      this.emit("sms", m[1]);
    }
  },

  {
    expr: /^\+CPIN: (NOT .+)/i,
    cb: function (m: Array<string>) {
      this.emit("sim error", m[1]);
    }
  },

  {
    expr: /^RSSI: (NOT .+)/i,
    cb: function (m: Array<string>) {
      this.emit("singal level", m[1]);
    }
  },

  {
    expr: /^\+ZOPERTER: (NOT .+)/i,
    cb: function (m: Array<string>) {
      this.emit("beeline", m[1]);
    }
  },

  {
    expr: /^\+CUSD:(.+)$/i,
    cb: function (line: string) {
      let code = line[7];
      let message = line.match(/"(\S+)"/)[1];
      let length = line.match(/",(\d+)/)[1];
      this.emit("ussd", {
        code,
        message,
        length
      });
    }
  }
];

export class ModemConnector extends EventEmitter {
  opened: boolean;
  portName: string;
  port: SerialPort;
  listenPort: SerialPort;
  lines: Array<string>;
  commandsQueue: Array<Command>;
  timeout: number;
  lineEnd: string;

  constructor(portName: string) {
    super();
    this.opened = false;
    this.portName = portName;
    this.port = null;
    this.listenPort = null;
    this.lines = [];
    this.commandsQueue = [];
    this.timeout = 5000;
    this.lineEnd = "\r\n";
  }

  open(timeout: number) {
    if (this.opened) {
      return;
    }

    this.timeout = timeout;

    this.port = new SerialPort(this.portName, {
      baudRate: 115200
    });
    let deferr = new Deferred(timeout);

    deferr.promise.catch(err => {
      if (this.opened) {
        this.port.close();
      }
      throw err;
    });

    this.port.on("open", () => {
      const parser = this.port.pipe(
        new SerialPort.parsers.Readline({
          delimiter: this.lineEnd,
          encoding: "utf8"
        })
      );

      parser.on("data", (data: string) => {
        this._processLine(data);
      });

      this.sendCommand("AT")
        .then(res => {
          deferr.resolve(this);
        })
        .catch(err => {
          if (this.opened) {
            this.close();
          }
          deferr.reject(err);
        });
    });

    this.port.on("error", error => {
      this.opened = false;
      deferr.reject("ERROR " + error);
    });

    return deferr.promise
      .then(() => {
        this.opened = true;
      }).catch(err => {
        this.opened = false;
        throw err;
      })
  }

  close() {
    let deferr = new Deferred(this.timeout);

    this.removeAllListeners();

    if (!this.opened) {
      this.port.removeAllListeners();
      deferr.resolve(this);
      return;
    }

    this.port.on("close", () => {
      deferr.resolve(this);
    });

    this.port.close();

    return deferr.promise
      .then(() => {
        this.opened = false;
        this.port.removeAllListeners();
        this.port = null;
        logger.debug("connection closed");
      })
      .catch(err => {
        this.opened = false;
        this.port.removeAllListeners();
        this.port = null;
      });
  }

  sendCommand(command: string) {
    let deferr = new Deferred(this.timeout);

    if (command !== "AT") {
      if (!this.opened) {
        deferr.reject(new Error("Port closed"));
      }
    }

    if (
      this.commandsQueue.push({
        deferr,
        commandName: command
      }) === 1
    ) {
      this._executeNext();
    }

    return deferr.promise;
  }

  _executeNext() {
    let commandObject = this.commandsQueue[0];

    if (!commandObject) {
      return;
    }

    this.port.write(commandObject.commandName + "\r");
  }

  _processExternalEvents(line: string) {
    for (let i = 0; i < events.length; i++) {
      let event = events[i];
      let match = line.match(event.expr);

      if (match) {
        logger.debug("event catched", line);
        event.cb.call(this, line);

        return true;
      }
    }

    return false;
  }

  _processLine(line: string) {
    if (line.substr(0, 2) == "AT") {
      return;
    }

    // if (line.match(/^\+CME ERROR/i)) {

    // }

    // Process events, like new message or ring from channel
    if (this._processExternalEvents(line)) {
      logger.debug("process external events", line);
      return;
    }

    this.lines.push(line);

    if (!this._isResultCode(this.lines[this.lines.length - 1])) {
      return;
    }

    if (this.lines[0].trim() === "") {
      this.lines.shift();
    }

    this._processResponse();
  }

  _processResponse() {
    let responseCode = this.lines.pop();
    let command = this.commandsQueue[0];

    if (responseCode == "> ") {
      return;
    }

    if (responseCode.match(/^CONNECT( .+)*$/i)) {
      return;
    }

    if (command) {
      this.commandsQueue.shift();
      if (responseCode === "ERROR") {
        command.deferr.resolve({
          code: responseCode,
          command: command.commandName,
          data: null
        });
        return;
      }

      command.deferr.resolve({
        code: responseCode,
        command: command.commandName,
        data: this.lines
      });
    }

    if (this.commandsQueue.length) {
      this._executeNext();
    }

    this.lines = [];
  }

  _isResultCode(line: string) {
    return /(^OK|ERROR|BUSY|DATA|NO CARRIER|> $)|(^CONNECT( .+)*$)/i.test(line);
  }
}
