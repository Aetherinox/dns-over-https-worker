# DoH Cloudflare Worker

## About
This repo allows you to host your own DoH (DNS over HTTPS) server as a Cloudflare worker.

<br />

---

<br />

## Setup

If you attempt to use the default Cloudflare worker URL such as `doh.USERNAME.workers.dev` in your browser settings as a DoH server, it will not work.
You must create the Cloudflare worker on Cloudflare, and then assign a custom domain name to the worker so that it can be accessed by an acceptable URL, such as `https://dns.domain.com`

<br />

---

<br />

## Deploy Production

```shell ignore
wrangler deploy -e production
```

<br />

---

<br />

## Launch Dev Server

```shell ignore
wrangler dev -e dev
```