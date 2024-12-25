/*
    Cloudflare Worker > DoH (DNS over HTTPS)

    Using your Cloudflare worker URL will cause browsers to return errors about specifying
    a valid URL. Your Cloudflare worker should be linked to a custom domain and then your
    browser set up to use that custom domain instead of your Cloudflare worker URL.

    This is a mirror service worker which branches off of:
                https://github.com/m13253/dns-over-https/
                https://github.com/satishweb/docker-doh

    @usage      https://doh.username.workers.dev/dns-query?name=google.com.com&type=DS
                https://doh.username.workers.dev/dns-query?name=google.com.com&type=A
                https://doh.username.workers.dev/dns-query?name=google.com.com&type=AAAA
*/

/*
    Imports
*/

import types from './types.js'
import clr from './clr.js'
import { version, author, homepage } from "./package.json";
import { jsonResp, jsonErr } from './json.js'

/*
    Define > General
*/

const id_worker = 'doh-worker';
const ct_resp = 'application/dns-message'
const ct_json = 'application/dns-json'

/*
    Logger
*/

const Logger = function(name) {
	this.name = name;
};

Logger.dev = function(env, id, a) {
    if (env.ENVIRONMENT === "dev")
	    console.log(`${clr.green}[${id_worker}]${clr.reset} ${id} ${a}`);
    else
        console.log(`${clr.green}[${id_worker}]${clr.reset} ${id} ${a}`);
}

Logger.var = function(env, id, a ) {
    if (env.ENVIRONMENT === "dev")
        console.log(`${clr.green}[${id_worker}]${clr.reset} ${clr.lgrey}[var:${clr.yellow}${id}${clr.lgrey}]${clr.reset} ${a}${clr.reset}`)
    else
        console.log(`[${id_worker}] [var:${id}] ${a}`)
}

/*
    Default
        - https://developers.cloudflare.com/workers/runtime-apis/fetch-event/#syntax-module-worker
*/

export default {
    async fetch(req, env, ctx) {
        if (env.ENVIRONMENT === "dev")
            console.log(env)
        return handleRequest(req, env, ctx);
    },
};

/*
    Handle Request
*/

async function handleRequest(req, env, ctx) {

    /*
        env vars
    */

    const ENV_SERVICE_DOH = env.URL_SERVICE_DOH || 'https://security.cloudflare-dns.com/dns-query'
    const ENV_SERVICE_JSON = env.URL_SERVICE_JSON || 'https://security.cloudflare-dns.com/dns-query'

    /*
        Define > Subdomain

        Can be left empty which accepts any subdomain URL
        or you may specify a subdomain.

        Subdomain conststant must start with /
            e.g. "/dns-query"
    */

    const ENV_SUBDOMAIN = env.URL_SUBDOMAIN || '/dns-query'

    if (env.ENVIRONMENT === "dev") {
        Logger.var(env, 'ENV_SERVICE_DOH', `${ENV_SERVICE_DOH}`)
        Logger.var(env, 'ENV_SERVICE_JSON', `${ENV_SERVICE_JSON}`)
        Logger.var(env, 'ENV_SUBDOMAIN', `${ENV_SUBDOMAIN}`)
    }
    
    /*
        making res a Promise<Response> reduces billed wall-time
            https://blog.cloudflare.com/workers-optimization-reduces-your-bill
    */

    const msgErr = jsonErr(`404 Not Found – the URL you provides is not complete`, 404, true);
    let res = new Response(msgErr);
    const { method, headers, url } = req
    const {searchParams, pathname} = new URL(url)
    
    /*
        Define > URLs

        host                        127.0.0.1:8787
        hostFull                    http://127.0.0.1:8787/
        hostQuery                   http://127.0.0.1:8787/dns-query?name=yourdomain.com
    */

    const host = req.headers.get('host') || '';
    const hostFull = new URL(req.url);

    let hostQuery = hostFull.origin.replace("?", "");
    if ( ENV_SUBDOMAIN !== "" ) {
        hostQuery = hostQuery + ENV_SUBDOMAIN  + "?"
    }
    hostQuery = hostQuery + "name=yourdomain.com"

    /*
        Debug
    */
    
    if (env.ENVIRONMENT === "dev") {
        Logger.var(env, 'host', `${host}`)
        Logger.var(env, 'hostFull', `${hostFull}`)
        Logger.var(env, 'hostQuery', `${hostQuery}`)
        Logger.var(env, 'searchParams', `${searchParams}`)
        Logger.var(env, 'pathname', `${pathname}`)
    }

    /*
        Check Subdomain Exists
    */

    if (!pathname.startsWith(ENV_SUBDOMAIN)) {
        return msgErr
    }

    /*
        Params
    */

    const paramName = ( searchParams.get('name') === "" ? 'google.com' : searchParams.get('name') )
    const paramRecord = ( searchParams.get('type') === "" ? 'A' : searchParams.get('type') )
    const paramCT = ( searchParams.get('ct') === "" ? ct_resp : searchParams.get('ct') )

    /*
        Params > Env > Dev
    */

    if (env.ENVIRONMENT === "dev") {
        Logger.var(env, 'paramName', `${paramName}`)
        Logger.var(env, 'paramRecord', `${paramRecord}`)
        Logger.var(env, 'paramCT', `${paramCT}`)
    }

    /*
        Method: Get
    */

    if (method == 'GET' && paramName) {

        console.log(
            `[${id_worker}] GET [DoH] ${ENV_SERVICE_DOH} | content-type: ${paramCT} | name: ${paramName} | record: ${paramRecord} | ct: ${paramCT}`
        );

        res = fetch(ENV_SERVICE_DOH + '?name=' + paramName + '&type=' + paramRecord, {
            method: 'GET',
            headers: new Headers({
				"Accept": paramCT,
                "server": "DNS-over-HTTPS/2.3.7 (+https://github.com/m13253/dns-over-https)"
			}),
        });

    /*
        Method: Post
    */

    } else if (method === 'POST' && headers.get('content-type') === ct_resp) {

        console.log(
            `[${id_worker}] POST [DoH] ${ENV_SERVICE_DOH} | content-type: ${ct_resp} | name: ${paramName} | record: ${paramRecord} | ct: ${paramCT}`
        );

        const rostream = req.body;
        res = fetch(ENV_SERVICE_DOH, {
            method: 'POST',
            headers: {
                'Accept': ct_resp,
                'Content-Type': ct_resp,
            },
            body: rostream,
        });

    /*
        Method: Get
    */

    } else if (method === 'GET' && headers.get('Accept') === ct_json) {

        console.log(
            `[${id_worker}] GET-ACCEPT [DoH] ${ENV_SERVICE_DOH} | content-type: ${ct_json} | name: ${paramName} | record: ${paramRecord} | ct: ${paramCT}`
        );

        const search = new URL(url).search
         res = fetch(ENV_SERVICE_JSON + search, {
            method: 'GET',
            headers: {
                'Accept': ct_json
            }
        });
    }

    return res;
}
