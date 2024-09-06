<template>
    <div class="actions">
        <h1>Actions</h1>
        <!--<BButton variant="outline-info" :pressed.sync="animatedIcons">Animated Bits</BButton>-->
        <hr />
        <div id="action-list" class="mb-3">
            <TransitionGroup name="action-list">
                <BCard v-for="(action, index) in actions" :key="index" class="mb-2 action-list-item">
                    <BRow>
                        <BCol cols="6" sm="auto" class="mr-sm-auto">
                            <h3>{{ startCase(action.title) }}</h3>
                            <span class="font-weight-bold">{{ action.description }}</span
                            ><br />
                            <span class="font-weight-light">Type: </span
                            ><span class="font-weight-bold">{{ action.action }}</span>
                        </BCol>
                        <BCol cols="6" sm="auto" class="text-right">
                            <Bits :bits="cleanSku(action.sku)" />
                        </BCol>
                        <BCol cols="12" sm="auto" class="text-right">
                            <BButton
                                size="lg"
                                variant="outline-success"
                                :disabled="!conStore.isGameConnected"
                                @click="run(action)"
                            >
                                Run
                            </BButton>
                        </BCol>
                    </BRow>
                </BCard>
                <BAlert variant="info" :model-value="actions.length === 0">
                    <h3>No actions configured</h3>
                    <span>Add actions in the extension to run them from here</span>
                </BAlert>
            </TransitionGroup>
        </div>
    </div>
</template>

<script setup lang="ts">
import Bits from '@/components/Bits.vue'
import { socket } from '@/socket'
import { useConfigStore } from '@/stores/config'
import { useConnectionStore } from '@/stores/connection'
import { useUserStore } from '@/stores/user'
import type { IBitsAction, IConfigData } from '@/types'

import { BCard, useToast } from 'bootstrap-vue-next'
import { startCase } from 'lodash'
import { computed } from 'vue'

const { show } = useToast()

const userStore = useUserStore()
const conStore = useConnectionStore()
const configStore = useConfigStore()

const selectedGame = computed(() => 'spaceengineers')

const actions = computed(() => configStore.getActions(selectedGame.value))

function cleanSku(sku: string) {
    return Number(sku.replace('value', ''))
}

function run(config: IConfigData) {
    const bitsAction: IBitsAction = {
        bits: cleanSku(config.sku),
        user: userStore.user!.displayName,
        action: config.action,
        settings: new Map([['message', config.message], ...config.settings]),
    }
    socket.emit('run_action', bitsAction)

    show?.({
        props: {
            title: 'Action sent',
            body: startCase(config.action),
            value: 1000,
            interval: 1000,
            progressProps: {
                variant: 'primary',
            },
            variant: 'success',
        },
    })
}
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
