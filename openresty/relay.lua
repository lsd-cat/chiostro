-- The whole backend: a blind relay plus a blind write-once store, per room, for every app.
-- One room is `<app>/<id>`; the id is a hash of a link secret the server never sees.
--
-- Relay, one WebSocket per room at /ws/<app>/<id>:
--   text   client -> server "<to id or *> <blob>",  server -> client "H <id> <ids>" | "J <id>" | "L <id>" | "M <from> <blob>"
--   binary client -> server to(4 BE, 0 = all) | payload,  server -> client from(4 BE) | payload
-- Store, HTTP at /blob/<app>/<id>/<slot>, sealed bytes (nginx spools the body, Lua moves the file):
--   PUT -> 201 | 409 | 413 | 429, write once;  GET <slot> or GET index -> the file, streamed by nginx.
--   Every successful put is announced to the room's peers as "S <slot> <time> <size>".
-- Disk (store.conf): $data/<app>/<id>.<slot> and $data/<app>/<id>.index (one line per put: time slot size); the
--   index's mtime is the room's last write, which the expiry cron looks at. Bucket: the same names as object
--   keys, no index, the listing is the index (s3.lua); expiry is expire.lua on the loopback.
-- Memory: queues are bounded per peer, rate and quota counters live in a shared dict with
-- expiry, room tables are freed when the last peer leaves. Rooms are per worker: one worker.
local MAX_MSG = 256 * 1024               -- a frame; enforced by the WebSocket layer and the reassembly below
local QUEUE = 8                           -- frames waiting per slow peer; a sender whose target is full waits (bounded, see push)
local QUOTA = {share = 2048, default = 200}   -- MB stored per room, per app
local PUTS_PER_10S = 40                   -- per client address, both doors (4/s, bursts of 40: a file is many chunks)
-- shortcut: the address is remote_addr, so nginx must face clients directly (the role does); behind a proxy every client would share one limit
local dict = ngx.shared.chiostro
local s3 = require "s3"   -- enabled when store.conf names a bucket

