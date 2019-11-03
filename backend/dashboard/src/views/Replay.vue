<template>
  <div class="actions">
    <h1>Replay Actions</h1>
    <b-button
    variant="outline-info"
    :pressed.sync="animatedIcons">Animated Bits</b-button>
    <hr>
    <div id="action-list" class="mb-3">
      <transition-group name="action-list">
        <b-card
        v-for="action in getActions"
        :key="action._id"
        :bg-variant="unwatchedActions.includes(action._id) ? 'secondary': 'default'"
        @mouseover="removeUnwatched(action._id)"
        class="mb-2 action-list-item">
          <b-row>
            <b-col cols="6" sm="auto" class="mr-sm-auto">
              <h3>{{ caseType(action.action) }}</h3>
              <span class="font-weight-light">By: </span><span class="font-weight-bold">{{ action.sender }}</span>
            </b-col>
            <b-col cols="6" sm="auto" :class="[getBitColor(action.bits), 'text-right']">
              <img
              :src="getBitImage(action.bits)"
              :alt="action.bits + 'bits'"
              width="40" height="40"> {{ action.bits }} bits
            </b-col>
            <b-col cols="12" sm="auto" class="text-right">
              <b-button
              size="lg"
              variant="outline-success"
              :disabled="!gameConnected"
              @click="replay(action._id)">
                Replay
              </b-button>
            </b-col>
          </b-row>
        </b-card>
      </transition-group>
      <div class="text-center">
        <b-button ref="load_more" @click="loadMore" class="mt-2">Load More</b-button>
      </div>
    </div>
  </div>
</template>

<script>
import startCase from 'lodash.startcase'
import { UPDATE_ANIMATED_ICONS, CLEAR_UNWATCHED } from '@/store/mutation-types'

export default {
  name: 'replay',
  sockets: {
    connect_actions (actions) {
      this.$refs['load_more'].disabled = false
    }
  },
  data () {
    return {
      unwatchedActions: [],
      icons: {
        static: {
          gray: require('@/assets/1.png'),
          purple: require('@/assets/100.png'),
          green: require('@/assets/1000.png'),
          blue: require('@/assets/5000.png'),
          red: require('@/assets/10000.png')
        },
        animated: {
          gray: require('@/assets/1.gif'),
          purple: require('@/assets/100.gif'),
          green: require('@/assets/1000.gif'),
          blue: require('@/assets/5000.gif'),
          red: require('@/assets/10000.gif')
        }
      }
    }
  },
  methods: {
    caseType (type) {
      return startCase(type)
    },
    getBitImage (bits) {
      let icons = this.animatedIcons ? this.icons.animated : this.icons.static
      return (bits < 100 ? icons.gray : bits < 1000 ? icons.purple : bits < 5000 ? icons.green : bits < 10000 ? icons.blue : icons.red)
    },
    getBitColor (bits) {
      return 'bits ' + (bits < 100 ? 'bits-10' : bits < 1000 ? 'bits-100' : bits < 5000 ? 'bits-1000' : bits < 10000 ? 'bits-5000' : 'bits-10000')
    },
    removeUnwatched (id) {
      if (this.unwatchedActions.includes(id)) {
        this.unwatchedActions.splice(this.unwatchedActions.indexOf(id), 1)
      }
    },
    replay (id) {
      this.$socket.client.emit('replay', id)
      this.$bvToast.toast('Replay sent', {
        title: 'Action',
        autoHideDelay: 1000,
        variant: 'success'
      })
    },
    loadMore () {
      this.$refs['load_more'].disabled = true
      this.$store.dispatch('load_more_actions')
    }
  },
  computed: {
    getActions () {
      return this.$store.getters.getActions('spaceengineers')
    },
    animatedIcons: {
      get () {
        return this.$store.state.animatedIcons
      },
      set (value) {
        this.$store.commit(UPDATE_ANIMATED_ICONS, value)
      }
    },
    gameConnected () {
      return this.$store.state.gameConnected
    }
  },
  mounted () {
    this.unwatchedActions = this.$store.getters.getUnwatchedActions('spaceengineers')
    this.$store.commit(CLEAR_UNWATCHED)
  }
}
</script>

<style lang="scss" scoped>
.bits {
  font-size: 25px;
  &-10 {
    color: #979797
  }
  &-100 {
    color: #9c3ee8
  }
  &-1000 {
    color: #1db2a5
  }
  &-5000 {
    color: #0099fe
  }
  &-10000 {
    color: #f43021
  }
}
.action-list-item {
  transition: transform 1s;
}

.action-list-enter-active, .action-list-leave-active {
  transition: all 1s;
}
.action-list-enter, .action-list-leave-to /* .list-leave-active below version 2.1.8 */ {
  opacity: 0;
  transform: translateY(-40px);
}
</style>
