<template>
  <div class="dashboard">
    <h1>Dashboard</h1>
    <hr>
    <b-card-group v-if="hasUser" deck>
      <b-card title="Replay Actions" style="max-width: 30rem;">
        <b-card-text>
          Here you can monitor and replay actions that users have done from the extension
        </b-card-text>
        <b-button to="replay" variant="outline-info">Replay Actions</b-button>
      </b-card>
      <b-card title="Actions" style="max-width: 30rem;">
        <b-card-text>
          Here you check and test you actions
        </b-card-text>
        <b-button to="actions" variant="outline-info">View Actions</b-button>
      </b-card>
      <b-card title="Channel Points" style="max-width: 30rem;">
        <b-card-text>
          Here you can get the channel points to use in the events file
        </b-card-text>
        <b-button to="channel_points" variant="outline-info">View Channel Points</b-button>
      </b-card>
    </b-card-group>
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
