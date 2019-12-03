<template>
  <div class="chat">
    <h1>Channel Point Rewards</h1>
    <b-button
    variant="outline-info"
    :pressed="chatStatus"
    @click="toggleChatStatus">{{ getButtonText }}</b-button>
    <p class="mt-2">The bot need to be in the chat for the channel point rewards to work</p>
    <p>Run the channel point rewards and it will be logged here, use this in the plugin for a condition</p>
    <hr>
    <div id="chat-list" class="mb-3">
      <transition-group name="chat-list">
        <b-card
        v-for="(msg, index) in getChat"
        :key="index"
        class="mb-2 chat-list-item">
          <b-row>
            <b-col cols="6" sm="auto" class="mr-sm-auto">
              <h3><span class="font-weight-light">ID: </span>{{ msg.id }}</h3>
              <span class="font-weight-light">User: </span><span class="font-weight-bold">{{ msg.user }}</span><br>
              <span class="font-weight-light">Msg: <span class="font-weight-bold">{{ msg.message }}</span></span>
            </b-col>
          </b-row>
        </b-card>
      </transition-group>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'

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
    ...mapGetters([
      'getChat'
    ]),
    ...mapState([
      'user',
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
