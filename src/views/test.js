import { appid } from '../config'
import axios from 'axios'
const wx = window.wx
function paramsToUrl(obj) {
    let sortKeys = Object.keys(obj)
    let str = '?'
    for (let key of sortKeys) {
        str += `${key}=${obj[key]}&`
    }
    str = str.substring(0, str.length - 1)
    return str
}
function pageReadyed() {
    alert('准备好了')
}
window.onload = () => {
    let timestamp = Date.parse(new Date()) / 1000
    let nonceStr = 'Wm3WZYTPz0wzccnW'
    let queryObj = {
        noncestr: nonceStr,
        timestamp,
        url: window.location.href
    }
    let jsApiList = [
        'onMenuShareTimeline',
        'onMenuShareAppMessage',
        'onMenuShareQQ',
        'onMenuShareWeibo',
        'onMenuShareQZone',
        'startRecord',
        'stopRecord',
        'onVoiceRecordEnd',
        'playVoice',
        'pauseVoice',
        'stopVoice',
        'onVoicePlayEnd',
        'uploadVoice',
        'downloadVoice',
        'chooseImage',
        'previewImage',
        'uploadImage',
        'downloadImage',
        'translateVoice',
        'getNetworkType',
        'openLocation',
        'getLocation',
        'hideOptionMenu',
        'showOptionMenu',
        'hideMenuItems',
        'showMenuItems',
        'hideAllNonBaseMenuItem',
        'showAllNonBaseMenuItem',
        'closeWindow',
        'scanQRCode',
        'chooseWXPay',
        'openProductSpecificView',
        'addCard',
        'chooseCard',
        'openCard'
    ]
    axios.get(`/sign${paramsToUrl(queryObj)}`).then(res => {
        let data = res.data
        alert('sign:' + data)
        wx.config({
            debug: true, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
            appId: appid, // 必填，公众号的唯一标识
            timestamp, // 必填，生成签名的时间戳
            nonceStr, // 必填，生成签名的随机串
            signature: data, // 必填，签名
            jsApiList // 必填，需要使用的JS接口列表
        })
        wx.ready(pageReadyed)
    })
}
