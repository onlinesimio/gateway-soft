<template>
  <sui-modal v-model="open">
    <sui-modal-header>Modem settings</sui-modal-header>
    <sui-modal-content>
      <sui-modal-description v-if="currentModem">
        <sui-header>Default settings</sui-header>
        <sui-input v-model="modems[currentModem].config.baudrate" placeholder="Baudrate" />
      </sui-modal-description>
    </sui-modal-content>
    <sui-modal-actions>
      <sui-button floated="right" positive @click.prevent="save(modem)">
        OK
      </sui-button>
    </sui-modal-actions>
  </sui-modal>
</template>

<script>
export default {
  props: {
    open: {
      type: Boolean,
      required: true,
      default: false
    },
    modem: {
      type: String
    }
  },
  data() {
    return {};
  },
  methods: {
    save(event, modem) {
      this.open = false;
    }
  }
};
</script>

