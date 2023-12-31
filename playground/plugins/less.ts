import { dirname } from 'node:path'
import fs from 'node:fs'
import type { Plugin } from 'vite'
import type { NextHandleFunction } from 'connect'
import postcss from 'postcss'
import atImport from 'postcss-import'
import less from 'less'

export const queryRE = /\?.*$/s
export const hashRE = /#.*$/s
export const cleanUrl = (url: string): string => url.replace(hashRE, '').replace(queryRE, '')

export function lessPlugin(): Plugin {
  return {
    name: 'da',
    configureServer(server) {
      // server.middlewares.use(lessMiddleware())
      lessMiddleware()
    },
  }
}

const lessLangRE = new RegExp(/\.less$/)
export const isLessRequest = (request: string): boolean => lessLangRE.test(request)

function lessMiddleware(): NextHandleFunction {
  return async function viteLessMiddleware(req, res, next) {
    if (req.method !== 'GET')
      return next()

    const url: string = cleanUrl(req.url!)

    if (isLessRequest(url)) {
      const filePath = url.startsWith('/') ? `.${url}` : url
      const rawCode = await fs.readFileSync(filePath, 'utf-8')

      // 预处理器处理 less
      const lessResult = await less.render(rawCode, {
        // 用于 @import 查找路径
        paths: [dirname(filePath)],
      })
      // 后处理器处理 css
      const postcssResult = await postcss([atImport()]).process(lessResult.css, {
        from: filePath, // 用于 @import 查找路径
        to: filePath, // 用于 @import 查找路径
      })

      res.setHeader('Content-Type', 'application/javascript')
      return res.end(`
        var style = document.createElement('style')
        style.setAttribute('type', 'text/css')
        style.innerHTML = \`${postcssResult.css} \`
        document.head.appendChild(style)
      `)
    }

    next()
  }
}
