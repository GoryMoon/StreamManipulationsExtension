<template>
    <div class="chat">
        <h1>Channel Point Rewards</h1>
        <BButton variant="outline-info" :pressed="cpStore.chatStatus" @click="cpStore.toggleChatStatus">
            {{ getButtonText }}
        </BButton>
        <p class="mt-2">The bot need to be in the chat for the channel point rewards to work</p>
        <p>
            Run the channel point rewards and it will be logged here, use this in the plugin for a condition
        </p>
        <hr />
        <div id="chat-list" class="mB3">
            <TransitionGroup name="chat-list">
                <BCard v-for="(msg, index) in cpStore.chatMessages" :key="index" class="mb-2 chat-list-item">
                    <BRow>
                        <BCol cols="6" sm="auto" class="mr-sm-auto">
                            <h3><span class="font-weight-light">ID: </span>{{ msg.id }}</h3>
                            <span class="font-weight-light">User: </span
                            ><span class="font-weight-bold">{{ msg.user }}</span
                            ><br />
                            <span class="font-weight-light"
                                >Msg: <span class="font-weight-bold">{{ msg.message }}</span></span
                            >
                        </BCol>
                    </BRow>
                </BCard>
            </TransitionGroup>
            <BAlert variant="info" :model-value="cpStore.chatMessages.length === 0">
                <h3>No channel point redemptions received</h3>
                <span>Run some channel point redemptions to see them here</span>
            </BAlert>
        </div>
    </div>
</template>

<script setup lang="ts">
import { useChannelPointStore } from '@/stores/cp'
import { computed } from 'vue'

const cpStore = useChannelPointStore()
const getButtonText = computed(() => (cpStore.chatStatus ? 'Leave chat' : 'Join chat'))
</script>

<style scoped>
.chat-list-item {
    transition: transform 1s;
}

.chat-list-enter-active,
.chat-list-leave-active {
    transition: all 1s;
}

.chat-list-enter,
.chat-list-leave-to

/* .list-leave-active below version 2.1.8 */ {
    opacity: 0;
    transform: translateY(-20px);
}
</style>
