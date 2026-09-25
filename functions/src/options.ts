import { setGlobalOptions } from 'firebase-functions/v2'

// Applies to every function. Each function may otherwise scale to 100 instances,
// and Cloud Run counts (max instances x CPU) against a per-region CPU quota, which
// blocks deploys once there are many functions. 10 is plenty for our traffic and
// also caps runaway costs.
setGlobalOptions({ region: 'asia-south2', maxInstances: 10 })
