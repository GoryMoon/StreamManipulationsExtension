<!-- OLD, NOT USED -->
<template>
  <div id="app">
    <b-container class="main" fluid v-if="this.isLoaded">
      <router-view v-if="!maintenance"/>
      <div v-else class="text-center pt-5">
        <h3>Server down for maintenance</h3>
      </div>
    </b-container>
  </div>
</template>

<script>
export default {
    data () {
        return {
            loaded: false,
            maintenance: false
        }
    },
    computed: {
        isLoaded () {
            return this.$twitchExtension.channel.initialized &&
      this.$twitchExtension.configuration.initialized &&
      this.$twitchExtension.context.initialized &&
      this.$twitchExtension.viewer.initialized
        }
    },
    beforeUpdate () {
        if (this.isLoaded && !this.loaded) {
            this.loaded = true
            const data = this.$twitchExtension.configuration.global.content
            this.maintenance = data !== undefined ? JSON.parse(data).maintenance : false
        }
    }
}
</script>

<style>
.main {
  height: 100%;
  overflow: auto;
  padding-left: 0 !important;
  padding-right: 0 !important;
}
</style>
