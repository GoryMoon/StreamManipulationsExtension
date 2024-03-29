import express, { NextFunction, Request, Response } from 'express'
import session from 'express-session'
import passport from 'passport'
import { Profile, Strategy as TwitchStrategy, VerifyCallback } from '@oauth-everything/passport-twitch'
import history from 'connect-history-api-fallback'
import jwt from 'jsonwebtoken'
import { createClient } from 'redis'
import RedisStore from 'connect-redis'
import _cloneDeep from 'lodash/cloneDeep'

import User from '../models/user.model'
import _isNil from 'lodash/isNil'

interface AuthUser extends Profile {
    token?: string
}

export default function () {
    const router = express.Router()

    const secret = process.env.SECRET as string
    const SECRET = Buffer.from(secret, 'base64').toString()

    const twitchStrategy = new TwitchStrategy(
        {
            clientID: process.env.TWITCH_CLIENT_ID as string,
            clientSecret: process.env.TWITCH_CLIENT_SECRET as string,
            callbackURL: `${process.env.URL as string}/dashboard/auth/callback`,
        },
        async (
            accessToken: string,
            refreshToken: string,
            profile: Profile,
            done: VerifyCallback<AuthUser>
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
        }
    )

    const redisClient = createClient()
    redisClient.connect().catch(console.error)

    const redisStore: RedisStore = new RedisStore({
        client: redisClient,
    })

    router.use(
        session({
            store: redisStore,
            secret: secret,
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: 'auto',
            },
        })
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
        })
    )
    router.get('/logout', (req: Request, res: Response, next: NextFunction) => {
        req.logout(err => {
            if (err) return next(err)
            res.redirect('/dashboard')
        })
    })
    router.use(
        history({
            index: '/',
        })
    )

    router.get('/', (req: Request, res: Response) => {
        let user = undefined
        if (req.session && req.user) {
            const data: AuthUser = _cloneDeep(req.user as AuthUser)
            if (!_isNil(data.token)) {
                data.token = generateJWT(data.id, data.token)
                user = JSON.stringify(data)
            }
        }
        res.render('dashboard', { layout: false, user: user })
    })

    function generateJWT(id: string, token: string) {
        return jwt.sign({ channel_id: id, token: token }, SECRET, {
            noTimestamp: true,
        })
    }

    return router
}
