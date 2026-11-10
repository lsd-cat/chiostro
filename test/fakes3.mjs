// A small S3 in memory for the relay's bucket mode: path-style keys under one bucket, PUT/GET/HEAD/
// DELETE and ListObjectsV2 with prefix and pagination, the stored Content-Type echoed back, If-None-Match: *. Every request must carry a valid Signature
// V4 for the configured credentials, recomputed here, so a signer bug is a 403 in the test, not in
// production. One unsigned test hook, POST /_backdate?key=&days=, ages an object for expiry tests.
import {createServer} from 'node:http';
import {createHash, createHmac} from 'node:crypto';
export function fakeS3({bucket, key: accessKey, secret, region}) {
  const objects = new Map();   // key -> {body, at}
  const sha = b => createHash('sha256').update(b).digest('hex');
  const hmac = (k, m) => createHmac('sha256', k).update(m).digest();
  const esc = s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  const verify = (req, body) => {
    const auth = req.headers['authorization'] ?? '', amz = req.headers['x-amz-date'], payload = req.headers['x-amz-content-sha256'];
    const m = /Credential=([^/]+)\/(\d{8})\/([^/]+)\/s3\/aws4_request, SignedHeaders=([a-z0-9;-]+), Signature=([0-9a-f]{64})/.exec(auth);
    const signed = m ? m[4].split(';') : [];
    if (!m) return 'no SigV4 authorization header';
    if (m[1] !== accessKey) return 'unknown access key'; if (m[3] !== region) return 'wrong region';
    if (payload !== sha(body)) return 'payload hash mismatch';
    const u = new URL(req.url, 'http://x'), qs = [...u.searchParams.entries()].map(([k, v]) => esc(k) + '=' + esc(v)).sort().join('&');
    for (const h of Object.keys(req.headers)) if (h.startsWith('x-amz-') && !signed.includes(h)) return 'unsigned ' + h;
    const canon = [req.method, u.pathname, qs, ...signed.map(h => h + ':' + String(req.headers[h] ?? '').trim()), '', signed.join(';'), payload].join('\n');
    const scope = `${m[2]}/${region}/s3/aws4_request`, toSign = ['AWS4-HMAC-SHA256', amz, scope, sha(canon)].join('\n');
    const kSig = hmac(hmac(hmac(hmac('AWS4' + secret, m[2]), region), 's3'), 'aws4_request');
    const sig = createHmac('sha256', kSig).update(toSign).digest('hex');
    return sig === m[5] ? null : 'signature mismatch for ' + JSON.stringify(canon);
  };
  const server = createServer((req, res) => {
    const chunks = []; req.on('data', c => chunks.push(c)); req.on('end', () => {
      const body = Buffer.concat(chunks), u = new URL(req.url, 'http://x');
      if (u.pathname === '/_backdate') { const o = objects.get(u.searchParams.get('key')); if (o) o.at = new Date(o.at.getTime() - 864e5 * +u.searchParams.get('days')); res.writeHead(o ? 200 : 404); return res.end(); }
      const bad = verify(req, body); if (bad) { console.error('fake s3 403:', bad); res.writeHead(403); return res.end('<Error><Code>SignatureDoesNotMatch</Code></Error>'); }
      if (!u.pathname.startsWith('/' + bucket + '/')) { res.writeHead(404); return res.end(); }
      const key = u.pathname.slice(bucket.length + 2);
      if (key === '' && req.method === 'GET' && u.searchParams.get('list-type') === '2') {
        const prefix = u.searchParams.get('prefix') ?? '', max = +(u.searchParams.get('max-keys') ?? 1000), start = +(u.searchParams.get('continuation-token') ?? 0);
        const all = [...objects.entries()].filter(([k]) => k.startsWith(prefix)).sort(([a], [b]) => a < b ? -1 : 1), page = all.slice(start, start + max), truncated = start + max < all.length;
        const xml = `<?xml version="1.0" encoding="UTF-8"?><ListBucketResult><Name>${bucket}</Name><Prefix>${prefix}</Prefix><KeyCount>${page.length}</KeyCount><MaxKeys>${max}</MaxKeys><IsTruncated>${truncated}</IsTruncated>${truncated ? `<NextContinuationToken>${start + max}</NextContinuationToken>` : ''}${page.map(([k, o]) => `<Contents><Key>${k}</Key><LastModified>${o.at.toISOString()}</LastModified><ETag>"${sha(o.body).slice(0, 32)}"</ETag><Size>${o.body.length}</Size><StorageClass>STANDARD</StorageClass></Contents>`).join('')}</ListBucketResult>`;
        res.writeHead(200, {'content-type': 'application/xml'}); return res.end(xml);
      }
      const o = objects.get(key);
      if (req.method === 'PUT') { if (o && req.headers['if-none-match'] === '*') { res.writeHead(412); return res.end('<Error><Code>PreconditionFailed</Code></Error>'); } objects.set(key, {body, at: new Date(), type: req.headers['content-type'] ?? 'binary/octet-stream', meta: Object.fromEntries(Object.entries(req.headers).filter(([h]) => h.startsWith('x-amz-meta-')))}); res.writeHead(200, {etag: '"' + sha(body).slice(0, 32) + '"'}); return res.end(); }
      if (req.method === 'HEAD') { res.writeHead(o ? 200 : 404, o ? {'content-length': o.body.length, ...o.meta} : {}); return res.end(); }
      if (req.method === 'GET') { if (!o) { res.writeHead(404); return res.end('<Error><Code>NoSuchKey</Code></Error>'); } res.writeHead(200, {'content-length': o.body.length, 'content-type': o.type}); return res.end(o.body); }
      if (req.method === 'DELETE') { objects.delete(key); res.writeHead(204); return res.end(); }
      res.writeHead(405); res.end();
    });
  });
  return {server, objects, listen: port => new Promise(r => server.listen(port, '127.0.0.1', r)), close: () => new Promise(r => server.close(r))};
}
