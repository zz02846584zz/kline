/* eslint-disable */
class WS {
  constructor(url, market, type) {
    this.ws = undefined
    this.url = url
    this.market = market
    this.type = type

    this.timer = null
  }

  start () {
    const vm = this
    return new Promise(function (resolve, reject) {
      vm.ws = new WebSocket(vm.url)
      vm.ws.onopen = evt => { vm.onOpen(evt) }
      vm.ws.onclose = evt => { vm.onClose(evt) }
      vm.ws.onmessage = evt => { vm.onMessage(evt) }
      vm.ws.onerror = (evt, err) => { vm.onError(evt); reject(err) }
      vm.ws.resolve = () => { resolve(vm.ws) }
    })
  }

  onOpen (evt) {
    console.log('Connect!')

    this.doSend(
      JSON.stringify({
        action: 'subscribe',
        market_id: this.market,
        type: this.type
      })
    )

    this.heart()
  }

  onError (evt) {
    console.log('連結錯誤!')
  }

  heart () {
    this.timer = setInterval(() => {
      this.doSend(
        JSON.stringify({
          action: 'heart'
        })
      )
    }, 1000)
  }

  onMessage (evt) {
    const data = JSON.parse(evt.data)
    // const date = new Date()
    // console.log('ws---'+date.getMinutes()+':'+date.getSeconds())

    // if (data.length > 0 && !chartData.length)  {
    //   firstLoad(data)
    // } else if (data.length > 0) {
    //   const lastWs = data[data.length - 1]
    //   const lastWsTime = lastWs.time
    //   const lastChart = chartData[chartData.length - 1]
    //   const lastChartTime = lastChart[1]
      
    //   if(lastWsTime === lastChartTime && this.type !== '1') {
    //     realTime(data)
    //   } else if (lastWsTime !== lastChartTime) {
    //     update(data)
    //   }
    // }

    sendData(data, this.type)

    this.ws.resolve()
  }

  onClose (evt) {
    console.log('中斷連線', evt)
    clearInterval(this.timer)

    this.start()
  }

  doSend (message) {
    this.ws.send(message)
  }

  close () {
    this.ws.close()
  }

  open () {
    this.ws.open()
  }
}
