import express from 'express';
import v1 from './v1'
import v2 from './v2'
import dashboard from './dashboard'

const router = express.Router();

/* V1 of the api */
router.use('/v1', v1);

/* V2 of the api, functional changes compared to v1  */
router.use('/v2', v2);

router.use('/dashboard', dashboard)

export default router;
