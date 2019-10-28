import express from 'express';
import v1 from './v1'
import dashboard from './dashboard'
var router = express.Router();

/* V1 of the api */
router.use('/v1', v1);


router.use('/dashboard', dashboard)


export default router;