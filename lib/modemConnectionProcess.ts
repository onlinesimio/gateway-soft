import { DriverConnector, DeviceInfo, MessagesMemory, Driver, DriverConfig } from "./driver";
import logger from './logger';
import { IMSIParser, SimIdentification } from "./imsi";
import { EventEmitter } from "events";
import {PDUMessage, USBInfo} from "./manager";
import {DB} from "./db";

interface Modem {
  driver: Driver;
  vendorId: string;
  deviceId: string;
  usb: string;
  connected: boolean;
}

interface PortsList {
  [comPort: string]: Modem,
}

export interface PortData {
  usbID: string,
  usbName: string,
  comPorts: PortsList,
  info: DeviceInfo,
  config: DriverConfig,
  online: boolean,
}

export interface ModemObjectForInterface {
  usbID: string,
  usbName: string,
  comPorts: Array<string>,
  info: DeviceInfo,
  config: DriverConfig,
  loading: boolean,
  online: boolean,
}

interface StartMessage {
  event: 'start',
  data: {
    ports: Array<USBInfo>,
    simIdentification: Array<SimIdentification>
  }
}

interface StopMessage {
  event: 'stop',
}

interface ErrorMessage {
  event: 'error',
  error?: {
    message: string
  }
}

interface ModemErrorMessage {
  event: 'modemError',
}

interface ModemConnectedMessage {
  event: 'modemConnected',
  data: {
    usbID: string,
    modem: ModemObjectForInterface
  }
}

// interface ModemRemovedMessage {
//   event: 'modemRemoved'
// }

interface ModemUpdatingMessage {
  event: 'updating'
}

interface ModemUpdatingFinishedMessage {
  event: 'updatingFinished'
}

interface ModemUpdatedMessage {
  event: 'modemUpdated',
  data?: {
    usbID: string,
    modem: ModemObjectForInterface
  },
  error?: {
    message: string
  }
}

interface ModemDisconnectedMessage {
  event: 'modemDisconnected',
  data: {
    usbID: string
  }
}

interface MessageToInterface {
  sender: string,
  text: string,
  udh?: {
    length: string,
    iei: string,
    reference_number: string,
    parts: number,
    current_part: number
  }
}

interface NewSmsMessage {
  event: 'newSMSMessage',
  data: {
    message: PDUMessage,
    info: DeviceInfo
  }
}

interface ReconnectMessage {
  event: 'reconnect',
  data: {
    config: DriverConfig
  }
}

interface ModemReconnectedMessage {
  event: 'modemReconnected',
  data: {
    modem: ModemObjectForInterface
  }
}

export interface DBMessage {
  event: 'db',
  method: string,
  params: Array<any>
}

export interface DBMessageResponse {
  event: 'dbResponse',
  method: string,
  data: any
}

export type IPCMessage = StartMessage | StopMessage | ReconnectMessage | ModemReconnectedMessage | ErrorMessage | ModemErrorMessage | ModemConnectedMessage | ModemUpdatingMessage | ModemUpdatedMessage | ModemDisconnectedMessage | DBMessageResponse | DBMessage | NewSmsMessage | ModemUpdatingFinishedMessage;

interface MessagesGluing {
  [reference_number: string]: {
    [part: number]: string
  }
}

logger.transports.file.level = 'debug';
var modemConnection = null;

export class ModemConnection extends EventEmitter {

  timer: NodeJS.Timer;
  modem: PortData;
  ports: Array<USBInfo>
  messagesGluing: MessagesGluing;
  parser: IMSIParser;
  db: DB;

  constructor(ports: Array<USBInfo>, simIdentification: Array<SimIdentification>, db:DB) {
    super();

    this.timer = null;
    this.modem = null;
    this.ports = ports;
    this.messagesGluing = {};
    this.parser = new IMSIParser(simIdentification);
    this.db = db;

    this.registerListeners();
    this.setMaxListeners(128);
  }

  registerListeners() {
    this.on('message', (msg: IPCMessage) => {
      switch (msg.event) {
        case 'start': {
          this.emit('start', msg.data);
          break;
        }
        case 'stop': {
          this.emit('stop');
          break;
        }
        case 'reconnect': {
          this.emit('reconnect', msg.data);
          break;
        }
        case 'dbResponse': {
          this.emit('db:' + msg.method, {
            method: msg.method,
            result: msg.data
          });
          break;
        }
      }
    })
  }

  async connect(): Promise<void> {
    let config: DriverConfig = await this.db.findDeviceConfig(this.ports[0].vendorId, this.ports[0].productId);
    for (const port of this.ports) {
      try {
        logger.debug('connecting to: ', port.path);
        config.comPort = port.path;
        let driver = await DriverConnector.connect(config);
        let info = await driver.getDeviceInfo();
        logger.debug('Device info:', info);
        let simInfo = await this.getSimInfo(driver, info);
        logger.debug('Sim info:', simInfo);
        let userConfig = null;
        try {
          userConfig = await this.db.findUserConfigForImei(info.imei);
          if (userConfig) {
            userConfig.comPort = port.path
          }
        } catch (err) {
          logger.error('Error on find user config for imei');
        }

        if (simInfo.simCard) {
          await this.correctMemoryType(driver);
        }

        let usbName = await this.db.getUSBPortName(port.locationId);
        let comPorts = {};
        for (let j = 0; j < this.ports.length; j++) {
          comPorts[this.ports[j].path] = {
            connected: false,
            driver: null,
            vendorId: port.vendorId || 'unknown',
            deviceId: port.productId || 'unknown',
            usb: port.locationId,
          }
        }
        comPorts[port.path] = {
          connected: driver.modem.opened,
          driver,
          vendorId: port.vendorId || 'unknown',
          deviceId: port.productId || 'unknown',
          usb: port.locationId,
        }

        this.modem = {
          usbID: port.locationId,
          usbName: usbName,
          comPorts,
          config: userConfig || config,
          info: simInfo,
          online: true,
        }

        logger.debug('modem saved');
        break;
      } catch (err) {
        logger.error('Error while connecting to port: ', err);
        this.emit('modemError')
      }
    }

    if (!this.timer) {
      logger.debug('set timer');
      this.timer = setInterval(async () => {
        await this.updateModemInfo();
      }, 5000);
    }
  }

