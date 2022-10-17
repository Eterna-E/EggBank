local id = KEYS[1]
local userBalance = KEYS[2]
local amount = ARGV[1]
local newId = redis.call('INCR', id)
local balance = redis.call('INCRBY', userBalance, amount)

return { newId, balance }