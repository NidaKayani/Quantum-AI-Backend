import { Router } from 'express';
import { authenticate } from '../middleware/index.js';
import { UsageMetric } from '../models/UsageMetric.js';
import { sendSuccess } from '../utils/helpers.js';

const router = Router();

router.get('/summary', authenticate, async (req, res, next) => {
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const byOperation = await UsageMetric.aggregate([
      { $match: { userId: req.userId!, createdAt: { $gte: since } } },
      {
        $group: {
          _id: '$operation',
          requests: { $sum: 1 },
          averageLatencyMs: { $avg: '$latencyMs' },
          totalTokens: { $sum: { $ifNull: ['$totalTokens', 0] } },
          successes: { $sum: { $cond: ['$success', 1, 0] } },
        },
      },
      { $sort: { requests: -1 } },
    ]);
    return sendSuccess(res, { periodDays: 30, byOperation });
  } catch (error) {
    return next(error);
  }
});

export default router;
