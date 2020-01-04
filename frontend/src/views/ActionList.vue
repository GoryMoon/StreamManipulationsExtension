<template>
  <div class="pt-3" v-if="bitProducts !== null">
    <div v-if="activeGame !== null && actions !== null">
      <h4 class="text-center mb-4">Actions</h4>
      <hr>
      <div v-for="(action, index) in actions" :key="index">
          <b-row
          @click="sendAction(index)"
          @mouseover="$twitchExtension.bits.showBitsBalance"
          :class="['action-row', isMobile ? 'action-row-mobile': '']">
            <b-col :cols="isMobile ? 7: 8">
              <span :class="isMobile ? 'h6': 'h4'">
                {{ action.title }}
              </span>
            </b-col>
            <b-col
              :cols="isMobile ? 5: 4"
              class="text-right pr-3">
              <bits-display
                :bits="getPrice(action.sku)"
                :text-class="isMobile ? 'h6': 'h5'"
                :width="isMobile ? 20: 30"
                :height="isMobile ? 20: 30">>
              </bits-display>
            </b-col>
          </b-row>
          <hr/>
      </div>
    </div>
    <div class="px-3 text-center" v-else>
      <h4 class="pb-2">Waiting for the game to connect</h4>
      <b-spinner variant="info"></b-spinner>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex';
import { SET_SELECTED_ACTION } from '@/stores/mutation-types';

import BitsDisplay from '@/components/BitsDisplay.vue';

export default {
  name: 'action-list',
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
    sendAction(index) {
      const action = this.actions[index];
      this.$store.commit(SET_SELECTED_ACTION, action);
      this.$router.push({ name: 'send-bits' });
    },
  },
  computed: {
    isMobile() {
      return this.$twitchExtension.queryParams.platform === 'mobile';
    },
    ...mapGetters([
      'getPrice',
    ]),
    ...mapState([
      'bitProducts',
      'activeGame',
      'actions',
    ]),
  },
};
</script>
<style lang="scss" scoped>
hr {
  border-right : 0;
  border-left: 0;
  margin-top: 0;
  margin-bottom: 0;
}

.action-row {
  cursor: pointer;
  margin: 0;
  width: 100%;
  padding-top: 1rem;
  padding-bottom: 1rem;

  &:hover {
    background-color: #303030;
  }
}

.action-row-mobile {
  padding-top: 0.8rem;
  padding-bottom: 0.8rem;
}
</style>
