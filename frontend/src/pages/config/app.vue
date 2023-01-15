<template>
  <simplebar
  class="h-100 w-100 pb-5">
    <b-container v-if="isLoaded && !maintenance">
      <h1 class="mt-3">Stream Manipulations Config</h1>
      <hr>
      <div v-if="!$twitchExtension.features.isBitsEnabled">
        <b-alert variant="danger" show>This extension requires bits to work</b-alert>
      </div>
      <p>
        Games that support this extension, download links and information on
        how to setup the games can be found on the following wiki page. <br/>
        <a target="_blank" href="https://github.com/GoryMoon/StreamEngineerExtension/wiki/Games">Games <fa icon="external-link-alt"></fa></a>
      </p>
      <config-token></config-token>
      <config-actions></config-actions>
    </b-container>
    <div v-else-if="maintenance" class="text-center pt-5">
      <h3>Server down for maintenance</h3>
    </div>
    <div v-else class="text-center pt-5">
      <h3>Loading extension</h3>
      <b-spinner></b-spinner>
    </div>
  </simplebar>
</template>

<script>
import { mapState } from 'vuex'
import { SET_MAINTENANCE, SET_LOADED } from '@/stores/mutation-types'

import ConfigToken from '@/components/ConfigToken.vue'
import ConfigActions from '@/components/ConfigActions.vue'

export default {
    computed: {
        isLoaded () {
            return this.$twitchExtension.channel.initialized &&
      this.$twitchExtension.configuration.initialized &&
      this.$twitchExtension.context.initialized &&
      this.$twitchExtension.viewer.initialized
        },
        ...mapState([
            'loaded',
            'maintenance'
        ])
    },
    components: {
        ConfigToken,
        ConfigActions
    },
    beforeUpdate () {
        if (this.isLoaded && !this.loaded) {
            this.$store.commit(SET_LOADED, true)

            const data = this.$twitchExtension.configuration.global.content
            const maintenance = data !== undefined ? JSON.parse(data).maintenance : false
            this.$store.commit(SET_MAINTENANCE, maintenance)
            this.$bugsnag.user = {
                id: this.$twitchExtension.viewer.opaqueId,
                channel: this.$twitchExtension.channel.id,
                game: this.$twitchExtension.context.game
            }
        }
    }
}
</script>

<style>
.collapsed > .when-opened,
:not(.collapsed) > .when-closed {
  display: none;
}
</style>
