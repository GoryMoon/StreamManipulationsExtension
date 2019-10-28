<template>
  <div class="dashboard">
    <h1>Dashboard</h1>
    <hr>
    <b-card v-if="hasUser" title="Actions" style="max-width: 30rem;">
      <b-card-text>
        Here you can monitor and replay actions that users have done from the extension
      </b-card-text>
      <b-button to="actions" variant="outline-info">View Actions</b-button>
    </b-card>
    <div v-else>
      <p>You need to login to start monitor actions</p>
      <b-button variant="outline-info" href="/dashboard/auth">
        Login
      </b-button>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex'

export default {
  name: 'home',
  computed: {
    ...mapGetters([
      'hasUser'
    ])
  }
}
</script>
