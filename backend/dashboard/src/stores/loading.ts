import { defineStore } from "pinia";
import { nextTick } from "vue";


interface State {
    part: number,
    timer: ReturnType<typeof setInterval> | null

    percent: number,
    success: boolean,
    visible: boolean
}

export const useLoadingStore = defineStore('loading', {
    state: (): State => {
        return {
            part: 0,
            timer: null,

            percent: 0,
            success: true,
            visible: false,
        }
    },

    getters: {
        getPercentage: (state) => Math.floor(state.percent)
    },

    actions: {
        start(time: number = 3000) {
            this.percent = 0
            this.visible = true
            this.success = true
            this.part = 10000 / Math.floor(time)
            clearInterval(this.timer!)
            this.timer = setInterval(() => {
                this.increase(this.part * Math.random())
            }, 100)
        },

        increase(amount: number) {
            this.percent = Math.min(99, this.percent + Math.floor(amount))
        },

        hide() {
            clearInterval(this.timer!)
            setTimeout(() => {
                this.visible = false
                nextTick(() => {
                    setTimeout(() => {
                        this.percent = 0
                    }, 100)
                })
            }, 300)

        },

        finish() {
            this.percent = 100
            this.hide()
        },

        fail() {
            this.success = false
            this.percent = 100
            this.hide()
        }
    }
})