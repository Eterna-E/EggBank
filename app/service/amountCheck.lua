local userBalance = KEYS[1]
local amount = tonumber(ARGV[1])
local money = tonumber(redis.call('GET', userBalance))

if (amount > money) then
    return false
end

return true