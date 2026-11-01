// Starts the CORS proxies the menu page fetches through, one for every restaurant in `webs`
// (shop/js/script.js): the port and the path prefix come from its url, the real site from
// `targets` below. It runs local-cors-proxy (npm install -g local-cors-proxy, the `lcp` command).
// The VS Code task "Proxy servery pre menu" starts it when the folder opens (.vscode/tasks.json),
// so it is running before Live Server; by hand: node tools/proxy-servers.mjs. Ctrl+C stops all.

import { readFileSync } from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// The real site behind each restaurant's proxy (lcp drops the prefix and adds the rest of the path)
const targets = {
    Eat: "https://eatandmeet.sk",
    Fei: "https://www.jedalen.stuba.sk",
    Fiit: "http://www.freefood.sk",
};

const scriptJs = readFileSync(fileURLToPath(new URL("../shop/js/script.js", import.meta.url)), "utf8");
const webs = [...scriptJs.matchAll(/id:\s*"([^"]+)"[^}]*?url:\s*"([^"]+)"/g)]
    .map(([, id, url]) => ({ id, url: new URL(url) }))
    .filter(web => ["localhost", "127.0.0.1"].includes(web.url.hostname));

if (!webs.length){
    console.error("V shop/js/script.js som nenašiel žiadne webs s adresou na localhost.");
    process.exit(1);
}

console.log("Spúšťam proxy servery…");
const children = [];
const active = new Set();

for (const web of webs){
    const target = targets[web.id];
    const port = web.url.port;
    const partial = web.url.pathname.split("/")[1];
    if (!target){
        console.error(`[${web.id}] chýba skutočná adresa v targets (tools/proxy-servers.mjs), preskakujem`);
        continue;
    }

    // shell: on Windows `lcp` is lcp.cmd
    const child = spawn("lcp", ["--proxyUrl", target, "--port", port, "--proxyPartial", partial], { shell: true });
    children.push(child);
    console.log(`[${web.id}] http://localhost:${port}/${partial}/… → ${target}/…`);

    const print = (stream, chunk) => {
        for (const line of chunk.toString().split(/\r?\n/).filter(Boolean)) stream.write(`[${web.id}] ${line}\n`);
        if (/Proxy Active/.test(chunk.toString())){
            active.add(web.id);
            if (active.size === children.length) console.log("Všetky proxy bežia.");
        }
        if (/EADDRINUSE/.test(chunk.toString())) console.error(`[${web.id}] port ${port} je obsadený – proxy už asi beží`);
        if (/not recognized|not found/i.test(chunk.toString())) console.error(`[${web.id}] chýba lcp: npm install -g local-cors-proxy`);
    };
    child.stdout.on("data", chunk => print(process.stdout, chunk));
    child.stderr.on("data", chunk => print(process.stderr, chunk));
    child.on("exit", code => console.log(`[${web.id}] proxy skončila (kód ${code})`));
}

// Stop the whole tree of every proxy (on Windows the shell would otherwise leave lcp running)
function stopAll(){
    for (const child of children){
        if (child.exitCode !== null) continue;
        if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
        else child.kill();
    }
    process.exit(0);
}
process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);
