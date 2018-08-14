export interface USSDCommands {
  balance: string,
  number: string
}

export interface ParsedIMSIResponse extends ParsedIMSI {
  iso: string,
  country: string,
  operator: string,
  ussdCommands: USSDCommands | false
}

interface ParsedIMSI {
  mcc: string,
  mnc: string,
  msin: string
}

export interface SimIdentification {
  mcc: string,
  mnc: string,
  iso: string,
  country: string,
  operator: string,
  ussdCommands: string
}

export class IMSIParser {
  mncLength: Array<string>;
  simIdentification: Array<SimIdentification>;

  constructor(simIdentification: Array<SimIdentification>) {
    this.mncLength = [
      '365', '344', '722', '364', '342', '350', '348', '302', '346', '732', '366',
      '750', '262', '352', '310', '311', '708', '404', '405', '338', '467', '502',
      '334', '354', '362', '242', '714', '330', '356', '358', '360', '374', '376',
      '312', '316'
    ];
    this.simIdentification = simIdentification;
  }

  parseIMSI(imsi: string): ParsedIMSIResponse | false {
    if (imsi.length < 10) {
      return false;
    }

    let mcc = this.getMCC(imsi);
    let mnc = this.getMNC(imsi, mcc);
    let msin = this.getMSIN(imsi, mnc);

    return this.validateIMSI({
      mcc,
      mnc,
      msin
    });
  }

  getMCC(imsi: string) {
    return imsi.substr(0, 3);
  }

  getMNC(imsi: string, mcc: string) {
    return imsi.substr(3, this.getMNCLength(mcc));
  }

  getMSIN(imsi: string, mnc: string) {
    return imsi.substr(imsi.indexOf(mnc) + mnc.length, imsi.length);
  }

  validateIMSI(imsi: ParsedIMSI): ParsedIMSIResponse | false {
    let index = this.simIdentification.findIndex((value, index): boolean => {
      if (value.mcc == imsi.mcc && value.mnc == imsi.mnc) {
        return true;
      }
      return false;
    })
    if (index !== -1) {
      return {
        mcc: imsi.mcc,
        mnc: imsi.mnc,
        msin: imsi.msin,
        country: this.simIdentification[index].country,
        iso: this.simIdentification[index].iso,
        operator: this.simIdentification[index].operator,
        ussdCommands: this.simIdentification[index].ussdCommands ? JSON.parse(this.simIdentification[index].ussdCommands) : false
      }
    }

    return false;
  }

  getMNCLength(mcc: string) {
    if (this.mncLength.indexOf(mcc) !== -1) {
      return 3;
    }

    return 2;
  }
}