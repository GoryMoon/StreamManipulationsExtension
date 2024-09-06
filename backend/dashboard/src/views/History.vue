<template>
    <div class="actions">
        <h1>History</h1>
        <!--<BButton variant="outline-info" :pressed.sync="animatedIcons">Animated Bits</BButton>-->
        <hr />
        <div id="action-list" class="mb-3">
            <TransitionGroup name="action-list">
                <BCard
                    v-for="action in actions"
                    :key="action._id"
                    :variant="unwatchedActions.includes(action._id) ? 'secondary' : 'primary-subtle'"
                    class="mb-2 action-list-item"
                    @mouseover="removeUnwatched(action._id)"
                >
                    <BRow>
                        <BCol cols="6" sm="auto" class="mr-sm-auto">
                            <h3>{{ startCase(action.action) }}</h3>
                            <span class="font-weight-light">By: </span
                            ><span class="font-weight-bold">{{ action.sender }}</span>
                        </BCol>
                        <BCol cols="6" sm="auto" class="text-right">
                            <Bits :bits="action.bits" />
                        </BCol>
                        <BCol cols="12" sm="auto" class="text-right">
                            <BButton
                                size="lg"
                                variant="outline-success"
                                :disabled="!conStore.isGameConnected"
                                @click="replay(action._id)"
                            >
                                Replay
                            </BButton>
                        </BCol>
                    </BRow>
                </BCard>
            </TransitionGroup>
            <div v-if="actions.length > 0" class="text-center">
                <BButton :disabled="loadingMore" class="mt-2" @click="loadMore">Load More</BButton>
            </div>
            <BAlert variant="info" :model-value="actions.length === 0">
                <h3>No action history available</h3>
                <span>Run some actions from the extension to see them here</span>
            </BAlert>
        </div>
    </div>
</template>

<script setup lang="ts">
import Bits from '@/components/Bits.vue'
import { useConnectionStore } from '@/stores/connection'
import { useHistoryStore } from '@/stores/replay'
import { socket } from '@/socket'

import { startCase, remove } from 'lodash'
import { computed, onMounted, ref } from 'vue'
import { useToast } from 'bootstrap-vue-next'
import type { IDashAction } from '@/types'

const { show } = useToast()

const conStore = useConnectionStore()
const replayStore = useHistoryStore()

const loadingMore = ref(false)

const selectedGame = ref('spaceengineers')
const unwatchedActions = ref<string[]>([])

const actions = computed(() => replayStore.getActions(selectedGame.value))

function removeUnwatched(id: string) {
    remove(unwatchedActions.value, a => a == id)
}

function replay(action: IDashAction) {
    socket.emit('replay_action', action._id)
    show?.({
        props: {
            title: 'Replay sent',
            body: startCase(action.action),
            value: 1000,
            interval: 1000,
            progressProps: {
                variant: 'primary',
            },
            variant: 'success',
        },
    })
}

async function loadMore() {
    loadingMore.value = true
    await replayStore.loadMore()
    loadingMore.value = false
}

onMounted(() => {
    unwatchedActions.value = replayStore.getUnwatchedActions(selectedGame.value)
    replayStore.clearUnwatched()
})
</script>

<style lang="css" scoped>
.action-list-item {
    transition: transform 1s;
}

.action-list-enter-active,
.action-list-leave-active {
    transition: all 1s;
}

.action-list-enter-from,
.action-list-leave-to {
    opacity: 0;
    transform: translateY(-40px);
}
</style>
