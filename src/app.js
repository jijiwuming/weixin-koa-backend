import { token, appid, appsecret, domainName, encodingAESKey } from './config'
const fs = require('fs')
const crypto = require('crypto')
const https = require('https')
const { Console } = require('console')
const myConsole = new Console(process.stdout, process.stderr)

const staticServe = require('koa-static')
const koa = require('koa')
const cors = require('koa2-cors')
const Router = require('koa-router')
const router = new Router()
// const bodyParser = require('koa-bodyparser')
const wechat = require('co-wechat')
const OAuth = require('wechat-oauth')
const WechatAPI = require('co-wechat-api')
const app = new koa()
const tokenfile = 'access_token.txt'
// 设置客户端
const client = new OAuth(appid, appsecret, null, null, false) // 最后一个参数即isMiniProgram
// 一个获取全局token的方法
function getAccessToken() {
    if (fs.existsSync(tokenfile)) {
        var txt = fs.readFileSync(tokenfile, 'utf8')
        return JSON.parse(txt)
    } else {
        return undefined
    }
}
// 保存到本地
function saveAccessToken(acceessToken) {
    fs.writeFileSync(tokenfile, JSON.stringify(acceessToken))
}
// 配置全局的token
const api = new WechatAPI(appid, appsecret, getAccessToken, saveAccessToken)
let jsapi_ticket
let cardapi_ticket // 微信卡券票据
// 客服配置
const config = {
    token,
    appid,
    encodingAESKey
}
// 认证地址 天知道state是个啥
// 参考‘微信网页授权’
// https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1421140842
const oauthUrl = client.getAuthorizeURL(
    `http://${domainName}/oauth`,
    'state',
    'snsapi_userinfo'
)
/**
 * 获取卡券签名
 *
 * @param {String} accesstoken
 * @returns
 */
function getCardTicket(accesstoken) {
    return new Promise((resolve, reject) => {
        https
            .get(
                `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${accesstoken}&type=wx_card`,
                res => {
                    let { statusCode, headers } = res
                    let error
                    if (statusCode !== 200) {
                        error = new Error(`请求出错:${statusCode}`)
                    } else if (
                        !headers['content-type'] ||
                        !headers['content-type'].match(/^application\/json/i)
                    ) {
                        error = new Error('响应格式有误')
                    }
                    if (error) {
                        reject(error)
                    }
                    let resdata = ''
                    res.on('data', data => {
                        resdata += data
                    })
                    res.on('end', () => {
                        resdata = JSON.parse(resdata)
                        resolve(resdata)
                    })
                }
            )
            .on('error', err => {
                reject(err)
            })
    })
}
/**
 * 处理文本内容
 *
 * @param {string} text 内容
 * @returns
 */
function dealWithText(text) {
    if (text && text === 'test') {
        return {
            title: '别测了，来段音乐吧',
            description: '长生诀',
            musicUrl:
                'http://m10.music.126.net/20180604172600/eed6d7981cc271bdcb0bd3bae5a46b42/ymusic/e3b2/a6f8/0f6c/fbe9d39f3a861fc5518a838b10903b4f.mp3',
            hqMusicUrl:
                'http://m10.music.126.net/20180604172600/eed6d7981cc271bdcb0bd3bae5a46b42/ymusic/e3b2/a6f8/0f6c/fbe9d39f3a861fc5518a838b10903b4f.mp3'
        }
    } else if (text && text === 'oauth') {
        myConsole.log(oauthUrl)
        return [
            {
                title: '随缘了',
                description: '这是佛系对话',
                picurl:
                    'https://timgsa.baidu.com/timg?image&quality=80&size=b9999_10000&sec=1528112830750&di=478506d2d1cfcb42c09d15ed33b2089c&imgtype=0&src=http%3A%2F%2Fimg.zcool.cn%2Fcommunity%2F0381de85949053ca8012193a3339cc5.jpg',
                url: oauthUrl
            }
        ]
    } else if (text && text === 'test plugin') {
        return [
            {
                title: '呦，测插件呢',
                description: '测插件好啊，测多了插件，插件自然会通的',
                picurl:
                    'http://imgsrc.baidu.com/imgad/pic/item/a50f4bfbfbedab646acef914fd36afc378311ea1.jpg',
                url: `http://${domainName}/test.html`
            }
        ]
    } else if (text && text === '【收到不支持的消息类型，暂无法显示】') {
        return {
            content: '这我也认不了啊',
            type: 'text'
        }
    } else {
        return 'hhh'
    }
}
/**
 * 处理图片内容
 *
 * @param {Object} message 消息对象
 * @returns
 */
