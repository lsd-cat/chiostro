-- The TeX bundle for PDF export served from the bucket: /texmf/<path> streams the object
-- <prefix><path>, signed like a blob. Files are immutable, so the client caches them for good.
local s3 = require "s3"
local prefix = ngx.var.texmf_prefix
if not s3.enabled or not prefix or prefix == "" then return ngx.exit(404) end
local path = ngx.var.uri:sub(#"/texmf/" + 1)
if path == "" or not path:match("^[%w%./_%-]+$") or path:find("..", 1, true) then return ngx.exit(404) end
return s3.stream(prefix .. path, "/_s3texmf/")   -- cached on the host's disk: the files never change
