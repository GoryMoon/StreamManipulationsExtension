<template>
  <simplebar
  data-simplebar-auto-hide="false"
  class="h-100 w-100 pb-5">
    <b-container class="main" fluid v-if="isLoaded && !maintenance">
      <router-view/>
    </b-container>
    <div v-else-if="maintenance" class="text-center pt-5">
      <h3>Server down for maintenance</h3>
    </div>
    <div v-else class="text-center pt-5">
      <h3>Loading extension</h3>
      <b-spinner></b-spinner>
    </div>
    <b-modal
      v-model="isLoadingBits"
      id="bits-modal"
      :no-close-on-backdrop=true
      :no-close-on-esc=true
      :hide-header=true
      :hide-footer=true
      :centered=true>
      <div class="text-center">
        <h4 class="pb-3">Waiting on bits</h4>
        <b-spinner variant="info"></b-spinner>
      </div>
    </b-modal>
    <b-modal
      v-model="sendingActionModal"
      id="action-modal"
      :no-close-on-backdrop=true
      :no-close-on-esc=true
      :hide-header=true
      :hide-footer=true
      :centered=true>
      <div class="text-center">
        <h4 class="pb-3">Sending Action</h4>
        <b-spinner variant="info"></b-spinner>
      </div>
    </b-modal>
  </simplebar>
</template>

<script>
import { mapState } from 'vuex'
import {
    SET_MAINTENANCE, SET_LOADED, SET_BIT_PRODUCTS, SET_ACTIONS,
    SET_ACTIVE_GAME, SET_TRANSACTION_STATUS, SET_ANONYMOUS_SENDER
} from '@/stores/mutation-types'
import { GET_GAME_ACTIONS } from '@/stores/action-types'

export default {
    data () {
        return {
            sendingActionModal: false
        }
    },
    methods: {
        onPubSub: function pubsub (target, contentType, message) {
            const m = JSON.parse(message)
            console.warn(`PUBSUB: ${message}`)
            if ('type' in m) {
                if (m.type === 'load') {
                    this.$store.commit(SET_ACTIVE_GAME, m.game)
                    if (m.fetch) {
                        this.$store.dispatch(GET_GAME_ACTIONS, m.game)
                    } else {
                        this.$store.commit(SET_ACTIONS, m.actions)
                    }
                    this.$router.push({ name: 'home' })
                } else if (m.type === 'unload') {
                    this.$store.commit(SET_ACTIVE_GAME, null)
                    this.$router.push({ name: 'home' })
                }
            }
        },
        transactionComplete (data) {
            if (data.initiator === 'current_user' && this.selectedIndex !== -1) {
                this.sendingActionModal = true
                let name = data.displayName
                if (this.$store.state.sendAnonymously) {
                    name = 'AnonymousViewer'
                }
                this.axios.post(`/action/${this.activeGame}`, {
                    token: data.transactionReceipt,
                    product: data.product,
                    user: name,
                    action: this.selectedAction.action,
                    settings: this.selectedAction.settings
                }, {
                    headers: {
                        authorization: `Bearer ${this.$twitchExtension.viewer.sessionToken}`
                    }
                }).then(() => {
                    this.sendingActionModal = false
                }).catch((err) => {
                    this.sendingActionModal = false
                    this.$bvModal.msgBoxOk('An error ocurred when trying to send action', {
                        title: 'Error',
                        size: 'sm',
                        buttonSize: 'lm',
                        okVariant: 'error',
                        headerClass: 'p-2 border-bottom-0',
                        footerClass: 'p-2 border-top-0',
                        centered: true
                    }).catch((error) => {
                        this.$bugsnag.notify(error)
                        console.error(`An error ocurred: ${JSON.stringify(error)}`)
                    })
                    this.$bugsnag.notify(err)
                    console.error(`An error ocurred: ${JSON.stringify(err.response.data)}`)
                })
                this.$store.commit(SET_ANONYMOUS_SENDER, false)
                this.$store.commit(SET_TRANSACTION_STATUS, false)
            }
        },
        transactionCancelled () {
            this.$store.commit(SET_ANONYMOUS_SENDER, false)
            this.$store.commit(SET_TRANSACTION_STATUS, false)
        },
        updatedConfig () {
            let conf = this.$twitchExtension.configuration.developer
            const devConfig = conf !== undefined ? JSON.parse(conf.content) : null

            if ('game' in devConfig && devConfig.game !== '') {
                this.$store.commit(SET_ACTIVE_GAME, devConfig.game)
                if (devConfig.fetch) {
                    this.$store.dispatch(GET_GAME_ACTIONS, devConfig.game)
                } else {
                    conf = this.$twitchExtension.configuration.broadcaster
                    const actions = conf !== undefined ? JSON.parse(conf.content) : []
                    this.$store.commit(SET_ACTIONS, actions)
                }
            }
        }
    },
    computed: {
        isLoaded () {
            return this.$twitchExtension.channel.initialized &&
      this.$twitchExtension.configuration.initialized &&
      this.$twitchExtension.context.initialized &&
      this.$twitchExtension.viewer.initialized
        },
        isLoadingBits () {
            return this.selectedAction !== null && this.transactionStatus
        },
        ...mapState([
            'loaded',
            'maintenance',
            'activeGame',
            'selectedAction',
            'transactionStatus'
        ])
    },
    beforeUpdate () {
        if (this.isLoaded && !this.loaded) {
            this.$store.commit(SET_LOADED, true)

            const data = this.$twitchExtension.configuration.global.content
            const maintenance = data !== undefined ? JSON.parse(data).maintenance : false
            this.$store.commit(SET_MAINTENANCE, maintenance)

            this.$twitchExtension.bits.getProducts().then((prod) => {
                const products = prod
                products.sort((a, b) => a.cost.amount - b.cost.amount)
                this.$store.commit(SET_BIT_PRODUCTS, products)
            })
            this.$twitchExtension.listen('broadcast', this.onPubSub)
            this.$twitchExtension.bits.onTransactionComplete(this.transactionComplete)
            this.$twitchExtension.bits.onTransactionCancelled(this.transactionCancelled)
            this.$twitchExtension.configuration.onChanged(this.updatedConfig)
            this.updatedConfig()

            this.$bugsnag.user = {
                id: this.$twitchExtension.viewer.opaqueId,
                channel: this.$twitchExtension.channel.id,
                game: this.$twitchExtension.context.game
            }
        }
    },
    beforeUnmount () {
        this.$twitchExtension.unlisten('broadcast', this.onPubSub)
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
