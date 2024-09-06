<template>
    <LoadingBar />
    <BNavbar variant="dark-subtle" container="md" class="mb-3">
        <BNavbarBrand to="/">Stream Manipulations</BNavbarBrand>
        <BNavbarToggle target="nav-collapse"></BNavbarToggle>

        <BCollapse id="nav-collapse" is-nav>
            <BNavbarNav v-if="store.hasUser">
                <BNavItem to="history" active-class="active">
                    History
                    <BBadge v-if="replayStore.getUnwatchedAmount > 0" variant="info">
                        {{ replayStore.getUnwatchedAmount }}
                    </BBadge>
                </BNavItem>
                <BNavItem to="actions" active-class="active">Actions</BNavItem>
                <BNavItem to="channel_points" active-class="active">Channel Point Rewards</BNavItem>
            </BNavbarNav>

            <BNavbarNav class="ms-auto mb-2 mb-lg-0">
                <BNavText
                    v-if="store.hasUser"
                    :class="['me-3', conStore.isGameConnected ? 'text-success' : 'text-danger']">
                    {{ connectedGame }}
                </BNavText>

                <BNavText
                    v-if="store.hasUser" v-BTooltip.hover
                    :class="['me-3', conStore.connected ? 'text-success' : 'text-danger']"
                    :title="conStore.connected ? 'Connected to server' : 'Server offline'">
                    <fa :icon="conStore.connected ? 'link' : 'unlink'" />
                </BNavText>

                <BNavItemDropdown v-if="store.hasUser" right>
                    <template #button-content>
                        <em>{{ store.user!.displayName }}</em>
                    </template>
                    <BDropdownItem :href="`${serverUrl}/dashboard/logout`">Sign Out</BDropdownItem>
                </BNavItemDropdown>
                <BNavItem v-else :href="`${serverUrl}/dashboard/auth`">Login</BNavItem>
            </BNavbarNav>
        </BCollapse>
    </BNavbar>

    <BContainer>
        <BAlert variant="danger" :model-value="hasError">
            You need to setup the extension before you can use this
        </BAlert>
        <RouterView></RouterView>
    </BContainer>
    <BToastOrchestrator />
</template>

<script setup lang="ts">
import { RouterView, useRoute } from 'vue-router'
import { computed } from 'vue'

import { useColorMode } from 'bootstrap-vue-next'
import { useUserStore } from './stores/user'

import { socket } from '@/socket'
import { useConnectionStore } from './stores/connection'
import { useChannelPointStore } from './stores/cp'
import { useHistoryStore } from './stores/replay'
import { useConfigStore } from './stores/config'
import LoadingBar from './components/LoadingBar.vue'

const serverUrl = import.meta.env.DEV ? 'http://localhost:3000' : ''

const route = useRoute()

const store = useUserStore()
const conStore = useConnectionStore()
const cpStore = useChannelPointStore()
const replayStore = useHistoryStore()
const configStore = useConfigStore()

const hasError = computed(() => route.query['error'] === '1')
const connectedGame = computed(() => {
    return conStore.isGameConnected ? `${conStore.connectedGame!.name} connected` : 'No game connected'
})

const mode = useColorMode()
mode.value = 'dark'

socket.off()

conStore.bindEvents()
cpStore.bindEvents()
replayStore.bindEvents()
configStore.bindEvents()

</script>
