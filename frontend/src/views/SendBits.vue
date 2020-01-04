<template>
  <b-container class="pt-3">
    <b-link
    :class="isMobile ? 'h5': 'h4'"
    :to="{ name: 'home' }"><fa icon="angle-left" /> Back to Actions</b-link>
    <hr>
    <div class="text-center mt-3" v-if="selectedAction !== null">
      <div>
        <h3>
          {{ selectedAction.title }}<br>
        </h3>
        <small class="text-muted h5">{{ selectedAction.description }}</small>
      </div>

      <div
        class="mb-3 mt-4">
        <bits-display
          :bits="getPrice(selectedAction.sku)"
          text-class="h4"
          :animated="true"
          width="60"
          height="60">
        </bits-display>
      </div>
      <b-form-checkbox
        id="anonymous-check"
        size="lg"
        v-model="sendAnonymously">
        Send anonymously
      </b-form-checkbox>
      <b-button
        variant="info"
        class="mt-2"
        size="lg"
        @click="sendAction"
        @mouseover="$twitchExtension.bits.showBitsBalance">
        Send Action
      </b-button>
    </div>
    <div v-else class="text-center mt-2">
      <h4>Loading action data</h4>
      <b-spinner variant="info"></b-spinner>
    </div>
  </b-container>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { SET_TRANSACTION_STATUS, SET_ANONYMOUS_SENDER } from '@/stores/mutation-types';

import BitsDisplay from '@/components/BitsDisplay.vue';

export default {
  name: 'send-bits',
  components: {
    BitsDisplay,
  },
  methods: {
    checkConnection() {
      return this.axios.head('/ping', {
        headers: {
          authorization: `Bearer ${this.$twitchExtension.viewer.sessionToken}`,
        },
      });
    },
    sendAction() {
      this.$store.commit(SET_TRANSACTION_STATUS, true);
      this.checkConnection().then(() => {
        this.$twitchExtension.bits.useBits(this.selectedAction.sku);
      }).catch((err) => {
        this.$bvModal.msgBoxOk('An error ocurred when trying to use bits', {
          title: 'Error',
          size: 'sm',
          buttonSize: 'sm',
          okVariant: 'error',
          headerClass: 'p-2 border-bottom-0',
          footerClass: 'p-2 border-top-0',
          centered: true,
        }).catch((error) => {
          this.$bugsnag.notify(error);
          console.error(`An error ocurred: ${JSON.stringify(error.response)}`);
        });
        this.$bugsnag.notify(err);
        console.error(`An error ocurred: ${JSON.stringify(err.response)}`);
      });
    },
  },
  computed: {
    isMobile() {
      return this.$twitchExtension.queryParams.platform === 'mobile';
    },
    sendAnonymously: {
      get() {
        return this.$store.state.sendAnonymously;
      },
      set(value) {
        this.$store.commit(SET_ANONYMOUS_SENDER, value);
      },
    },
    ...mapGetters([
      'getPrice',
    ]),
    ...mapState([
      'selectedAction',
    ]),
  },
};
</script>
<style>

</style>
