import * as SerialPort from "serialport";
import { DB } from "./db";
import { EventEmitter } from "events";
import { pduMessage } from "pdu.ts/build";
import logger from './logger';
import { IPCMessage, ModemObjectForInterface, ModemConnection } from "./modemConnectionProcess";
import { SimIdentification } from "./imsi";
import store from "../src/renderer/store";

export interface PDUMessage extends pduMessage {
  dcs: number,
  length: number,
  sender: string,
  sender_type: string,
  smsc_tpdu: string,
  time: Date,
  udh?: {
    length: string,
    iei: string,
    reference_number: string,
    parts: number,
    current_part: number
  }
}


interface Modems {
  [usbID: string]: ModemConnection
}

interface Devices {
  [usbID: string]: Array<USBInfo>;
}

export interface USBInfo {
  path: string;
  manufacturer?: string;
  serialNumber?: string;
  pnpId?: string;
  locationId?: string;
  productId?: string;
  vendorId?: string;
}

export class ModemManager extends EventEmitter {
  modems: Modems;
  db: DB;
  timer: NodeJS.Timer;
  list: Array<SimIdentification>;

  constructor(list: Array<SimIdentification>) {
    super();
    this.db = new DB();
    this.list = list;
    this.setMaxListeners(128);

    this.modems = {};
    this.timer = null;
  }

  // Find all modems and their com ports
  async findDevices(): Promise<Devices> {
    let devices = await SerialPort.list();
    let modemPorts: Devices = {};

    devices.forEach((device: USBInfo) => {
      if (!device.locationId) {
        return;
      }

      if (!modemPorts[device.locationId]) {
        modemPorts[device.locationId] = [];
      }
      modemPorts[device.locationId].push(device);
    });

    return modemPorts;
  }

  saveModemConfig(modem: ModemObjectForInterface) {
    return this.db.saveModemConfig(modem).then(() => {
      this.modems[modem.usbID].reconnectToModem(modem);
    }).catch(err => {
      logger.error(err);
    })
  }

  async findModems(): Promise<Modems> {
    // Get all available com ports
    let devices = await this.findDevices();
    let newDevices = this.findModemsListDifference(devices);

    if (Object.keys(newDevices).length > 0) {
      try {
        await this.connectNewDevices(newDevices);
      } catch (err) {
        logger.error('Error findModems:', err);
      }
    }

    if (!this.timer) {
      this.timer = setInterval(async () => {
        await this.findModems();
      }, 5000);
    }

    return this.modems;
  }

  findModemsListDifference(newList: Devices) {
    let difference: Devices = {};

    // remove unconnected modems
    Object.keys(this.modems).forEach(async usbID => {
      if (Object.keys(newList).indexOf(usbID) === -1) {
        await this.stopModem(usbID);
      }
    })

    // find new devices
    Object.keys(newList).forEach(usbID => {
      if (!this.modems[usbID]) {
        difference[usbID] = newList[usbID];
      }
    });

    return difference;
  }

  async connectNewDevices(devices: Devices): Promise<void> {
    logger.debug('connecting new devices');
    logger.debug("Pool:", process.env.UV_THREADPOOL_SIZE);
    this.emit('loading', true);
    clearInterval(this.timer);
    this.timer = null;
    let promises = [];

    for (let usbID in devices) {
      promises.push(new Promise((resolve, reject) => {
        const env = { ...process.env };
        let child = new ModemConnection(devices[usbID], this.list, this.db)

        child.connect().then(() => {
          this.emit('modemConnected', child.modem.usbID, {
            comPorts: Object.keys(child.modem.comPorts),
            config: child.modem.config,
            info: child.modem.info,
            loading: true,
            online: true,
            usbID: child.modem.usbID,
            usbName: child.modem.usbName
          });
        })

        this.registerListeners(usbID, child)

        const listener = () => {
          this.modems[usbID] = child;
          this.removeListener('modemConnected', listener);
          resolve();
        }

        setTimeout(() => {
          this.removeListener('modemConnected', listener);
          reject();
        }, 15000)

        this.on('modemConnected', listener);
      }))
    }

    Promise.all(promises).then(() => {
      this.emit('loading', false);
    }).catch(err => {
      logger.error('Error while connecting modems', err);
      this.emit('loading', false);
    })
  }

  registerListeners(usbID: string, child: ModemConnection) {
    child.on('modemConnected', (msg: any) => {
      this.emit('modemConnected', usbID, msg.modem);
    })

    child.on('error', (msg: any) => {
      logger.error(msg.error.message)
    })

    child.on('modemUpdated', (msg: any) => {
      if (msg.hasOwnProperty('error')) {
        this.emit('modemUpdated', usbID, msg.error)
        return;
      }
      this.emit('modemUpdated', usbID, msg.modem)
    })

    child.on('newSMSMessage', (msg: any) => {
      this.emit('newSMSMessage', usbID, msg.message);

      this.db.saveMessage(msg.message, msg.info).then(() => {
        console.log('message saved');
      });
    })

    child.on('updating', (msg: any) => {
      this.emit('updating', usbID)
    })

    child.on('updatingFinished', (msg: any) => {
      this.emit('updatingFinished', usbID);
    })

    child.on('modemError', (msg: any) => {
      delete this.modems[usbID];
      store.dispatch('modems/removeModem', usbID)
    })

    child.on('modemDisconnected', (msg: any) => {
      this.emit('modemDisconnected', usbID)
    })

    child.on('modemReconnected', (msg: any) => {
      this.emit('modemUpdated', usbID, msg.modem);
    })

    child.on('db', (msg: any) => {
      this.dbCall(msg.method, msg.params).then((result) => {
        child.emit('dbResponse', {
          method: msg.method,
          data: result
        })
      })
    })

    child.on('message', (msg: any) => {
      console.log(msg);
    })
  }

  dbCall(method: string, params: Array<any>) {
    if (!this.db[method]) {
      return;
    }

    return this.db[method](...params);
  }

  stopModem(usbID: string) {
    return new Promise((resolve, reject) => {
      if (!this.modems[usbID]) {
        reject('usbID = ' + usbID + ' not found in list');
      }

      const listener = () => {
        this.modems[usbID].removeListener('exit', listener);
        delete this.modems[usbID];
        resolve();
      }

      setTimeout(() => {
        this.modems[usbID].removeListener('exit', listener);
        reject('Disconnect time is up!');
      }, 5000)

      this.modems[usbID].on("exit", listener);

      delete this.modems[usbID];
    }).then(() => {
      delete this.modems[usbID];
    })
  }

  disconnectAllModems() {
    for (let usbID in this.modems) {
      this.disconnectModem(usbID);
    }
    clearInterval(this.timer);
    this.timer = null;
  }

  disconnectModem(usbID: string) {
    return new Promise((resolve, reject) => {
      if (!this.modems[usbID]) {
        reject('usbID = ' + usbID + ' not found in list');
      }
      this.modems[usbID].emit('disconnectModem')
      this.modems[usbID].disconnectModem()

      delete this.modems[usbID];

      const listener = () => {
        this.removeListener('modemDisconnected', listener);
        resolve();
      }

      setTimeout(() => {
        this.removeListener('modemDisconnected', listener);
        reject('Disconnect time is up!');
      }, 5000)

      this.on('modemDisconnected', listener);
    })
  }
}
