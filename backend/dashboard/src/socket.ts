import { io, Socket } from 'socket.io-client'
import type { IDashAction, IChannelPointAction, IBitsAction, IConfigData, IDashGame } from './types'

const serverUrl = import.meta.env.DEV ? 'http://localhost:3000' : ''
export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(`${serverUrl}/dashboard`, {
    autoConnect: false,
})

export interface ServerToClientEvents {
    config: (configData: IConfigData[]) => void
    dash_action: (action: IDashAction) => void
    update_game_connection: (connectedGame: IDashGame | null) => void
    update_chat_status: (connectBot: boolean) => void
    connect_actions: (action: IDashAction[]) => void
    chat_msg: (channelPointAction: IChannelPointAction) => void
}

export interface ClientToServerEvents {
    run_action: (action: IBitsAction) => void
    replay_action: (id: string) => void
    load_actions: (offset: number, callback: (actions: IDashAction[]) => void) => void
    set_channel_status: (channel_name: string, status: boolean) => void
}