function dealWithImg(message) {
    return {
        type: 'image',
        content: {
            mediaId: message.MediaId
        }
    }
}
/**
 * 返回排序后的url字符串
 *
 * @param {*} obj
 * @returns
 */
function objSortUrl(obj) {
    let sortKeys = Object.keys(obj).sort()
    let str = ''
    for (let key of sortKeys) {
        str += `${key}=${obj[key]}&`
    }
    str = str.substring(0, str.length - 1)
    return str
}
// log request URL:
app.use(async (ctx, next) => {
    myConsole.log(`Process ${ctx.request.method} ${ctx.request.url}...`)
    await next()
})

// 认证回调
router.get('/oauth', async ctx => {
    if (ctx && ctx.query) {
        let code = ctx.query.code
        client.getAccessToken(code, function(err, result) {
            if (err) {
                ctx.response.body = JSON.stringify(err)
            }
            if (result.data) {
                // let accessToken = result.data.access_token
                let openid = result.data.openid
                client.getUser(openid, function(err, result) {
                    myConsole.dir(result)
                    ctx.response.body = JSON.stringify(result)
                })
            }
        })
    }
})
// 获取sign
router.get('/sign', async ctx => {
    let queryObj = ctx.request.query
    let error
    let res
    if (queryObj) {
        let validTime = queryObj.timestamp
        if (
            !jsapi_ticket ||
            !jsapi_ticket.ticket ||
            jsapi_ticket.expireTime < validTime
        ) {
            let res = await api.getTicket()
            if (res && res.expireTime > validTime) {
                jsapi_ticket = res
            } else {
                error = new Error('服务出现问题')
            }
        }
        myConsole.dir(queryObj)
        myConsole.log(jsapi_ticket)
        Object.assign(queryObj, {
            jsapi_ticket:
                jsapi_ticket && jsapi_ticket.ticket ? jsapi_ticket.ticket : ''
        })
        let sortURL = objSortUrl(queryObj)
        myConsole.log(sortURL)
        res = crypto
            .createHash('sha1')
            .update(sortURL)
            .digest('hex')
    } else {
        error = new Error('参数有误')
    }
    if (error) {
        ctx.response.body = JSON.stringify(error)
    } else {
        ctx.response.body = JSON.stringify(res)
    }
})
// 卡券签名
router.get('/ticket/sign', async ctx => {
    let queryObj = ctx.request.query
    let error
    let res
    let validTime = queryObj.timestamp
    if (queryObj) {
        let { cardId, cardType, nonceStr, timestamp, locationId } = queryObj
        if (
            !cardapi_ticket ||
            !cardapi_ticket.ticket ||
            cardapi_ticket.expireTime < validTime
        ) {
            await api.getAccessToken().then(obj => {
                return getCardTicket(obj.accessToken).then(res => {
                    cardapi_ticket = {
                        ticket: res.ticket,
                        expireTime:
                            new Date().valueOf() + (res.expires_in - 10) * 1000
                    }
                    return cardapi_ticket
                })
            })
        }
        myConsole.log(cardapi_ticket.ticket)
        let signObj = {
            api_ticket: cardapi_ticket.ticket,
            appid,
            locationId,
            cardId,
            cardType,
            nonceStr,
            timestamp
        }
        let signStr = ''
        for (let value of Object.values(signObj).sort()) {
            if (value) {
                signStr += value
            }
        }
        myConsole.log(signStr)
        res = crypto
            .createHash('sha1')
            .update(signStr)
            .digest('hex')
    } else {
        error = new Error('参数有误')
    }
    if (error) {
        ctx.response.body = JSON.stringify(error)
    } else {
        ctx.response.body = JSON.stringify(res)
    }
})
// 微信公众号自动回复
router.all(
    '/',
    wechat(config).middleware(async message => {
        myConsole.dir(message)
        if (message) {
            let type = message.MsgType
            let res = {}
            switch (type) {
            case 'image':
                /**
                     * {
                     * ToUserName: 'gh_d8abdb55ca69',
                     * FromUserName: 'oftd00n7XCv0sqdELPfwG0oKte0U',
                     * CreateTime: '1528092938',
                     * MsgType: 'image',
                     * PicUrl: 'http://mmbiz.qpic.cn/mmbiz_jpg/niamP2aIgRibCnUXDFJdegGBwtobyafQjvt19z96g67r7g9Jgp50G4LswqNia5c8fFUyBs7f0K2WkU8d6DiblMsT9g/0',
                     * MsgId: '6563109194384543859',
                     * MediaId: '5OsElibb8yvblgFc9Uvz7zpTuu-5obSfiWWDovjuUcdRcswJc-rpUAVZXXmZNCqk'
                     * }
                     */
                res = dealWithImg(message)
                break
            case 'text':
                /**
                     * {
                     * ToUserName: 'gh_d8abdb55ca69',
                     * FromUserName: 'oftd00n7XCv0sqdELPfwG0oKte0U',
                     * CreateTime: '1528092773',
                     * MsgType: 'text',
                     * Content: '紧急',
                     * MsgId: '6563108485714939998'
                     * }
                     */
                res = dealWithText(message.Content)
                break
            case 'location':
                /**
                     * {
                     * ToUserName: 'gh_d8abdb55ca69',
                     * FromUserName: 'oftd00n7XCv0sqdELPfwG0oKte0U',
                     * CreateTime: '1528092618',
                     * MsgType: 'location',
                     * Location_X: '30.199603',
                     * Location_Y: '120.199583',
                     * Scale: '15',
                     * Label: '杭州市浙江大学医学院附属第二医院(滨江院区)',
                     * MsgId: '6563107819995009088'
                     * }
                     */
                break
            case 'link':
                /**
                     * {
                     * ToUserName: 'gh_d8abdb55ca69',
                     * FromUserName: 'oftd00n7XCv0sqdELPfwG0oKte0U',
                     * CreateTime: '1528093108',
                     * MsgType: 'link',
                     * Title: 'Python库大全（涵盖了Python应用的方方面面），建议收藏留用！',
                     * Description: '网络爬虫要做的，简单来说，就是实现浏览器的功能。通过指定url，直接返回给用户所需要的数据，而不需要一步步人工去操纵浏览器获取。',
                     * Url: 'http://mp.weixin.qq.com/s?__biz=MjM5NTEwMTAwNg==&mid=2650214801&idx=1&sn=8129dcf273166a752626d3a6b109fd84&chksm=befe11b0898998a69ada8222ec00c70ecc8f1f75114773b86671f5805d5c4b323bec4c093ba2&mpshare=1&scene=24&srcid=0530upgdrFsQpPvZaKmx1u2z#rd',
                     * MsgId: '6563109924528984237'
                     * }
                     */
                break
            case 'voice':
                /**
                     * {
                     * ToUserName: 'gh_d8abdb55ca69',
                     * FromUserName: 'oftd00n7XCv0sqdELPfwG0oKte0U',
                     * CreateTime: '1528093222',
                     * MsgType: 'voice',
                     * MediaId: 'BX0WFr1jGT-E2xPQshDMNaZEm9Dh6q_mkDmEw2z1Orvqq_Z5LU3EHDvJZ5v9Jou2',
                     * Format: 'amr',
                     * MsgId: '6563110414155255998',
                     * Recognition: ''
                     * }
                     */
                break
            default:
                break
            }
            return res
        }
    })
)
app.use(cors())

// 静态页面
app.use(staticServe('src'))

app.use(router.routes()).use(router.allowedMethods())

app.listen(80)
