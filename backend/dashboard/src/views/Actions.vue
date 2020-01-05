<template>
  <div class="actions">
    <h1>Actions</h1>
    <b-button
    variant="outline-info"
    :pressed.sync="animatedIcons">Animated Bits</b-button>
    <hr>
    <div id="action-list" class="mb-3">
      <transition-group name="action-list">
        <b-card
        v-for="(action, index) in getActions"
        :key="index"
        class="mb-2 action-list-item">
          <b-row>
            <b-col cols="6" sm="auto" class="mr-sm-auto">
              <h3>{{ caseType(action.title) }}</h3>
              <span class="font-weight-bold">{{ action.description }}</span><br>
              <span class="font-weight-light">Type: </span><span class="font-weight-bold">{{ action.action }}</span>
            </b-col>
            <b-col cols="6" sm="auto" :class="[getBitColor(cleanSku(action.sku)), 'text-right']">
              <img
              :src="getBitImage(cleanSku(action.sku))"
              :alt="cleanSku(action.sku) + 'bits'"
              width="40" height="40"> {{ cleanSku(action.sku) }} bits
            </b-col>
            <b-col cols="12" sm="auto" class="text-right">
              <b-button
              size="lg"
              variant="outline-success"
              :disabled="!gameConnected"
              @click="run(index)">
                Run
              </b-button>
            </b-col>
          </b-row>
        </b-card>
      </transition-group>
    </div>
  </div>
</template>

<script>
import startCase from 'lodash.startcase'
import { UPDATE_ANIMATED_ICONS } from '@/store/mutation-types'
import { mapState } from 'vuex'

export default {
  name: 'actions',
  data () {
    return {
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
    cleanSku (sku) {
      return sku.replace('value', '')
    },
    getBitImage (bits) {
      const icons = this.animatedIcons ? this.icons.animated : this.icons.static
      return (bits < 100 ? icons.gray : bits < 1000 ? icons.purple : bits < 5000 ? icons.green : bits < 10000 ? icons.blue : icons.red)
    },
    getBitColor (bits) {
      return 'bits ' + (bits < 100 ? 'bits-10' : bits < 1000 ? 'bits-100' : bits < 5000 ? 'bits-1000' : bits < 10000 ? 'bits-5000' : 'bits-10000')
    },
    run (id) {
      const config = this.getActions[id]
      const action = {
        bits: this.cleanSku(config.sku),
        sender: this.user.display_name,
        action: config.action,
        config: { message: config.message, ...config.settings }
      }
      this.$socket.client.emit('run', action)
      this.$bvToast.toast('Action sent', {
        title: 'Action',
        autoHideDelay: 1000,
        variant: 'success'
      })
    }
  },
  computed: {
    ...mapState([
      'user',
      'gameConnected'
    ]),
    getActions () {
      return this.$store.getters.getConfig
    },
    animatedIcons: {
      get () {
        return this.$store.state.animatedIcons
      },
      set (value) {
        this.$store.commit(UPDATE_ANIMATED_ICONS, value)
      }
    }
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
