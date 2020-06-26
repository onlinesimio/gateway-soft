import { PDUParser } from "pdu.ts";
import { ModemConnector, USSDResponse } from "./modem";
import { EventEmitter } from "events";
import { USSDCommands } from "./imsi";
import { PDUMessage } from "./manager";

export interface IMSIResponse {
  code: "OK" | "ERROR";
  imsi?: string;
}

export interface DeviceInfo {
  manufacturer: string;
  model: string;
  software?: string;
  imei: string;
  simCard: boolean;
  imsi?: string;
  operator?: string;
  country?: string;
  ussdCommands?: USSDCommands | '';
}

export interface DriverConfig {
  name?: string,
  baudrate: number,
  timeout: number,
  comPort: string
  // encodeUSSD?: boolean,
  // disableDebugInfo?: boolean // TODO: Add additional configuration for huawei modems to automatically disable debug information
}

export interface MessagesResponse {
  code: "OK" | "ERROR",
  messages: Array<SmsMessage>
}

export interface SmsMessage {
  status: 0 | 1,
  indexInMemory: number,
  length: number,
  message: PDUMessage
}

export type MessagesMemoryType = 'SM' | 'ME' | 'MT' | 'BM' | 'SR' | 'TA';

export interface MessagesMemory {
  read: {
    type: MessagesMemoryType,
    max: number,
    used: number
  },
  sending: {
    type: MessagesMemoryType,
    max: number,
    used: number
  },
  receiving: {
    type: MessagesMemoryType,
    max: number,
    used: number
  }
}

export class DriverConnector {
  static async connect(config: DriverConfig): Promise<Driver> {
    let driver = new Driver(config);

    return driver.modem.open(config.timeout).then(() => {
      return driver.modem.sendCommand('AT+CMGF=0')
    }).then(res => {
      // if (res.code !== 'OK') {
      //   driver.modem.close();
      //   throw new Error("Modem is not supported");
      // }
      return driver.modem.sendCommand('AT^CURC=0')
    }).then(res => {
      return driver
    })
  }
}

export class Driver extends EventEmitter {
  modem: ModemConnector;
  timeout: number;

  constructor(config: DriverConfig) {
    super();
    this.modem = new ModemConnector(config.comPort);
    this.timeout = config.timeout;
  }

  sendUSSD(ussd: string): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        let res = await this.modem.sendCommand("AT+CUSD=1," + PDUParser.ussdEncode(ussd) + ",15");

        if (res.code === "ERROR") {
          throw new Error(res);
        }

