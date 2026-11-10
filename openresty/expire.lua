-- Expiry for the bucket store, called by cron on the loopback: /_expire?<app>=<days>&...&keep=<n>.
-- Lists each app, groups objects by room, deletes every room whose newest object is older than the
-- app's days, and in pad rooms keeps only the newest `keep` checkpoints (slots 0000 + 28 hex). The
-- disk store needs none of this: its cron is a find over mtimes and prune.sh.
local s3 = require "s3"
if not s3.enabled then ngx.status = 404; ngx.say("disk store: expiry is the find cron") return end
local args = ngx.req.get_uri_args()
local keep = tonumber(args.keep) or 40
local now = ngx.now() * 1000
local function delete(key) local r = s3.request("DELETE", key); return r.status == 204 or r.status == 200 end
for app, days in pairs(args) do
  if app:match("^[a-z0-9]+$") and tonumber(days) then
    local objects, err = s3.list(app .. "/")
    if not objects then ngx.say(app, ": list failed ", err) else
      local rooms = {}
      for _, o in ipairs(objects) do
        local room = o.key:match("^" .. app .. "/(%x+)%.")
        if room then local r = rooms[room] or {newest = 0, keys = {}, checkpoints = {}}; rooms[room] = r; r.newest = math.max(r.newest, o.at); r.keys[#r.keys + 1] = o.key; if o.key:match("%.0000%x+$") then r.checkpoints[#r.checkpoints + 1] = o.key end end
      end
      local gone, pruned = 0, 0
      for _, r in pairs(rooms) do
        if now - r.newest > tonumber(days) * 86400000 then
          for _, k in ipairs(r.keys) do if delete(k) then gone = gone + 1 end end
        elseif app == "pad" and #r.checkpoints > keep then   -- sorted oldest first by the listing
          for i = 1, #r.checkpoints - keep do if delete(r.checkpoints[i]) then pruned = pruned + 1 end end
        end
      end
      ngx.say(app, ": ", gone, " objects of expired rooms deleted, ", pruned, " old checkpoints pruned")
    end
  end
end
