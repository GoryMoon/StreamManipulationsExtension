<template>
  <div class="pt-3" v-if="bitProducts !== null">
    <div v-if="modActive">
      <h4 class="text-center mb-2">Actions</h4>
      <hr>
      <div v-for="(action, index) in actions" :key="index">
          <b-row class="w-100">
            <b-col cols="8" class="action-row pl-3">
              <div class="action">
                <span>{{ action.title }}</span><br>
                <small class="text-muted">{{ action.description }}</small>
              </div>
            </b-col>
            <b-col cols="4" class="action-row text-right">
              <b-button
              variant="info"
              class="ml-auto"
              @click="sendAction(index)"
              @mouseover="$twitchExtension.bits.showBitsBalance">
              {{ getPrice(action.sku) }} Bits</b-button>
            </b-col>
          </b-row>
          <hr/>
      </div>
    </div>
    <div class="px-3 text-center" v-else>
      <h4 class="pb-2">Waiting for the mod to connect</h4>
      <b-spinner variant="info"></b-spinner>
    </div>
    <b-modal
    v-model="loadingBitsModal"
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
  </div>
  <div v-else class="pt-3 text-center">
    <b-spinner variant="info"></b-spinner>
  </div>
</template>

<script>
export default {
  name: 'home',
  data() {
    return {
      config: '',
      actions: [],
      configVersion: '',
      bitProducts: null,
      devConfig: null,
      modActive: false,
      selectedIndex: -1,
      loadingBitsModal: false,
      sendingActionModal: false,
    };
  },
  components: {
  },
  methods: {
    updatedConfig() {
      let conf = this.$twitchExtension.configuration.broadcaster;
      this.actions = conf !== undefined ? JSON.parse(conf.content) : [];
      this.configVersion = conf !== undefined ? conf.version : '0';
      conf = this.$twitchExtension.configuration.developer;
      this.devConfig = conf !== undefined ? JSON.parse(conf.content) : null;
      this.modActive = this.devConfig !== null ? this.devConfig.mod_active : false;
    },
    getPrice(sku) {
      const product = this.bitProducts.find(p => p.sku === sku);
      return (product && product.cost.amount) || 0;
    },
    onPubSub: function pubsub(target, contentType, message) {
      const m = JSON.parse(message);
      if ('mod_active' in m) {
        this.modActive = m.mod_active;
      } else if ('type' in m) {
        if (m.type === 'config') {
          this.actions = m.actions;
        }
      }
    },
    sendAction(index) {
      this.selectedIndex = index;
      const action = this.actions[index];
      this.$twitchExtension.bits.useBits(action.sku);
      this.loadingBitsModal = true;
    },
    transactionComplete(data) {
      if (data.initiator === 'current_user' && this.selectedIndex !== -1) {
        this.loadingBitsModal = false;
        const action = this.actions[this.selectedIndex];
        this.sendingActionModal = true;
        this.axios.post('/action/spaceengineers', {
          token: data.transactionReceipt,
          user: data.displayName,
          action: action.action,
          settings: action.settings,
        }, {
          headers: {
            authorization: `Bearer ${this.$twitchExtension.viewer.sessionToken}`,
          },
        }).then(() => {
          this.sendingActionModal = false;
        }).catch((err) => {
          this.sendingActionModal = false;
          console.log(`An error ocurred: ${JSON.stringify(err.response)}`);
        });
        this.selectedIndex = -1;
      }
    },
    transactionCancelled() {
      this.loadingBitsModal = false;
      this.selectedIndex = -1;
    },
  },
  mounted() {
    this.$twitchExtension.configuration.onChanged(this.updatedConfig);
    this.updatedConfig();
    this.$twitchExtension.bits.getProducts().then((data) => {
      this.bitProducts = data;
      this.bitProducts.sort((a, b) => a.cost.amount - b.cost.amount);
    });
    // window.Twitch.ext.bits.setUseLoopback(true);
    this.$twitchExtension.bits.onTransactionComplete(this.transactionComplete);
    this.$twitchExtension.bits.onTransactionCancelled(this.transactionCancelled);
    this.$twitchExtension.listen('broadcast', this.onPubSub);
  },
  beforeDestroy() {
    this.$twitchExtension.unlisten('broadcast', this.onPubSub);
  },
};
</script>
<style scoped>
hr {
  border-right : 0;
  border-left: 0;
}

.action {
  padding-left: 15px;
  padding-right: 15px;
}

.action-row {
  padding-left: 0;
  padding-right: 0;
}
</style>
