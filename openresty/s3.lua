-- The store on an S3 bucket instead of the disk. Every call is a Signature V4 signed subrequest
-- through the internal /_s3/ location (store.conf points it at the endpoint and bucket), so nginx
-- does TLS, streaming and keep-alive and this file only signs, lists and parses. Keys are the
-- same names the disk uses: <app>/<room>.<slot>. There is no index object: the bucket listing is
-- the index (key, size, LastModified are its three columns). Reads leave no trace in a bucket, so
-- in this mode a room's age is its newest object, nothing else.
local sha256 = require "resty.sha256"
local bit = require "bit"
local M = {}
local cfg = {host = ngx.var.s3_host, bucket = ngx.var.s3_bucket, region = ngx.var.s3_region, key = ngx.var.s3_key, secret = ngx.var.s3_secret}
M.enabled = cfg.host ~= nil and cfg.host ~= ""
local METHOD = {GET = ngx.HTTP_GET, PUT = ngx.HTTP_PUT, HEAD = ngx.HTTP_HEAD, DELETE = ngx.HTTP_DELETE}

local function hex(s) return (s:gsub(".", function(c) return string.format("%02x", c:byte()) end)) end
local function sha(s) local h = sha256:new(); h:update(s); return h:final() end
local function hmac(k, m)   -- HMAC-SHA256 from the plain hash: resty has no HMAC for it
  if #k > 64 then k = sha(k) end
  k = k .. string.rep("\0", 64 - #k)
  local i, o = {}, {}
  for n = 1, 64 do local b = k:byte(n); i[n] = string.char(bit.bxor(b, 0x36)); o[n] = string.char(bit.bxor(b, 0x5c)) end
  return sha(table.concat(o) .. sha(table.concat(i) .. m))
end
local function enc(s) return (tostring(s):gsub("[^%w%-_%.~]", function(c) return string.format("%%%02X", c:byte()) end)) end
local function query(args)   -- canonical: sorted, each part URI-encoded
  local q = {}
  for k, v in pairs(args or {}) do q[#q + 1] = enc(k) .. "=" .. enc(v) end
  table.sort(q)
  return table.concat(q, "&")
end

-- Sign a request on this request's headers; the subrequest or exec that follows inherits them.
local function sign(method, key, qs, body)
  local amz = os.date("!%Y%m%dT%H%M%SZ"); local day = amz:sub(1, 8)
  local payload = hex(sha(body or ""))
  local canon = method .. "\n/" .. cfg.bucket .. "/" .. key .. "\n" .. qs .. "\nhost:" .. cfg.host .. "\nx-amz-content-sha256:" .. payload .. "\nx-amz-date:" .. amz .. "\n\nhost;x-amz-content-sha256;x-amz-date\n" .. payload
  local scope = day .. "/" .. cfg.region .. "/s3/aws4_request"
  local to_sign = "AWS4-HMAC-SHA256\n" .. amz .. "\n" .. scope .. "\n" .. hex(sha(canon))
  local sig = hex(hmac(hmac(hmac(hmac(hmac("AWS4" .. cfg.secret, day), cfg.region), "s3"), "aws4_request"), to_sign))
  ngx.req.set_header("x-amz-date", amz)
  ngx.req.set_header("x-amz-content-sha256", payload)
  ngx.req.set_header("Authorization", "AWS4-HMAC-SHA256 Credential=" .. cfg.key .. "/" .. scope .. ", SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=" .. sig)
end
--- A signed subrequest: {status, body}.
function M.request(method, key, args, body)
  local qs = query(args)
  sign(method, key, qs, body)
  return ngx.location.capture("/_s3/" .. key, {method = METHOD[method], args = qs, body = body})
end
--- Hand the client an object as the response, streamed by nginx.
function M.stream(key)
  sign("GET", key, "")
  return ngx.exec("/_s3/" .. key)
end

-- ISO 8601 (as the listing gives it) to epoch milliseconds, no time zone involved
local function ms(iso)
  local y, mo, d, h, mi, s, frac = iso:match("(%d+)%-(%d+)%-(%d+)T(%d+):(%d+):(%d+)%.?(%d*)")
  if not y then return 0 end
  y, mo, d = tonumber(y), tonumber(mo), tonumber(d)
  if mo <= 2 then y = y - 1 end
  local era = math.floor(y / 400); local yoe = y - era * 400; local mp = (mo + 9) % 12
  local doy = math.floor((153 * mp + 2) / 5) + d - 1
  local days = era * 146097 + yoe * 365 + math.floor(yoe / 4) - math.floor(yoe / 100) + doy - 719468
  return (days * 86400 + tonumber(h) * 3600 + tonumber(mi) * 60 + tonumber(s)) * 1000 + tonumber((frac .. "000"):sub(1, 3))
end
--- Every object under a prefix, every page: {key, size, at (ms)}; nil, status on failure.
function M.list(prefix)
  local out, token = {}, nil
  repeat
    local args = {["list-type"] = "2", ["max-keys"] = "1000", prefix = prefix}
    if token then args["continuation-token"] = token end
    local r = M.request("GET", "", args)
    if r.status ~= 200 then return nil, r.status end
    for c in r.body:gmatch("<Contents>(.-)</Contents>") do
      out[#out + 1] = {key = c:match("<Key>(.-)</Key>"), size = tonumber(c:match("<Size>(%d+)</Size>")) or 0, at = ms(c:match("<LastModified>(.-)</LastModified>") or "")}
    end
    token = r.body:find("<IsTruncated>true</IsTruncated>", 1, true) and (r.body:match("<NextContinuationToken>(.-)</NextContinuationToken>") or ""):gsub("&amp;", "&") or nil
    if token == "" then token = nil end
  until not token
  table.sort(out, function(a, b) if a.at ~= b.at then return a.at < b.at end return a.key < b.key end)
  return out
end
return M
