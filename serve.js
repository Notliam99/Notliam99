import path from "path"
import chalk from "chalk"
import fs from "fs"
import http from "http"
import serveHandler from "serve-handler"
import { WebSocketServer } from "ws"
import { readFileSync } from "fs"

/**
 * All constants relating to helpers or handlers
 */
export const ORIGIN_NAME = "origin"
export const UPSTREAM_NAME = "upstream"
export const QUARTZ_SOURCE_BRANCH = "v4"
export const cwd = process.cwd()
export const cacheDir = path.join(cwd, ".quartz-cache")
export const cacheFile = "./quartz/.quartz-cache/transpiled-build.mjs"
export const fp = "./quartz/build.ts"
export const { version } = JSON.parse(readFileSync("./package.json").toString())
export const contentCacheFolder = path.join(cacheDir, "content-cache")

const argv = {
  baseDir: "",
  wsPort: "3001",
  port: "8080",
  output: "public",
}
const connections = []
// const clientRefresh = () => connections.forEach((conn) => conn.send("rebuild"))

if (argv.baseDir !== "" && !argv.baseDir.startsWith("/")) {
  argv.baseDir = "/" + argv.baseDir
}


const server = http.createServer(async (req, res) => {
  if (argv.baseDir && !req.url?.startsWith(argv.baseDir)) {
    console.log(
      chalk.red(
        `[404] ${req.url} (warning: link outside of site, this is likely a Quartz bug)`,
      ),
    )
    res.writeHead(404)
    res.end()
    return
  }

  // strip baseDir prefix
  req.url = req.url?.slice(argv.baseDir.length)

  const serve = async () => {
    /*     const release = await buildMutex.acquire() */
    await serveHandler(req, res, {
      public: argv.output,
      directoryListing: false,
      headers: [
        {
          source: "**/*.html",
          headers: [{ key: "Content-Disposition", value: "inline" }],
        },
      ],
    })
    const status = res.statusCode
    const statusString =
      status >= 200 && status < 300 ? chalk.green(`[${status}]`) : chalk.red(`[${status}]`)
    console.log(statusString + chalk.grey(` ${argv.baseDir}${req.url}`))
    /*     release() */
  }

  const redirect = (newFp) => {
    newFp = argv.baseDir + newFp
    res.writeHead(302, {
      Location: newFp,
    })
    console.log(chalk.yellow("[302]") + chalk.grey(` ${argv.baseDir}${req.url} -> ${newFp}`))
    res.end()
  }

  let fp = req.url?.split("?")[0] ?? "/"

  // handle redirects
  if (fp.endsWith("/")) {
    // /trailing/
    // does /trailing/index.html exist? if so, serve it
    const indexFp = path.posix.join(fp, "index.html")
    if (fs.existsSync(path.posix.join(argv.output, indexFp))) {
      req.url = fp
      return serve()
    }

    // does /trailing.html exist? if so, redirect to /trailing
    let base = fp.slice(0, -1)
    if (path.extname(base) === "") {
      base += ".html"
    }
    if (fs.existsSync(path.posix.join(argv.output, base))) {
      return redirect(fp.slice(0, -1))
    }
  } else {
    // /regular
    // does /regular.html exist? if so, serve it
    let base = fp
    if (path.extname(base) === "") {
      base += ".html"
    }
    if (fs.existsSync(path.posix.join(argv.output, base))) {
      req.url = fp
      return serve()
    }

    // does /regular/index.html exist? if so, redirect to /regular/
    let indexFp = path.posix.join(fp, "index.html")
    if (fs.existsSync(path.posix.join(argv.output, indexFp))) {
      return redirect(fp + "/")
    }
  }

  return serve()
})
server.listen(argv.port)
const wss = new WebSocketServer({ port: argv.wsPort })
wss.on("connection", (ws) => connections.push(ws))
console.log(
  chalk.cyan(
    `Started a Quartz server listening at http://localhost:${argv.port}${argv.baseDir}`,
  ),
)
console.log("hint: exit with ctrl+c")
