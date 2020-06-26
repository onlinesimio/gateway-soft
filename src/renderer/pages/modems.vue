<template>
  <div id="modems">
    <sui-dimmer :active="loading">
      <sui-loader />
    </sui-dimmer>
    <sui-grid doubling :columns="4" >
      <sui-grid-row>
        <sui-card v-for="(modemData, usbID) in modems" :key="usbID">
          <sui-card-content>
            <sui-card-header>
              <p>{{ modemData.usbName }}</p>
            </sui-card-header>
            <sui-card-meta v-if="modemData.config">
              <p v-if="modemData.config.name">
                Modem: {{ modemData.config.name }}
              </p>
              <p v-else-if="modemData.info">
                Modem: {{ modemData.info.manufacturer }} {{ modemData.info.model }}
              </p>
              <p v-else>
                Modem: unknown
              </p>
            </sui-card-meta>
            <sui-label v-if="modems[usbID].online" ribbon color="green">
                online
            </sui-label>
            <sui-label v-else ribbon color="red">
              offline
            </sui-label>
            <div class="right floated" style="margin-top: 3px; position: relative;">
              <a href="#" @click.prevent="toggleSettings(usbID)">
                <sui-icon size="small" name="cog" />
              </a>
              <sui-icon size="small" name="info circle" />
              <fade-loader :active="modemData.loading"/>
            </div>
            <!-- <p>Manufacturer: {{ modemData.info.manufacturer }}</p>
            <p>Model: {{ modemData.info.model }}</p>
            <p>Software: {{ modemData.info.software }}</p>
            <p>IMEI: {{ modemData.info.imei }}</p> -->
            <div v-if="modemData.info">
              <div v-if="modemData.info.simCard">
                <p>IMSI: {{ modemData.info.imsi }}</p>
                <p>Operator: {{ modemData.info.operator }}</p>
                <p>Country: {{ modemData.info.country }}</p>
              </div>
              <div v-else>
                <p class="red">Сим карта не обнаружена</p>
              </div>
            </div>
          </sui-card-content>
          <!-- <sui-card-content extra>
            <sui-button primary animated>
              <sui-button-content visible>Подключено</sui-button-content>
              <sui-button-content hidden>
                Отключить
              </sui-button-content>
            </sui-button>
            <span slot="right">
            </span>
          </sui-card-content> -->
        </sui-card>
      </sui-grid-row>
    </sui-grid>
    <sui-modal v-model="open" :closeIcon="true">
      <sui-modal-header>Modem settings</sui-modal-header>
      <sui-modal-content>
        <sui-modal-description v-if="currentModem">
          <sui-form>
            <!-- <sui-form-field v-if="currentPorts.length > 1">
              <label>COM Port</label>
              <sui-dropdown
                placeholder="COM"
                selection
                :options="currentPorts"
                v-model="modems[currentModem].config.comPort"
              />
            </sui-form-field>
            <sui-form-field>
              <label>Baudrate</label>
              <sui-input v-model="modems[currentModem].config.baudrate" placeholder="Baudrate" />
            </sui-form-field> -->
            <sui-form-field>
              <label>Modem name</label>
              <sui-input v-model="modems[currentModem].config.name" :placeholder="modems[currentModem].info.manufacturer + ' ' + modems[currentModem].info.model" />
            </sui-form-field>
            <sui-form-field>
              <label>Port name</label>
              <sui-input v-model="modems[currentModem].usbName" placeholder="Port name" />
            </sui-form-field>
          </sui-form>
        </sui-modal-description>
      </sui-modal-content>
      <sui-modal-actions>
        <sui-button positive @click.prevent="saveSettings(currentModem)">
          Save
        </sui-button>
      </sui-modal-actions>
    </sui-modal>
  </div>
</template>

<script>
import fadeLoader from "@/components/fadeLoader";
import { ipcRenderer } from "electron";
export default {
  name: "ModemList",
  components: {
    fadeLoader
  },
  data() {
    return {
      open: false,
      currentModem: "",
      modems: {},
      loading: false
    };
  },
  computed: {
    currentPorts() {
      if (
        !this.currentModem ||
        !this.modems ||
        !this.modems[this.currentModem]
      ) {
        return [];
      }
      let ports = this.modems[this.currentModem].comPorts;
      let result = [];

      ports.forEach(port => {
        result.push({
          text: port,
          value: port
        });
      });

      return result;
    }
  },
  methods: {
    toggleSettings(id) {
      this.open = !this.open;
      this.currentModem = id;
    },
    saveSettings() {
      this.$modems.saveModemConfig(this.modems[this.currentModem]);
      this.open = false;
      this.currentModem = "";
    },
    registerListeners() {
      this.$modems.on("loading", loading => {
        this.loading = loading;
      });
      this.$modems.on("modemRemoved", usbID => {
        this.logger.debug("Modem removed", usbID);
        this.$delete(this.modems, usbID);
      });
      this.$modems.on("modemDisconnected", usbID => {
        this.logger.debug("Modem disconnected", usbID);
        this.$set(this.modems[usbID], "online", false);
      });
      this.$modems.on("newSMSMessage", (usbID, message) => {
        console.log("new SMS: ", message);
      });
      this.$modems.on("modemConnected", (usbID, modem) => {
        this.$set(this.modems, usbID, modem);
      });
      this.$modems.on("updatingFinished", usbID => {
        if (!this.modems[usbID]) return;
        this.$set(this.modems[usbID], "loading", false);
      });
      this.$modems.on("updating", usbID => {
        if (!this.modems[usbID]) return;
        this.$set(this.modems[usbID], "loading", true);
      });
      this.$modems.on("modemUpdated", (usbID, modem) => {
        this.logger.debug("Modem updated", usbID);

        this.$set(this.modems, usbID, modem);
      });
      ipcRenderer.on("quit", () => {
        this.$modems.disconnectAllModems();
      });
    }
  },
  created() {
    this.loading = this.$modems.loading;
    this.$modems.findModems();
    this.registerListeners();
  }
};
</script>

<style>
#modems {
  margin-left: 50px;
  margin-top: 40px;
}
</style>


