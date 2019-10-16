<template>
  <div id="app">
    <b-container fluid v-if="this.$twitchExtension.initialized">
      <router-view/>
    </b-container>
  </div>
</template>

<script>
export default {
  beforeUpdate() {
    if (this.isLoaded && !this.loaded) {
      this.loaded = true;
      this.axios.defaults.headers.authorization = `Bearer ${this.$twitchExtension.viewer.sessionToken}`;
    }
  },
};
</script>

<style>
.container {
  height: 100%;
  overflow: auto
}

#app {
  height: 100%;
}
</style>
