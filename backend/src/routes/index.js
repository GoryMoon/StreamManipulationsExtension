import express from 'express';
import v1 from './v1'
import v2 from './v2'
import dashboard from './dashboard'
import rateLimit from "express-rate-limit";

export default function (io) {
    const router = express.Router();

    const apiLimiter = rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 240 // 4 requests/sec
    })

    /* V1 of the api */
    router.use('/v1', apiLimiter, v1(io));

    /* V2 of the api, functional changes compared to v1  */
    router.use('/v2', apiLimiter, v2(io));

    router.use('/dashboard', dashboard())
    return router
}
