local key      = KEYS[1]          
local max      = tonumber(ARGV[1])
local interval = tonumber(ARGV[2])
local rate     = tonumber(ARGV[3])
local cost     = tonumber(ARGV[4])
local now      = tonumber(ARGV[5])

local bucket = redis.call("HMGET", key, "tokens", "refilled_at")

-- local representation of bucket data
local tokens
local refilledAt -- 

if bucket[1] == false then
  -- if no bucket, then init new one
  refilledAt = now
  tokens = max
else
  -- otherwise populate from old one
  tokens = tonumber(bucket[1])
  refilledAt = tonumber(bucket[2])
end

if now >= refilledAt + interval then
  -- calculate intervals elapsed since refilledAt
  local elapsed = math.floor((now - refilledAt) / interval)
  tokens = math.min(max, tokens + elapsed * rate)

  refilledAt = refilledAt + elapsed * interval
end

if tokens < cost then
  -- local enoughIn = math.ceil((cost - tokens) / rate) * interval
  return {0, tokens, refilledAt + interval}
end

tokens = tokens - cost

-- milliseconds until bucket is replentished
local fullIn = math.ceil(((max - tokens) / rate)) * interval

redis.call("HSET", key, "tokens", tokens, "refilled_at", refilledAt)
redis.call("PEXPIRE", key, fullIn)

return {1, tokens, refilledAt + interval}
