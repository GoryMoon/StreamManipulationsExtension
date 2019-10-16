import express from 'express';
import v1 from './v1'
var router = express.Router();

/* V1 of the api */
router.use('/v1', v1);

export default router;