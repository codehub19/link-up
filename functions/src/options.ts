import { setGlobalOptions } from 'firebase-functions/v2'

// Applies to every function.
// - cpu 'gcf_gen1': a fraction of a vCPU sized to the memory (like 1st-gen functions)
//   instead of a full vCPU each. The project's per-region Cloud Run CPU quota is
//   small, and full-CPU functions made deploys fail with
//   "Quota exceeded for total allowable CPU per project per region".
// - maxInstances 10: plenty for our traffic and caps runaway costs.
setGlobalOptions({ region: 'asia-south2', cpu: 'gcf_gen1', maxInstances: 10 })