  async correctMemoryType(driver: Driver) {
    try {
      let availableMemoryTypes = await driver.getAvailableMemoryTypes();
      let currentMemorySetup: MessagesMemory = await driver.getMessagesMemory();

      if (currentMemorySetup.read.type !== currentMemorySetup.receiving.type) {
        logger.debug('setup memory type');
        if (availableMemoryTypes.indexOf('ME') !== -1) {
          await driver.setupMessagesMemory('ME', 'ME', 'ME');
        } else {
          await driver.setupMessagesMemory('SM', 'SM', 'SM');
        }
      }
    } catch (err) {
      logger.error('Memory type error: ', err);
      await driver.setupMessagesMemory('ME', 'ME', 'ME');
    }
  }

  async updateModemInfo() {
    this.emit('updating');
    // Последнее условие - дикий костыль от ON-565
    logger.debug(this.modem);
    let port = this.modem.comPorts[this.modem.config.comPort] || this.modem.comPorts[Object.keys(this.modem.comPorts)[0]];
    try {
      let info = await this.getSimInfo(port.driver, this.modem.info);

      if (info.simCard) {
        await this.correctMemoryType(port.driver);

        await this.processMessages(info, port.driver);
      }

      this.modem.info = info;

      let modem: ModemObjectForInterface = {
        comPorts: Object.keys(this.modem.comPorts),
        config: this.modem.config,
        info: this.modem.info,
        online: this.modem.online,
        usbID: this.modem.usbID,
        usbName: this.modem.usbName,
        loading: false
      }
      this.emit('updatingFinished')
      this.emit('modemUpdated', {
        usbID: this.modem.usbID,
        modem
      })
    } catch (err) {
      let modem: ModemObjectForInterface = {
        comPorts: Object.keys(this.modem.comPorts),
        config: this.modem.config,
        info: this.modem.info,
        online: this.modem.online,
        usbID: this.modem.usbID,
        usbName: this.modem.usbName,
        loading: false
      }
      await this.reconnectToModem(modem);
      this.emit('updatingFinished');
      logger.error('Error on modem update:', err);
    }
  }

  async processMessages(info: DeviceInfo, driver: Driver) {
    let response = await driver.getAllMessages();
    if (response.code === 'OK' && response.messages.length > 0) {
      for (let i = 0; i < response.messages.length; i++) {
        let message = response.messages[i].message;
        logger.debug('saveMessage: ', response.messages[i]);

        let messageToSend: MessageToInterface = {
          sender: message.sender,
          text: message.text,
        }
        if (message.udh) {
          if (message.udh.parts > 0) {
            if (!this.messagesGluing[message.udh.reference_number]) {
              this.messagesGluing[message.udh.reference_number] = [];
            }

            this.messagesGluing[message.udh.reference_number][message.udh.current_part] = message.text;

            if (Object.keys(this.messagesGluing[message.udh.reference_number]).length === message.udh.parts) {
              messageToSend.text = '';
              for (let currentPart in this.messagesGluing[message.udh.reference_number]) {
                messageToSend.text += this.messagesGluing[message.udh.reference_number][currentPart];
              }

              delete this.messagesGluing[message.udh.reference_number];
            } else {
              await driver.deleteMessage(response.messages[i].indexInMemory);
              continue;
            }
          }
        }


        this.emit('newSMSMessage', {
          message: messageToSend,
          info: this.modem.info
        })

        let res = await driver.deleteMessage(response.messages[i].indexInMemory);
        logger.debug('Delete message: ', res);
      }
    }
  }

  async getSimInfo(driver: Driver, info: DeviceInfo) {
    let imsi = await driver.getIMSI();

    if (imsi.code !== 'OK') {
      info.simCard = false;
    } else {
      info.simCard = true;
      info.imsi = imsi.imsi;

      let parsedIMSI = this.parser.parseIMSI(imsi.imsi);

      if (!parsedIMSI) {
        info.operator = 'invalid IMSI';
        info.country = 'invalid IMSI';
      } else {
        info.operator = parsedIMSI.operator;
        info.country = parsedIMSI.country;
      }
    }

    return info;
  }

  reconnectToModem(modem: ModemObjectForInterface) {
    logger.debug('reconnect with config: ', modem);
    return this.disconnectModem().then(() => {
      return DriverConnector.connect(modem.config);
    }).then(driver => {
      this.modem.usbName = modem.usbName;
      this.modem.comPorts[modem.config.comPort || Object.keys(this.modem.comPorts)[0]].driver = driver;
      this.modem.online = true;

      this.emit('modemReconnected', {
        modem: {
          comPorts: Object.keys(this.modem.comPorts),
          config: this.modem.config,
          info: this.modem.info,
          online: this.modem.online,
          usbID: this.modem.usbID,
          usbName: this.modem.usbName
        }
      })
    })
  }


  disconnectModem(): Promise<void | any> {
    logger.debug('disconnect modem: ', this.modem)
    return this.modem.comPorts[this.modem.config.comPort].driver.close().then(() => {
      this.modem.online = false;
      this.emit('modemDisconnected', {usbID: this.modem.usbID})
    }).catch((err) => {
      logger.error('Error while disconnect modem: ', err);
    });
  }
}
