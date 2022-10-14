local id = redis.call('LINDEX', KEYS[1], 0)
local amount = ARGV[1]
local balance = redis.call('HGET', 'Transactions:' .. id, 'balance')
balance = balance + amount
local newId = id + 1
redis.call('LPUSH', KEYS[1], newId)
local transactionKey = 'Transactions:' .. newId
redis.call('HSET', transactionKey, 
    'id', newId, 
    'user', ARGV[2],
    'deposit', ARGV[3],
    'withdraw', ARGV[4],
    'balance', balance,
    'date', ARGV[5]
)
redis.call('expire', transactionKey, 3600)
redis.call('RPUSH', 'Transactions:Temp', newId)

return balance