<template>
    <div class="dashboard">
        <h1>Dashboard</h1>
        <hr />
        <BCardGroup v-if="store.hasUser" deck>
            <BCard title="Action History" style="max-width: 30rem">
                <BCardText>
                    Here you can monitor and replay actions that users have done from the extension
                </BCardText>
                <BButton to="history" variant="outline-info">View History</BButton>
            </BCard>
            <BCard title="Actions" style="max-width: 30rem">
                <BCardText> Here you check and test you actions </BCardText>
                <BButton to="actions" variant="outline-info">View Actions</BButton>
            </BCard>
            <BCard title="Channel Points" style="max-width: 30rem">
                <BCardText> Here you can get the channel points to use in the events file </BCardText>
                <BButton to="channel_points" variant="outline-info">View Channel Points</BButton>
            </BCard>
        </BCardGroup>
        <div v-else>
            <p>You need to login to start monitor actions</p>
            <BButton variant="outline-info" :href="`${serverUrl}/dashboard/auth`"> Login </BButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user'

const store = useUserStore()

const serverUrl = import.meta.env.DEV ? 'http://localhost:3000' : ''
</script>
