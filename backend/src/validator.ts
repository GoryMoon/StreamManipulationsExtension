import Ajv, { JSONSchemaType } from 'ajv'
import { IConfigData } from './models/config.model'
import {
    ISendActionRequest,
    IPostGameActionsRequest,
    ITransactionProduct,
    ITransactionReceipt,
} from './types'

const ajv = new Ajv({ formats: { date: true } })

const schema_config_data: JSONSchemaType<IConfigData> = {
    $id: 'https://gorymoon.se/schemas/config_data.json',
    type: 'object',
    properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        action: { type: 'string' },
        message: { type: 'string' },
        sku: { type: 'string' },
        settings: {
            type: 'object',
            required: [],
        },
    },
    required: ['title', 'description', 'sku', 'message', 'action'],
    additionalProperties: false,
}
const schema_transaction_product: JSONSchemaType<ITransactionProduct> = {
    $id: 'https://gorymoon.se/schemas/transaction_product.json',
    type: 'object',
    properties: {
        sku: { type: 'string' },
        displayName: { type: 'string' },
        domainId: { type: 'string' },
        cost: {
            type: 'object',
            properties: {
                amount: { type: 'integer' },
                type: { type: 'string' },
            },
            required: ['amount', 'type'],
        },
    },
    required: ['sku', 'displayName', 'domainId'],
}

const schema_transaction_receipt: JSONSchemaType<ITransactionReceipt> = {
    $id: 'https://gorymoon.se/schemas/transaction_recipts.json',
    type: 'object',
    properties: {
        topic: { type: 'string' },
        data: { $ref: 'transaction_product.json' },
        opaque_user_id: { type: 'string' },
        exp: { type: 'integer' },
        channel_id: { type: 'string' },
        role: { type: 'string' },
        is_unliked: { type: 'boolean' },
        pubsub_perms: {
            type: 'object',
            properties: {
                listen: {
                    type: 'array',
                    items: { type: 'string' },
                    nullable: true,
                },
                send: {
                    type: 'array',
                    items: { type: 'string' },
                    nullable: true,
                },
            },
            required: [],
        },
    },
    required: ['topic', 'data', 'opaque_user_id', 'channel_id', 'role', 'is_unliked'],
}

const schema_post_game_actions_request: JSONSchemaType<IPostGameActionsRequest> = {
    $id: 'https://gorymoon.se/schemas/post_game_actions_request.json',
    type: 'object',
    properties: {
        config: { $ref: 'config_data.json' },
    },
    required: ['config'],
    additionalProperties: false,
}

const schema_send_action_request: JSONSchemaType<ISendActionRequest> = {
    $id: 'https://gorymoon.se/schemas/send_action_request.json',
    type: 'object',
    properties: {
        token: { type: 'string' },
        user: { type: 'string' },
        action: { type: 'string' },
        product: { $ref: 'transaction_product.json' },
        settings: {
            type: 'object',
            required: [],
        },
    },
    required: ['token', 'user', 'action', 'product', 'settings'],
}

const configDataValidator = ajv.compile(schema_config_data)
const transactionProductValidator = ajv.compile(schema_transaction_product)
const transactionReceiptValidator = ajv.compile(schema_transaction_receipt)
const gameActionsRequestValidator = ajv.compile(schema_post_game_actions_request)
const sendActionRequestValidator = ajv.compile(schema_send_action_request)

export {
    ajv,
    configDataValidator,
    transactionProductValidator,
    transactionReceiptValidator,
    gameActionsRequestValidator,
    sendActionRequestValidator,
}
