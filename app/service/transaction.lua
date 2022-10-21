local id = KEYS[1]
local userBalance = KEYS[2]
local amount = tonumber(ARGV[1])
local operate = ARGV[2]
local money = tonumber(redis.call('GET', userBalance))

if (operate == 'withdraw') then
    if (amount > money) then
        return false
    end
    amount = -amount
end

local newId = redis.call('INCR', id)
local balance = redis.call('INCRBY', userBalance, amount)

return { newId, balance }