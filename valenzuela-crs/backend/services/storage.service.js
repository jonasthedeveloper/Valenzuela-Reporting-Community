const { pipeline } = require('stream/promises');
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const env = require('../config/env');

const s3 = env.storage.s3;

// Fail fast at startup (or cold start) if cloud storage is enabled without config,
// instead of surfacing confusing per-request errors later.
if (env.storage.driver === 's3') {
  const missing = ['endpoint', 'bucket', 'accessKeyId', 'secretAccessKey'].filter((k) => !s3[k]);
  if (missing.length) {
    throw new Error(`STORAGE_DRIVER=s3 requires these environment variables: ${missing.map((k) => `S3_${k.replace(/([A-Z])/g, '_$1').toUpperCase()}`).join(', ')}`);
  }
}

let client;
const getClient = () => {
  if (!client) {
    client = new S3Client({
      endpoint: s3.endpoint,
      region: s3.region,
      credentials: { accessKeyId: s3.accessKeyId, secretAccessKey: s3.secretAccessKey },
      forcePathStyle: s3.forcePathStyle,
    });
  }
  return client;
};

/** Store one file. Key = "<folder>/<filename>", mirroring the public /uploads URL. */
const putObject = (key, body, contentType) =>
  getClient().send(new PutObjectCommand({
    Bucket: s3.bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=604800', // 7d — same as express.static(maxAge: '7d')
  }));

/** Best-effort delete (multer rolls a half-finished request back with this). */
const deleteObject = (key) =>
  getClient().send(new DeleteObjectCommand({ Bucket: s3.bucket, Key: key }));

const getObject = async (key) => {
  const out = await getClient().send(new GetObjectCommand({ Bucket: s3.bucket, Key: key }));
  return {
    body: out.Body,
    contentType: out.ContentType || 'application/octet-stream',
    cacheControl: out.CacheControl || 'public, max-age=604800',
  };
};

const isNotFound = (err) =>
  err?.name === 'NoSuchKey'
  || err?.name === 'NotFound'
  || err?.$metadata?.httpStatusCode === 404;

/**
 * GET/HEAD /uploads/<folder>/<file> — stream the object out of the bucket with
 * the same headers express.static uses locally. Missing keys fall through to the
 * normal Express 404 JSON, exactly like a missing file on disk.
 */
const serveUploads = async (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  let key;
  try {
    key = decodeURIComponent(req.path).replace(/^\/+/, '');
  } catch {
    return next();
  }
  // Uploaded names are generated ("<timestamp>-<random>.<ext>"), so anything
  // with traversal segments or empty parts is simply not ours.
  if (!key || key.split('/').some((part) => !part || part === '.' || part === '..')) return next();
  try {
    const file = await getObject(key);
    res.setHeader('Content-Type', file.contentType);
    res.setHeader('Cache-Control', file.cacheControl);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.method === 'HEAD') return res.end();
    await pipeline(file.body, res);
  } catch (err) {
    if (isNotFound(err)) return next();
    return next(err);
  }
};

module.exports = { putObject, deleteObject, getObject, serveUploads };
