import express, { static as static_, type NextFunction, type Request, type Response } from 'express'
import session from 'express-session'
import passport from 'passport'
import {
    type Profile,
    Strategy as TwitchStrategy,
    type VerifyCallback,
} from '@oauth-everything/passport-twitch'
import history from 'connect-history-api-fallback'
import jwt from 'jsonwebtoken'
import MongoStore from 'connect-mongo'
import _cloneDeep from 'lodash/cloneDeep'
import _isNil from 'lodash/isNil'

import User from '../models/user.model'
import mongoose from 'mongoose'
import type { MongoClient } from 'mongodb'
import path from 'path'

interface AuthUser extends Profile {
    token?: string
}

export default function () {
    const router = express.Router()

    const SECRET = Buffer.from(process.env.APP_SECRET, 'base64').toString()

    const twitchStrategy = new TwitchStrategy(
        {
            clientID: process.env.TWITCH_CLIENT_ID,
            clientSecret: process.env.TWITCH_CLIENT_SECRET,
            callbackURL: `${process.env.URL}/dashboard/auth/callback`,
        },
        async (
            _accessToken: string,
            _refreshToken: string,
            profile: Profile,
            done: VerifyCallback<AuthUser>,
        ) => {
            try {
                const user = await User.findOne({ channel_id: { $eq: profile.id } })
                if (!_isNil(user)) {
                    const authUser: AuthUser = profile
                    authUser.token = user.token
                    return done(null, authUser)
                } else {
                    return done(null, undefined, {
                        message: 'You need to setup the extension before you can use this',
                    })
                }
            } catch (e) {
                done(e as Error)
            }
        },
    )

    const clientPromise = Promise.resolve(mongoose.connection.getClient())
    const mongoStore = MongoStore.create({
        clientPromise: clientPromise as unknown as Promise<MongoClient>,
        autoRemove: 'native',
        collectionName: 'dashboard-sessions',
    })

    router.use(
        session({
            store: process.env.NODE_ENV == 'development' ? new session.MemoryStore() : mongoStore,
            secret: SECRET,
            resave: false,
            saveUninitialized: false,
            name: 'smapiSession',
            cookie: {
                secure: 'auto',
                httpOnly: false,
            },
        }),
    )
    router.use(passport.initialize())
    router.use(passport.session())
    passport.use(twitchStrategy)

    passport.serializeUser((u, d) => {
        d(null, u as Profile)
    })
    passport.deserializeUser((u, d) => {
        d(null, u as Profile)
    })

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    router.get('/auth', passport.authenticate('twitch'))
    router.get(
        '/auth/callback',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        passport.authenticate('twitch', {
            successRedirect: '/dashboard',
            failureRedirect: '/dashboard?error=1',
            failWithError: true,
        }),
    )
    router.get('/me', (req: Request, res: Response) => {
        if (req.session && req.user) {
            const data: AuthUser = _cloneDeep(req.user as AuthUser)
            if (!_isNil(data.token)) {
                data.token = generateJWT(data.id, data.token)

                return res.json(data)
            }
        }
        
        res.status(401).send()
    })

    router.get('/logout', (req: Request, res: Response, next: NextFunction) => {
        req.logout(err => {
            if (err) return next(err)
            res.redirect('/dashboard')
        })
    })
    router.use(history())

    router.use(static_(path.join(__dirname, '../../public')))
    router.get('/', (_req: Request, res: Response) => {
        res.sendFile(path.join(__dirname, '../../public/index.html'))
    })

    function generateJWT(id: string, token: string) {
        return jwt.sign({ channel_id: id, token: token }, SECRET, {
            noTimestamp: true,
        })
    }

    return router
}
