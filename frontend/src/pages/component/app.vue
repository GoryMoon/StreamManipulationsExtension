<template>
  <div id="app">
    <b-container class="main" fluid v-if="this.$twitchExtension.initialized">
      <router-view v-if="!maintenance"/>
      <div v-else class="text-center pt-5">
        <h3>Server down for maintenance</h3>
      </div>
    </b-container>
  </div>
</template>

<script>
export default {
  data() {
    return {
      loaded: false,
      maintenance: false,
    };
  },
  beforeUpdate() {
    if (this.$twitchExtension.initialized && !this.loaded) {
      this.loaded = true;
      const data = this.$twitchExtension.configuration.global.content;
      this.maintenance = data !== undefined ? JSON.parse(data).maintenance : false;
    }
  },
};
</script>

<style>
.main {
  height: 100%;
  overflow: auto;
  padding-left: 0 !important;
  padding-right: 0 !important;
}
</style>
