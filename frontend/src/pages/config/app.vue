<template>
  <div class="mb-5">
    <b-container v-if="isLoaded && !maintenance">
      <h1 class="mt-3">StreamEngineer Config</h1>
      <hr>
      <div v-if="!$twitchExtension.features.isBitsEnabled">
        <b-alert variant="danger" show>This extension requires bits to work</b-alert>
      </div>
      <p>
        This extension requires the
        <a target="_blank" href="https://github.com/GoryMoon/StreamEngineer/releases">StreamEngineer <fa icon="external-link-alt"></fa></a>
        plugin for SpaceEngineers to be installed on the client.
      </p>
      <p>Instruction on how to install it can be found in the download or on the github page.</p>
      <ConfigToken></ConfigToken>
      <ConfigActions></ConfigActions>
    </b-container>
    <div v-else-if="maintenance" class="text-center pt-5">
        <h3>Server down for maintenance</h3>
      </div>
  </div>
</template>

<script>
import ConfigToken from '@/components/ConfigToken.vue';
import ConfigActions from '@/components/ConfigActions.vue';

export default {
  data() {
    return {
      loaded: false,
      maintenance: false,
    };
  },
  computed: {
    isLoaded() {
      return this.$twitchExtension.channel.initialized
      && this.$twitchExtension.configuration.initialized
      && this.$twitchExtension.context.initialized
      && this.$twitchExtension.viewer.initialized;
    },
  },
  components: {
    ConfigToken,
    ConfigActions,
  },
  beforeUpdate() {
    if (this.isLoaded && !this.loaded) {
      this.loaded = true;
      this.axios.defaults.headers.authorization = `Bearer ${this.$twitchExtension.viewer.sessionToken}`;
      const data = this.$twitchExtension.configuration.global.content;
      this.maintenance = data !== undefined ? JSON.parse(data).maintenance : false;
    }
  },
};
</script>

<style>
.collapsed > .when-opened,
:not(.collapsed) > .when-closed {
  display: none;
}
</style>