        let timer: NodeJS.Timer = null;
        let listener = (data: USSDResponse) => {
          clearTimeout(timer);
          this.modem.removeListener("ussd", listener);
          console.log(data);
          resolve(PDUParser.decode16Bit(data.message));
        };
        this.modem.on("ussd", listener);
        timer = setTimeout(() => {
          this.modem.removeListener("ussd", listener);
          reject(new Error("timeout"));
        }, this.timeout);
      } catch (err) {
        reject(err);
      }
    });
  }

  getIMSI(): Promise<IMSIResponse> {
    return this.modem.sendCommand("AT+CIMI").then(response => {
      if (response.code !== "OK") {
        return {
          code: response.code,
          imsi: 'undefined'
        }
      }
      return {
        code: response.code,
        imsi: response.data ? response.data[0] : 'undefined'
      };
    });
  }

  async getDeviceInfo(): Promise<DeviceInfo> {
    let manufacturer = await this.getManufacturer();
    let model = await this.getModel();
    let software = await this.getSoftwareVersion();
    let imei = await this.getIMEI();

    return {
      manufacturer,
      model,
      software,
      imei,
      simCard: false
    };
  }

  getManufacturer(): Promise<string> {
    return this.modem.sendCommand("AT+CGMI").then(response => {
      if (response.code !== "OK") {
        return "unknown";
      }
      return response.data[0];
    });
  }

  getModel(): Promise<string> {
    return this.modem.sendCommand("AT+CGMM").then(response => {
      if (response.code !== "OK") {
        return "unknown";
      }
      return response.data[0];
    });
  }

  getSoftwareVersion(): Promise<string> {
    return this.modem.sendCommand("AT+CGMR").then(response => {
      if (response.code !== "OK") {
        return "unknown";
      }
      return response.data[0];
    });
  }

  getIMEI(): Promise<string> {
    return this.modem.sendCommand("AT+CGSN").then(response => {
      if (response.code !== "OK") {
        return "unknown";
      }
      return response.data[0];
    });
  }

  getNewMessages(): Promise<MessagesResponse> {
    return this.modem.sendCommand("AT+CMGL=0").then(response => {
      let messages: Array<SmsMessage> = [];
      if (response.code === 'OK') {
        if (response.data.length > 0) {
          for (let i = 0; i < response.data.length; i += 2) {
            let str = response.data[i].substr(6, response.data[i].length);
            let items = str.split(',');
            messages.push({
              status: items[1],
              indexInMemory: items[0],
              length: items[3],
              message: PDUParser.Parse(response.data[i + 1])
            })
          }
        }
      }
      return {
        code: response.code,
        messages: messages
      };
    })
  }

  getAllMessages(): Promise<MessagesResponse> {
    return this.modem.sendCommand("AT+CMGL=4").then(response => {
      let messages = [];
      if (response.code === 'OK') {
        if (response.data.length > 0) {
          for (let i = 0; i < response.data.length; i += 2) {
            let str = response.data[i].substr(6, response.data[i].length);
            let items = str.split(',');
            messages.push({
              status: items[1],
              indexInMemory: items[0],
              length: items[3],
              message: PDUParser.Parse(response.data[i + 1])
            })
          }
        }
      }
      return {
        code: response.code,
        messages: messages
      };
    })
  }

  getMessage(index: number): Promise<PDUMessage> {
    return this.modem.sendCommand("AT+CMGR=" + index).then(response => {
      if (response.code !== "OK") {
        throw new Error("Unable to read message: " + response.code);
      }
      return PDUParser.Parse(response.data[1]);
    });
  }

  deleteMessage(index: number): Promise<boolean> {
    return this.modem.sendCommand("AT+CMGD=" + index).then(response => {
      if (response.code !== 'OK') {
        return false;
      }
      return true;
    })
  }

  getMessagesMemory(): Promise<MessagesMemory> {
    return this.modem.sendCommand("AT+CPMS?").then(response => {
      if (response.code !== 'OK') {
        throw new Error("Can't receive modem memory info");
      }

      let data = response.data[0];
      data = data.substr(7, data.length);
      let parsed = data.split(',');
      let result: MessagesMemory = {
        read: {
          type: parsed[0],
          used: parsed[1],
          max: parsed[2]
        },
        sending: {
          type: parsed[3],
          used: parsed[4],
          max: parsed[5]
        },
        receiving: {
          type: parsed[6],
          used: parsed[7],
          max: parsed[8]
        }
      }
      return result;
    })
  }

  setupMessagesMemory(read: MessagesMemoryType, sending: MessagesMemoryType, receiving: MessagesMemoryType): Promise<boolean> {
    return this.modem.sendCommand(`AT+CPMS="${read}","${sending}","${receiving}"`).then(result => {
      if (result.code !== 'OK') {
        throw new Error("Can't setup messages memory");
      }

      return true;
    })
  }

  getAvailableMemoryTypes(): Promise<Array<MessagesMemoryType>> {
    return this.modem.sendCommand("AT+CPMS=?").then(response => {
      if (response.code !== 'OK') {
        throw new Error("Can't receive modem memory info");
      }

      let data = response.data[0];
      data = data.match(/"(.+?)"/ig);
      data = data.map(item => {
        return item.replace(/"/g, '', );
      })
      return data.splice(0, data.length / 3);
    })
  }

  close() {
    if (this.modem.opened) {
      return this.modem.close();
    }
  }
}
