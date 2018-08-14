import * as Knex from 'knex';
import { DriverConfig, DeviceInfo } from './driver';
import { PDUMessage } from './manager';
import { ModemObjectForInterface } from './modemConnectionProcess';

export class DB {
  db: Knex;
  defaultConfig: DriverConfig;

  constructor(dbPath: string) {
    this.db = Knex({
      client: 'sqlite3',
      connection: {
        filename: dbPath
      },
      useNullAsDefault: true
    });
    this.defaultConfig = {
      baudrate: 115200,
      comPort: '',
      timeout: 5000
    };
  }

  async getUSBPortName(usbID: string): Promise<string> {
    let res = await this.db.from('ports').where({
      ID: usbID
    }).select('*');

    if (res.length < 1) {
      return 'unnamed';
    }

    return res[0].name;
  }

  async findDeviceConfig(vendorID: string, deviceID: string): Promise<DriverConfig> {
    let config: DriverConfig = this.defaultConfig;

    let userConfig = await this.db.from('configurations').where({
      vendorID,
      deviceID
    }).select('*');

    if (userConfig.length < 1) {

      let defaultConfig = await this.db.from('modem_configuration').where({
        vendorID,
        deviceID
      }).select('*');

      if (defaultConfig.length > 1) {
        return JSON.parse(defaultConfig[0].config);
      }

      return config
    }

    return JSON.parse(userConfig[0].config);
  }

  async findUserConfigForImei(imei: string): Promise<DriverConfig | false> {
    let userConfig = await this.db.from('configurations').where({
      imei
    }).select('*');
    let config;

    if (userConfig.length > 0) {
      config = JSON.parse(userConfig[0].config);
      if (userConfig[0].name) {
        config.name = userConfig[0].name;
      }
      return config;
    }

    return false;
  }

  getSimIdentificationList() {
    return this.db.from('sim_identification').select('*');
  }

  async saveModemConfig(modem: ModemObjectForInterface) {
    let modemConfig = await this.db.table('configurations').where({
      imei: modem.info.imei
    }).select('*');

    if (modemConfig.length < 1) {
      await this.db.table('configurations').insert({
        imei: modem.info.imei,
        name: modem.config.name,
        vendorID: modem.comPorts[Object.keys(modem.comPorts)[0]].vendorId,
        deviceID: modem.comPorts[Object.keys(modem.comPorts)[0]].deviceId,
        manufacturer: modem.info.manufacturer,
        model: modem.info.model,
        config: JSON.stringify(modem.config),
        createdAt: new Date(),
        updatedAt: new Date()
      })
    } else {
      await this.db.table('configurations').where({
        imei: modem.info.imei
      }).update({
        name: modem.config.name,
        config: JSON.stringify(modem.config),
        updatedAt: new Date()
      })
    }

    let usbID = modem.usbID;

    let usbNames = await this.db.table('ports').where({
      ID: usbID
    }).select('*');

    if (usbNames.length < 1) {
      await this.db.table('ports').insert({
        ID: usbID,
        name: modem.usbName
      });
    } else {
      await this.db.table('ports').where({
        ID: usbID
      }).update({
        name: modem.usbName
      });
    }
  }

  async saveMessage(message: PDUMessage, modemInfo: DeviceInfo) {
    await this.db.table('operations').insert({
      imsi: modemInfo.imsi,
      imei: modemInfo.imei,
      //number: '', TODO: Add number save for production application
      // number: modemInfo.
      status: 1,
      service: 'test',
      country: modemInfo.country,
      messages: JSON.stringify([message.text]),
      sum: 1,
      createdAt: new Date().toDateString(),
      updatedAt: new Date().toDateString()
    })
  }

  // async findUser() {
  //   let user = await this.db.table('users').orderBy('id').limit(1);

  //   return user[0];
  // }

  // async saveUser(user) {
  //   await this.db.table('users').insert({
  //     name: user.name,
  //     apikey: user.apikey,
  //     createdAt: new Date(),
  //     updatedAt: new Date()
  //   })
  // }
}