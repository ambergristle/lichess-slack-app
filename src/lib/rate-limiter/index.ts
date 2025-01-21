import { RollingRefillLimiter } from './rolling-refill-limiter';
import { WindowedRefillLimiter } from './windowed-refill-limiter';

export {
  RollingRefillLimiter,
  WindowedRefillLimiter,
};

export type Limiter<_Key> =
  |RollingRefillLimiter<_Key>
  | WindowedRefillLimiter<_Key>
