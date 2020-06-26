import { DriverConfig, DeviceInfo } from './driver';
import { PDUMessage } from './manager';
import { ModemObjectForInterface } from './modemConnectionProcess';
import store from '../src/renderer/store'

export class DB {
  defaultConfig: DriverConfig;

  constructor() {
    this.defaultConfig = {
      baudrate: 115200,
      comPort: '',
      timeout: 5000
    };
  }

  async getUSBPortName(usbID: string): Promise<string> {
    let res = store.state.modems.list[usbID]
    if (!res) {
      return 'unnamed';
    }

    return res.name;
  }

  async findDeviceConfig(vendorID: string, deviceID: string): Promise<DriverConfig> {
    let userConfig = store.state.configurations.list[vendorID+'_'+deviceID]

    if (!userConfig) {
      return this.defaultConfig
    }

    return JSON.parse(userConfig[0].config);
  }

  async findUserConfigForImei(imei: string): Promise<DriverConfig | false> {
    let userConfig = store.state.configurations.list[imei]

    if (userConfig) {
      let config = JSON.parse(userConfig.config);
      if (userConfig.name) {
        config.name = userConfig.name;
      }
      return config;
    }

    return false;
  }


  async saveModemConfig(modem: ModemObjectForInterface) {
    let modemConfig = store.state.configurations.list[modem.info.imei]

    if (!modemConfig) {
      store.dispatch('configurations/set', {
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
      modemConfig = JSON.parse(JSON.stringify(modemConfig));
      modemConfig.name = JSON.parse(JSON.stringify(modem.config.name));
      modemConfig.config = JSON.stringify(modem.config);
      modemConfig.updatedAt = new Date()
      store.dispatch('configurations/update', modemConfig)
    }

    let usbID = modem.usbID;

    let usbNames = store.state.ports.list[usbID]

    if (!usbNames) {
      store.dispatch('ports/set', {
        usbID: usbID,
        name: modem.usbName
      })
    } else {
      usbNames = JSON.parse(JSON.stringify(usbNames));
      usbNames.name = modem.usbName;
      store.dispatch('ports/update', usbNames)
    }
  }

  async saveMessage(message: PDUMessage, modemInfo: DeviceInfo) {
    store.dispatch('operations/set', {
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
}
