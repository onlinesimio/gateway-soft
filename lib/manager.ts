import * as SerialPort from "serialport";
import { DB } from "./db";
import { EventEmitter } from "events";
import { pduMessage } from "pdu.ts/build";
import logger from './logger';
import { ChildProcess } from "child_process";
import { fork } from "child_process";
import { IPCMessage, ModemObjectForInterface } from "./modemConnectionProcess";
import { SimIdentification } from "./imsi";

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
  [usbID: string]: ChildProcess
}

interface Devices {
  [usbID: string]: Array<USBInfo>;
}

interface USBInfo {
  comName: string;
  manufacturer?: string;
  serialNumber?: string;
  pnpId?: string;
  locationId: string;
  vendorId?: string;
  productId?: string;
}

export class ModemManager extends EventEmitter {
  modems: Modems;
  db: DB;
  timer: NodeJS.Timer;
  list: SimIdentification;

  constructor(dbPath: string, list: SimIdentification) {
    super();
    this.db = new DB(dbPath);
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
      this.modems[modem.usbID].send({
        event: 'reconnect',
        data: modem
      })
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
    this.emit('loading', true);
    clearInterval(this.timer);
    this.timer = null;
    let promises = [];

    for (let usbID in devices) {
      promises.push(new Promise((resolve, reject) => {
        const env = { ...process.env };
        let child = fork('./dist/main/modemConnectionProcess', [], {
          env,
          stdio: [0, 1, 2, 'ipc']
        });

        logger.debug('fork: ', child.pid);

        child.send({
          event: 'start',
          data: {
            simIdentification: this.list,
            ports: devices[usbID]
          }
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

  registerListeners(usbID: string, child: ChildProcess) {
    child.on('message', (msg: IPCMessage) => {
      switch (msg.event) {
        case 'error': {
          logger.error(msg.error.message)
          break;
        }
        case 'modemConnected': {
          this.emit('modemConnected', usbID, msg.data.modem);
          break;
        }
        case 'modemUpdated': {
          if (msg.hasOwnProperty('error')) {
            this.emit('modemUpdated', usbID, msg.error)
            return;
          }
          this.emit('modemUpdated', usbID, msg.data.modem)
          break;
        }
        case 'newSMSMessage': {
          this.emit('newSMSMessage', usbID, msg.data.message);

          this.db.saveMessage(msg.data.message, msg.data.info).then(() => {
            console.log('message saved');
          });
          break;
        }
        case 'updating': {
          this.emit('updating', usbID)
          break;
        }
        case 'updatingFinished': {
          this.emit('updatingFinished', usbID);
          break;
        }
        case 'modemError': {
          delete this.modems[usbID];
          break;
        }
        case 'modemDisconnected': {
          this.emit('modemDisconnected', usbID)
          break;
        }
        case 'modemReconnected': {
          this.emit('modemUpdated', usbID, msg.data.modem);
          break;
        }
        case 'db': {
          this.dbCall(msg.method, msg.params).then((result) => {
            child.send({
              event: 'dbResponse',
              method: msg.method,
              data: result
            })
          })
          break;
        }
      }
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

      this.modems[usbID].kill();
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
      this.modems[usbID].send({
        event: 'disconnectModem'
      })

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
