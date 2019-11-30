<template>
  <div class="chat">
    <h1>Chat Channel Poinst</h1>
    <b-button
    variant="outline-info"
    :pressed="chatStatus"
    @click="toggleChatStatus">{{ getButtonText }}</b-button>
    <p class="mt-2">Run the channel point rewards and it will be logged here, use this in the plugin for a condition</p>
    <hr>
    <div id="chat-list" class="mb-3">
      <transition-group name="chat-list">
        <b-card
        v-for="(msg, index) in chatMessages"
        :key="index"
        class="mb-2 chat-list-item">
          <b-row>
            <b-col cols="6" sm="auto" class="mr-sm-auto">
              <h3>{{ caseType(msg.id) }}</h3>
              <span class="font-weight-bold">Msg: {{ msg.message }}</span><br>
              <span class="font-weight-light">User: </span><span class="font-weight-bold">{{ action.user }}</span>
            </b-col>
          </b-row>
        </b-card>
      </transition-group>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

export default {
  name: 'actions',
  data () {
    return {
    }
  },
  methods: {
    toggleChatStatus () {
      console.log(this.user)
      this.$socket.client.emit('channel_status', this.user.login, !this.chatStatus)
    }
  },
  computed: {
    ...mapState([
      'user',
      'chatMessages',
      'chatStatus'
    ]),
    getButtonText () {
      return this.chatStatus ? 'Leave chat' : 'Join chat'
    }
  }
}
</script>

<style lang="scss" scoped>
.chat-list-item {
  transition: transform 1s;
}
.chat-list-enter-active, .chat-list-leave-active {
  transition: all 1s;
}
.chat-list-enter, .chat-list-leave-to /* .list-leave-active below version 2.1.8 */ {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
