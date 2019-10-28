<template>
  <div>
    <b-navbar type="dark" variant="primary" class="mb-3">
      <b-container>
        <b-navbar-brand><router-link to="/">Stream Engineer</router-link></b-navbar-brand>
        <b-navbar-toggle target="nav-collapse"></b-navbar-toggle>

        <b-collapse id="nav-collapse" is-nav>
          <b-navbar-nav v-if="hasUser">
            <b-nav-item>
              <router-link to="/actions">
                Actions <b-badge v-if="getUnwatchedAmount > 0" variant="info">{{ getUnwatchedAmount }}</b-badge>
              </router-link>
            </b-nav-item>
          </b-navbar-nav>

          <b-navbar-nav class="ml-auto">
            <b-nav-text
            v-if="hasUser"
            :class="['mr-3', gameConnected ? 'text-success': 'text-danger']"
            v-b-tooltip.hover :title="gameConnected ? 'Game connected': 'Game not connected'">
              <fa :icon="gameConnected ? 'link': 'unlink'"></fa>
            </b-nav-text>
            <b-nav-item-dropdown right v-if="hasUser">
              <template v-slot:button-content>
                <em>{{ user.display_name }}</em>
              </template>
              <b-dropdown-item href="/dashboard/logout">Sign Out</b-dropdown-item>
            </b-nav-item-dropdown>
            <b-nav-item href="/dashboard/auth" v-else>Login</b-nav-item>
          </b-navbar-nav>
        </b-collapse>
      </b-container>
    </b-navbar>
    <b-container id="app">
      <b-alert variant="danger" :show="hasError">
        You need to setup the extension before you can use this
      </b-alert>
      <router-view></router-view>
    </b-container>
</div>
</template>

<script>
import { mapGetters, mapState } from 'vuex'

export default {
  name: 'app',
  computed: {
    ...mapState([
      'user',
      'gameConnected'
    ]),
    ...mapGetters([
      'hasUser',
      'getUnwatchedAmount'
    ]),
    hasError () {
      return this.$route.query.error === '1'
    }
  }
}
</script>

<style lang="scss">

</style>
