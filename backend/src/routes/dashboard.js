import express from 'express';
import session from 'express-session';
import passport from 'passport';
import {Strategy as TwitchStrategy} from 'passport-twitch.js';
import history from 'connect-history-api-fallback';
import jwt from 'jsonwebtoken';
import _cloneDeep from 'lodash/cloneDeep';

import User from '../models/user.model'

export default function () {
    const router = express.Router();

    const SECRET = Buffer.from(process.env.SECRET, 'base64').toString()

    router.use(session({secret: process.env.SECRET, resave: false, saveUninitialized: false, cookie: {secure: false}}));
    passport.use(new TwitchStrategy({
        clientID: process.env.TWITCH_CLIENT_ID,
        clientSecret: process.env.TWITCH_CLIENT_SECRET,
        callbackURL: process.env.URL + '/dashboard/auth/callback'
    }, (accessToken, refreshToken, profile, done) => {
        User.findOne({channel_id: profile.id}).then(result => {
            if (result !== undefined) {
                profile.token = result.token
                return done(null, profile)
            } else {
                return done(null, false, {message: 'You need to setup the extension before you can use this'})
            }
        }).catch(err => {
            done(err);
        })
    }))
    router.use(passport.initialize())
    router.use(passport.session())

    passport.serializeUser(function (u, d) {
        d(null, u);
    });
    passport.deserializeUser(function (u, d) {
        d(null, u);
    });

    router.get('/auth', passport.authenticate('twitch.js'))
    router.get('/auth/callback', passport.authenticate('twitch.js', {
        successRedirect: '/dashboard',
        failureRedirect: '/dashboard?error=1'
    }))
    router.get('/logout', (req, res) => {
        req.logout()
        res.redirect('/dashboard/')
    })
    router.use(history({
        index: '/'
    }))

    router.get('/', (req, res) => {
        let user = undefined
        if (req.session && req.session.passport && req.session.passport.user) {
            let data = _cloneDeep(req.session.passport.user)
            data.token = generateJWT(data.id, data.token)
            user = JSON.stringify(data)
        }
        res.render('dashboard', {layout: false, user: user})
    })

    function generateJWT(id, token) {
        return jwt.sign({channel_id: id, token: token}, SECRET, {noTimestamp: true}, null)
    }

    return router;
}