local app, room = ngx.var.app, ngx.var.room
local data_dir = ngx.var.data   -- store.conf: a directory, or empty for <prefix>/data
if not data_dir or data_dir == "" then data_dir = ngx.config.prefix() .. "data" end
if not (app and app:match("^[a-z0-9]+$") and room and #room == 64 and room:match("^%x+$")) then return ngx.exit(400) end
local key = app .. "/" .. room
local path = data_dir .. "/" .. app .. "/" .. room

-- ---------- store ----------
local function allowed()   -- fixed 10 s windows per address; the dict expires them
  local k = "r:" .. ngx.var.remote_addr .. ":" .. math.floor(ngx.now() / 10)
  local n = dict:incr(k, 1, 0, 20)
  return n ~= nil and n <= PUTS_PER_10S
end
local function used()   -- bytes stored in this room, from the index, cached ten minutes
  local n = dict:get("u:" .. key)
  if n then return n end
  n = 0
  if s3.enabled then for _, o in ipairs(s3.list(key .. ".") or {}) do n = n + o.size end
  else
    local f = io.open(path .. ".index")
    if f then for line in f:lines() do n = n + (tonumber(line:match("%d+ %S+ (%d+)")) or 0) end f:close() end
  end
  dict:set("u:" .. key, n, 600)
  return n
end
local function exists(slot)   -- true, false, or nil when the bucket could not say (then nothing is written)
  if s3.enabled then local st = s3.request("HEAD", key .. "." .. slot).status; if st == 200 then return true elseif st == 404 then return false end return nil end
  local f = io.open(path .. "." .. slot, "r") if f then f:close() return true end return false
end
-- The spooled body becomes the slot: a rename on disk, a signed put to the bucket. nil on failure.
local function place(slot, body)
  if not s3.enabled then return os.rename(body, path .. "." .. slot) end
  local f = io.open(body, "rb"); local bytes = f:read("*a"); f:close(); os.remove(body)
  ngx.req.set_header("Content-Type", "application/octet-stream")   -- the bucket stores the type it is given: never the uploader's
  ngx.req.set_header("If-None-Match", "*")   -- the bucket's own write-once, where it supports it (a 412 is our 409)
  local r = s3.request("PUT", key .. "." .. slot, nil, bytes)
  ngx.req.clear_header("If-None-Match")
  if r.status == 412 then return nil, 409 end
  if r.status ~= 200 then ngx.log(ngx.ERR, "bucket put ", slot, ": ", r.status) return nil, 502 end
  return true
end
local function commit(slot, size)   -- after the blob is in place: index line (disk), quota cache
  local now = math.floor(ngx.now() * 1000)
  if not s3.enabled then
    local idx = io.open(path .. ".index", "a")
    if not idx then return nil end
    idx:write(now, " ", slot, " ", size, "\n"); idx:close()
  end
  dict:set("u:" .. key, used() + size, 600)
  return now
end
-- The index as text: the file on disk, the listing from the bucket.
local function index()
  if not s3.enabled then return ngx.exec("/_index/" .. app .. "/" .. room .. ".index") end
  local objects, err = s3.list(key .. ".")
  if not objects then return ngx.exit(502) end
  local lines = {}
  for _, o in ipairs(objects) do lines[#lines + 1] = o.at .. " " .. o.key:sub(#key + 2) .. " " .. o.size .. "\n" end
  ngx.header["Cache-Control"] = "no-cache"
  ngx.print(table.concat(lines))
end
-- Admission for a put of `size` bytes: nil if fine, else the status to answer.
local lock = "l:" .. key .. "."   -- + slot: held from admission to the end of the put, so two puts of one slot cannot both pass the check (the bucket path yields between check and put)
local function refuse(slot, size)
  if not allowed() then return 429 end
  if not dict:add(lock .. slot, 1, 30) then return 409 end
  if used() + size > (QUOTA[app] or QUOTA.default) * 1048576 then return 413 end
  local there = exists(slot)
  if there == nil then dict:delete(lock .. slot) return 502 end
  if there then return 409 end   -- write once: an existing slot is final (the lock may stay: the slot is)
end

-- ---------- rooms and peer queues ----------
local ws_server = require "resty.websocket.server"
local semaphore = require "ngx.semaphore"
local S = package.loaded.chiostro_relay_state or {rooms = {}, next_id = 0}
package.loaded.chiostro_relay_state = S

local function be32(n) return string.char(math.floor(n / 2^24) % 256, math.floor(n / 2^16) % 256, math.floor(n / 2^8) % 256, n % 256) end
local function from_be32(s) local a, b, c, d = s:byte(1, 4) return ((a * 256 + b) * 256 + c) * 256 + d end
local function new_peer(id)
  return {id = id, q = {}, head = 1, tail = 0, slots = semaphore.new(QUEUE), items = semaphore.new(0), closed = false}
end
local function push(p, kind, data, wait)   -- bounded queue: push waits up to `wait` seconds while full, so backpressure reaches the sender
  if p.closed then return end
  if wait then
    if not p.slots:wait(wait) then return end        -- still full: drop this message for this peer (the client resyncs on a gap)
  elseif p.slots:count() <= 0 then return
  else p.slots:wait(0) end
  p.tail = p.tail + 1
  p.q[p.tail] = {kind, data}
  p.items:post(1)
end

-- ---------- HTTP door ----------
if ngx.var.slot then
  local slot, method = ngx.var.slot, ngx.req.get_method()
  if method == "GET" or method == "HEAD" then
    if slot == "index" then return index() end
    if s3.enabled then return s3.stream(key .. "." .. slot) end
    return ngx.exec("/_blob/" .. app .. "/" .. room .. "." .. slot)   -- static: nginx streams it
  elseif method == "PUT" then
    if slot == "index" then return ngx.exit(405) end   -- the index is the server's own list, never a slot
    ngx.req.read_body()
    local body = ngx.req.get_body_file()
    if not body then return ngx.exit(400) end   -- client_body_in_file_only guarantees a file
    local f = io.open(body, "rb"); local size = f:seek("end"); f:close()
    local status = refuse(slot, size)
    if status then os.remove(body) return ngx.exit(status) end
    ngx.req.clear_header("Content-Length")   -- the bucket put carries its own; the parent's must not shadow it
    local placed, why = place(slot, body)
    if not placed then os.remove(body); dict:delete(lock .. slot); return ngx.exit(why or 500) end
    local now = commit(slot, size)
    if not now then return ngx.exit(500) end
    for _, p in pairs(S.rooms[key] or {}) do push(p, "text", "S " .. slot .. " " .. now .. " " .. size) end   -- peers on the socket learn of it
    return ngx.exit(201)
  end
  return ngx.exit(405)
end

-- ---------- relay ----------
local wb, err = ws_server:new{timeout = 60000, max_payload_len = MAX_MSG}
if not wb then ngx.log(ngx.ERR, "ws: ", err) return ngx.exit(400) end
S.next_id = S.next_id + 1
local id = S.next_id
local me = new_peer(id)
local peers = S.rooms[key] or {}
S.rooms[key] = peers
local ids = {}
for pid, p in pairs(peers) do ids[#ids + 1] = tostring(pid); push(p, "text", "J " .. id) end
peers[id] = me
push(me, "text", "H " .. id .. " " .. table.concat(ids, ","))

local writer = ngx.thread.spawn(function()   -- drains our queue
  while not me.closed do
    me.items:wait(1)
    local item = me.q[me.head]
    if item then
      me.q[me.head] = nil; me.head = me.head + 1; me.slots:post(1)
      local ok = item[1] == "text" and wb:send_text(item[2]) or wb:send_binary(item[2])
      if not ok then me.closed = true end
    end
  end
end)

local function route(dst, kind, data)   -- one peer: wait up to 5 s for room in its queue; everyone: at most 1 s per stuck peer, then it misses this one
  if dst then
    local p = peers[dst]
    if p then push(p, kind, data, 5) end
  else
    for pid, p in pairs(peers) do if pid ~= id then push(p, kind, data, 1) end end
  end
end

local function handle(typ, data)
  if typ == "text" then
    local to, rest = data:match("^(%S+) ?(.*)$")
    if to and rest ~= "" then
      route(tonumber(to), "text", "M " .. id .. " " .. rest)
    end
  elseif typ == "binary" and #data >= 4 then
    local to = from_be32(data)
    route(to ~= 0 and to or nil, "binary", be32(id) .. data:sub(5))
  elseif typ == "ping" then
    wb:send_pong(data)
  end
end

-- Browsers fragment big messages; recv_frame reports a non-final frame with err == "again"
-- and the rest as "continuation" frames. Reassemble up to MAX_MSG.
local frags, fragtyp, fraglen = {}, nil, 0
while not me.closed do
  local data, typ, err = wb:recv_frame()
  if not data then
    if not string.find(tostring(err), "timeout", 1, true) then break end
  elseif typ == "close" then
    break
  elseif err == "again" or typ == "continuation" then
    fraglen = fraglen + #data
    if fraglen > MAX_MSG then break end                 -- oversize: disconnect
    frags[#frags + 1] = data
    fragtyp = fragtyp or typ
    if err ~= "again" then
      handle(fragtyp, table.concat(frags))
      frags, fragtyp, fraglen = {}, nil, 0
    end
  else
    handle(typ, data)
  end
end

me.closed = true
peers[id] = nil
for _, p in pairs(peers) do push(p, "text", "L " .. id) end
if next(peers) == nil then S.rooms[key] = nil end   -- nothing lingers for an empty room
me.items:post(1)
ngx.thread.wait(writer)
wb:send_close()
