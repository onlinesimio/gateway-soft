import Axios, { AxiosInstance } from 'axios';
import logger from './logger';

class API {
  axios: AxiosInstance;

  constructor(axios: AxiosInstance) {
    this.axios = axios;
  }

  sendMessage(port: string, sender: string, text: string) {
    logger.debug('sendMessage:', {port: port, sender: sender, text:text});
  }

  setOkStatus(port: string) {
    return this.setStatus(port, 'OK');
  }

  setErrorStatus(port: string) {
    return this.setStatus(port, 'Trying to reconnect to modem');
  }

  setStatus(port: string, status: string) {
    logger.debug('sendMessage:', {port: port, status: status});
  }
}

const axios = Axios.create({
  baseURL: 'localhost'
});

export const api = new API(axios);


