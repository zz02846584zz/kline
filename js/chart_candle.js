/* eslint-disable */
class Chart {
  constructor(target, option, wsOption) {
    this.canvas = document.getElementById(target)

    // dash為虛線，doubleDash為全虛線，留空為柱狀
    this.tapLineStyle = 'dash'

    this.option = {
      background: 0x0d1318,
      splitLine: {
        x: {
          lineStyle: 0x1b1d29,
          offsetRight: 2,
          color: 0x6b6f84
        },
        y: {
          lineStyle: 0x1b1d29,
          offsetRight: 2,
          color: 0x6b6f84
        }
      },
      topMA: {
        color: [0xf6dc92, 0x2fce9b, 0xcb91fe],
        bg: ['#050709', '#0d1318']
      },
      bottomMA: {
        color: [0x8e4dc8, 0xf6dc92, 0x12b886],
        bg: ['#050709', '#0d1318']
      },
      candle: {
        upColor: 0x12b886,
        downColor: 0xfa5252
      },
      maxMinColor: 0xffffff,
      nowPrice: {
        all: {
          color: 0x6b6f84,
          stroke: 0x121318,
          background: 0x121318
        },
        right: {
          color: 0x2083f4
        }
      },
      toolBox: {
        color: 0x9ca5c3,
        background: 0x0f1114,
        border: 0x5d657d
      }
    }
    this.hammer = {
      touch1: undefined,
      touch2: undefined,
      move1: undefined,
      move2: undefined
    }
    this.event = {
      originPoint: undefined,
      originOffset: undefined
    }
    this.fill = {
      upColor: undefined,
      downColor: undefined
    }
    this.moving = false

    // ws option
    this.wsOption = wsOption

    // space
    this.bottomSpace = 25
    this.splitLineRightSpace = 2

    this.appWidth = window.innerWidth
    this.appHeight = window.innerHeight
    this.mainContainerHeight = this.appHeight - this.bottomSpace

    this.topHeight = this.mainContainerHeight / 11 * 8
    this.bottomHeight = this.mainContainerHeight / 11 * 2

    this.xLength = window.innerWidth > 768 ? this.appWidth / 120 : 5

    this.dataSpace = window.innerWidth > 768 ? this.appWidth / 100 : 10
    this.dataWidth = this.dataSpace / 2 - 1.2
    this.dataPaddingY = 8
    this.dataHeight = this.mainContainerHeight / 11 * 8 - this.dataPaddingY * 2

    // trade
    this.tradeHeight = this.bottomHeight / 2

    // now price
    this.nowPriceSpace = 2
    this.nowPriceLabelPadding = [15, 3] // x,y
    this.nowPriceStrokeWidth = 1

    // toolbox
    this.toolBoxOffset = 10
    this.toolBoxPadding = [10, 6] // x,y
    this.toolBoxWidth = 100
    this.toolBoxBorderWidth = 2

    // chart
    this.chartRightSpace = Math.floor(this.appWidth / this.xLength / this.dataSpace) * this.dataSpace
    this.chartMaskRightSpace = this.dataSpace

    // scale
    this.scaleX = 1
    this.dataLength = Math.ceil(this.appWidth / this.dataSpace) // 預設顯示資料筆數
    this.scaleLength = this.dataLength
    this.currectLength = this.dataLength
    // pixi
    this.app = undefined
  }

  async startChart(chartData, tradeData) {
    const vm = this

    // toFixed
    vm.fixNum = Math.min(String(parseFloat(chartData[0][1] / 10000000)).split('.')[1].length, 5)

    var isMacLike = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);

    vm.app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      antialias: true,
      transparent: false,
      backgroundColor: vm.option.background,
      resolution: 2,
      view: vm.canvas
    })

    vm.app.stop() // 暫停渲染

    // stage container
    vm.xSplitLabelContainer = new PIXI.Container()
    vm.ySplitLabelContainer = new PIXI.Container()
    vm.topContainer = new PIXI.Container()
    vm.bottomContainer = new PIXI.Container()

    vm.app.loader
      .add('./images/area-background.png')
      .load(setBackground)

    function setBackground() {
      const backgroundImage = PIXI.Texture.from('./images/area-background.png')
      const background = new PIXI.Sprite(backgroundImage)
      const backgroundScale = vm.appWidth > vm.appHeight ? vm.topHeight / (vm.appHeight) : vm.appWidth / background.width
      background.scale.set(backgroundScale)
      background.position.y = vm.appHeight / 5
      background.position.x = vm.appWidth / 2 - background.width / 2

      vm.app.stage.addChild(background)
    }

    vm.windowResize()

    // TopMAContainer Gradient
    const topBackground = new PIXI.Graphics()
    topBackground.position.set(0, 0)
    topBackground.beginTextureFill({ texture: vm.gradient(vm.option.topMA.bg[0], vm.option.topMA.bg[1], vm.mainContainerHeight / 11) })
    topBackground.moveTo(0, 0)
      .lineTo(vm.appWidth, 0)
      .lineTo(vm.appWidth, vm.mainContainerHeight / 11)
      .lineTo(0, vm.mainContainerHeight / 11)

    vm.app.stage.addChild(topBackground)

    // bottomMAContainer Gradient
    const bottomBackground = new PIXI.Graphics()
    bottomBackground.position.set(0, vm.mainContainerHeight * 9 / 11)
    bottomBackground.beginTextureFill({ texture: vm.gradient(vm.option.topMA.bg[0], vm.option.topMA.bg[1], vm.bottomHeight / 2) })
    bottomBackground.moveTo(0, 0)
      .lineTo(vm.appWidth, 0)
      .lineTo(vm.appWidth, vm.bottomHeight / 2)
      .lineTo(0, vm.bottomHeight / 2)

    vm.app.stage.addChild(bottomBackground)

    // X - splitLine & label
    for (let i = 1; i < this.xLength + 1; i++) {
      const splitLineColor = vm.option.splitLine.x.lineStyle
      const textColor = vm.option.splitLine.x.color

      if (i <= this.xLength) {
        const xSplitLine = new PIXI.Graphics()
        xSplitLine.lineStyle(1, splitLineColor)
        xSplitLine.moveTo(vm.appWidth / this.xLength * i, 0)
        xSplitLine.lineTo(vm.appWidth / this.xLength * i, vm.mainContainerHeight)
        vm.app.stage.addChild(xSplitLine)
      }

      const xSplitLabel = new PIXI.Text('08-14 10:57')
      xSplitLabel.style = {
        fill: textColor,
        fontSize: 10
      }
      xSplitLabel.position.set(vm.appWidth / this.xLength * (i - 1) - xSplitLabel.width / 2, vm.mainContainerHeight + vm.bottomSpace / 2 - xSplitLabel.height / 2)

      vm.xSplitLabelContainer.addChild(xSplitLabel)
    }

    // Y - splitLine & label
    for (let i = 1; i < 7; i++) {
      const splitLineColor = vm.option.splitLine.y.lineStyle
      const textColor = vm.option.splitLine.y.color
      const ySplitLine = new PIXI.Graphics()
      ySplitLine.lineStyle(1, splitLineColor)
      ySplitLine.position.set(0, vm.mainContainerHeight / 5.5 * -0.5)
      ySplitLine.moveTo(0, vm.mainContainerHeight / 5.5 * i)
      ySplitLine.lineTo(vm.appWidth, vm.mainContainerHeight / 5.5 * i)
      vm.app.stage.addChild(ySplitLine)

      if (i < 6) {
        const ySplitLabel = new PIXI.Text('0000.00')
        ySplitLabel.style = {
          fill: textColor,
          fontSize: 10
        }
        if (i === 1) {
          ySplitLabel.position.set(vm.appWidth - ySplitLabel.width - vm.splitLineRightSpace, vm.mainContainerHeight / 5.5 * i - vm.mainContainerHeight / 11 + 2)
        } else {
          ySplitLabel.position.set(vm.appWidth - ySplitLabel.width - vm.splitLineRightSpace, vm.mainContainerHeight / 5.5 * i - vm.mainContainerHeight / 11 - ySplitLabel.height - 2)
        }
        vm.ySplitLabelContainer.addChild(ySplitLabel)
      }
    }

    vm.app.stage.addChild(vm.topContainer, vm.bottomContainer, vm.xSplitLabelContainer, vm.ySplitLabelContainer)

    // TopMAContainer
    vm.topMAContainer = new PIXI.Container()
    vm.topContainer.addChild(vm.topMAContainer)
    vm.topMAContainer.position.set(8, 8)

    // label & num
    const TopMAText = ['MA5', 'MA10', 'MA30']
    for (let i = 0; i < 3; i++) {
      const label = new PIXI.Text(`${TopMAText[i]}:`, {
        fill: vm.option.topMA.color[i],
        fontSize: 9
      })
      if (i > 0) {
        label.position.x = vm.topMAContainer.width + 10
      } else {
        label.position.x = vm.topMAContainer.width
      }
      vm.topMAContainer.addChild(label)

      const num = new PIXI.Text(parseFloat(chartData[0][1] / 10000000), {
        fill: vm.option.topMA.color[i],
        fontSize: 9
      })
      num.position.x = vm.topMAContainer.width
      vm.topMAContainer.addChild(num)
    }

    // candle
    vm.candleContainer = new PIXI.Container()
    vm.topContainer.addChild(vm.candleContainer)

    vm.candleContainer.position.y = vm.mainContainerHeight / 11 + vm.dataPaddingY
    const open = chartData.map(item => item[0])
    const close = chartData.map(item => item[1])
    const low = chartData.map(item => item[2])
    const high = chartData.map(item => item[3])

    vm.candleMax = Math.max(...high)
    vm.candleMin = Math.min(...low)

    vm.candlePixel = (vm.dataHeight) / (vm.candleMax - vm.candleMin)

    for (let i = 0; i < chartData.length; i++) {
      vm.drawLastCandle(open[i], close[i], low[i], high[i], i)
    }

    // Candle Max & Min
    vm.candleMaxContainer = new PIXI.Container()
    vm.candleMinContainer = new PIXI.Container()
    vm.topContainer.addChild(vm.candleMaxContainer, vm.candleMinContainer)

    // Max
    vm.candleMaxLabel = new PIXI.Text('', {
      fill: vm.option.maxMinColor,
      fontSize: 10
    })
    vm.candleMaxLine = new PIXI.Graphics()

    vm.candleMaxLine.lineStyle(1, vm.option.maxMinColor)
    vm.candleMaxLine.moveTo(0, 0)
    vm.candleMaxLine.lineTo(20, 0)

    vm.candleMaxLine.position.y = vm.candleMaxLabel.height / 2

    vm.candleMaxContainer.addChild(vm.candleMaxLabel, vm.candleMaxLine)
    vm.candleMaxContainer.position.y = vm.mainContainerHeight / 11 + 1

    // Min
    vm.candleMinLabel = new PIXI.Text('', {
      fill: vm.option.maxMinColor,
      fontSize: 10
    })
    vm.candleMinLine = new PIXI.Graphics()
    vm.candleMinLine.lineStyle(1, vm.option.maxMinColor)
    vm.candleMinLine.moveTo(0, 0)
    vm.candleMinLine.lineTo(20, 0)

    vm.candleMinLine.position.y = vm.candleMinLabel.height / 2
    vm.candleMinContainer.addChild(vm.candleMinLabel, vm.candleMinLine)
    vm.candleMinContainer.position.y = vm.mainContainerHeight / 11 * 9 - vm.candleMinContainer.height

    // Top MA line
    vm.topMALineContaier = new PIXI.Container()
    vm.topMALineContaier.position.y = vm.mainContainerHeight / 11 + vm.dataPaddingY
    vm.topContainer.addChild(vm.topMALineContaier)

    vm.MA5Container = new PIXI.Container()
    vm.MA10Container = new PIXI.Container()
    vm.MA30Container = new PIXI.Container()
    vm.MA5Container.position.x = -vm.dataSpace / 4
    vm.MA10Container.position.x = -vm.dataSpace / 4
    vm.MA30Container.position.x = -vm.dataSpace / 4

    vm.topMALineContaier.addChild(vm.MA5Container, vm.MA10Container, vm.MA30Container)

    vm.MA5Data = this.calculateMA(5, chartData)
    vm.MA10Data = this.calculateMA(10, chartData)
    vm.MA30Data = this.calculateMA(30, chartData)

    this.drawTopMA()

    // candle Data 遮罩
    vm.candleMask = new PIXI.Graphics()
    vm.candleMask.beginFill(0x000000)
    vm.candleMask.drawRect(0, vm.mainContainerHeight / 11, vm.appWidth - vm.chartMaskRightSpace, vm.mainContainerHeight / 11 * 8 - vm.dataPaddingY)
    vm.candleMask.endFill()
    vm.candleContainer.mask = vm.candleMask
    vm.topMALineContaier.mask = vm.candleMask
    vm.app.stage.addChild(vm.candleMask)

    // bottom MA container
    vm.bottomMAContainer = new PIXI.Container()
    vm.bottomContainer.addChild(vm.bottomMAContainer)
    vm.bottomMAContainer.position.set(8, vm.mainContainerHeight * 9 / 11 + 8)

    // label & num
    const bottomMAText = ['VOL', 'MA5', 'MA10']
    for (let i = 0; i < 3; i++) {
      const label = new PIXI.Text(`${bottomMAText[i]}:`, {
        fill: vm.option.bottomMA.color[i],
        fontSize: 9
      })
      if (i > 0) {
        label.position.x = vm.bottomMAContainer.width + 10
      } else {
        label.position.x = vm.bottomMAContainer.width
      }
      vm.bottomMAContainer.addChild(label)

      const num = new PIXI.Text('000.00000', {
        fill: vm.option.bottomMA.color[i],
        fontSize: 9
      })
      num.position.x = vm.bottomMAContainer.width
      vm.bottomMAContainer.addChild(num)
    }

    // tradeContainer
    vm.tradeContainer = new PIXI.Container()
    vm.bottomContainer.addChild(vm.tradeContainer)
    vm.tradeContainer.position.y = vm.mainContainerHeight

    vm.tradeMax = Math.max(...tradeData)
    vm.tradeMin = Math.min(...tradeData)
    vm.tradePixel = vm.tradeHeight / (vm.tradeMax - vm.tradeMin)

    for (let i = 0; i < tradeData.length; i++) {
      vm.drawTrade(open[i], close[i], i, tradeData)
    }

    // bottom MA line
    vm.bottomMALineContaier = new PIXI.Container()
    vm.bottomMALineContaier.position.y = vm.mainContainerHeight
    vm.bottomContainer.addChild(vm.bottomMALineContaier)

    vm.bottomMA5Container = new PIXI.Container()
    vm.bottomMA10Container = new PIXI.Container()

    vm.bottomMA5Container.position.y = -vm.mainContainerHeight / 11
    vm.bottomMA10Container.position.y = -vm.mainContainerHeight / 11

    vm.bottomMA5Container.position.x = -vm.dataSpace / 4
    vm.bottomMA10Container.position.x = -vm.dataSpace / 4

    vm.bottomMALineContaier.addChild(vm.bottomMA5Container, vm.bottomMA10Container)

    vm.bottomMA5Data = this.calculateBottomMA(5, tradeData)
    vm.bottomMA10Data = this.calculateBottomMA(10, tradeData)

    this.drawBotMA()

    // tradeContainer mask
    vm.tradeMask = new PIXI.Graphics()
    vm.tradeMask.beginFill(0xff0000)
    vm.tradeMask.drawRect(0, vm.mainContainerHeight / 11 * 10 - 10, vm.appWidth - vm.chartMaskRightSpace, vm.mainContainerHeight / 11 + 10)
    vm.tradeMask.endFill()
    vm.tradeContainer.mask = vm.tradeMask
    vm.bottomMALineContaier.mask = vm.tradeMask
    vm.app.stage.addChild(vm.tradeMask)


    // now price splitLine
    vm.priceAllContainer = new PIXI.Container()
    vm.priceRightContainer = new PIXI.Container()
    vm.app.stage.addChild(vm.priceAllContainer, vm.priceRightContainer)

    // right
    vm.priceRightLabel = new PIXI.Text('0000.00', {
      fill: vm.option.nowPrice.right.color,
      fontSize: 10
    })

    vm.priceRightRect = new PIXI.Graphics()
    vm.priceRightRect.beginFill(vm.option.background)
    vm.priceRightRect.drawRect(0, -2, vm.priceRightLabel.width + 25, vm.priceRightLabel.height + 4)

    vm.priceRightLine = new PIXI.Graphics()
    vm.priceRightLine.position.y = vm.priceRightLabel.height / 2
    vm.priceRightLine.lineStyle(1, vm.option.nowPrice.right.color)
    vm.priceRightLine.moveTo(0, 0)
    vm.priceRightLine.drawDashLine(vm.chartRightSpace - vm.priceRightLabel.width - vm.nowPriceSpace - vm.splitLineRightSpace * 2 + vm.dataWidth, 0, 3, 3)

    vm.priceRightContainer.addChild(vm.priceRightLine, vm.priceRightRect, vm.priceRightLabel)

    // all
    vm.priceAllLabel = new PIXI.Text('0000.000', {
      fill: vm.option.nowPrice.all.color,
      fontSize: 11
    })

    vm.priceAllLine = new PIXI.Graphics()
    vm.priceAllLine.lineStyle(1, vm.option.nowPrice.all.color)
    vm.priceAllLine.position.y = vm.priceAllLabel.height / 2
    vm.priceAllLine.moveTo(0, 0)
    vm.priceAllLine.drawDashLine(vm.appWidth, 0, 3, 3)

    vm.priceAllRect = new PIXI.Graphics()
    vm.priceAllRect.beginFill(vm.option.nowPrice.all.background)
    vm.priceAllRect.drawRoundedRect(
      0,
      0,
      vm.priceAllLabel.width + vm.nowPriceLabelPadding[0] * 2,
      vm.priceAllLabel.height + vm.nowPriceLabelPadding[1] * 2,
      15
    )

    vm.priceAllArrow = new PIXI.Graphics()
    vm.priceAllArrow.beginFill(vm.option.nowPrice.all.color)
    vm.priceAllArrow.moveTo(0, 0)
    vm.priceAllArrow.lineTo(4, 2)
    vm.priceAllArrow.lineTo(0, 4)

    vm.priceAllStroke = new PIXI.Graphics()
    vm.priceAllStroke.beginFill(vm.option.nowPrice.all.color)
    vm.priceAllStroke.drawRoundedRect(
      -vm.nowPriceStrokeWidth,
      -vm.nowPriceStrokeWidth,
      vm.priceAllLabel.width + vm.nowPriceLabelPadding[0] * 2 + vm.nowPriceStrokeWidth * 2,
      vm.priceAllLabel.height + vm.nowPriceLabelPadding[1] * 2 + vm.nowPriceStrokeWidth * 2,
      15
    )

    vm.priceAllLabel.position.set(vm.appWidth / vm.xLength * (vm.xLength - 1) - vm.priceAllLabel.width / 2 - vm.nowPriceLabelPadding[0] / 3, -vm.nowPriceLabelPadding[1] / 2 + vm.priceAllRect.height / 2 - vm.priceAllLabel.height / 2)
    vm.priceAllRect.position.set(vm.appWidth / vm.xLength * (vm.xLength - 1) - vm.priceAllRect.width / 2, -vm.nowPriceLabelPadding[1] / 2)
    vm.priceAllArrow.position.set(vm.appWidth / vm.xLength * (vm.xLength - 1) - vm.priceAllRect.width / 2 + vm.priceAllLabel.width + vm.nowPriceLabelPadding[0] + 3, vm.priceAllArrow.height / 2 + vm.priceAllRect.height / 2 - vm.priceAllLabel.height / 2)
    vm.priceAllStroke.position.set(vm.appWidth / vm.xLength * (vm.xLength - 1) - vm.priceAllRect.width / 2, -vm.nowPriceLabelPadding[1] / 2)

    vm.priceAllContainer.addChild(vm.priceAllLine, vm.priceAllStroke, vm.priceAllRect, vm.priceAllArrow, vm.priceAllLabel)

    // focus line
    vm.focusLine = new PIXI.Graphics()

    if (vm.tapLineStyle === 'doubleDash') {
      vm.focusLine.lineStyle(1, 0x6b6f84)
      vm.focusLine.moveTo(0, 0)
      vm.focusLine.drawDashLine(0, vm.mainContainerHeight, 3, 3)
    } else {
      vm.focusLine.beginTextureFill(vm.gradient('rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.3)', vm.mainContainerHeight))
      vm.focusLine.drawRect(0, 0, vm.dataWidth * 2, vm.mainContainerHeight)
    }
    vm.app.stage.addChild(vm.focusLine)

    // focus splitline label
    vm.focusSplitContainer = new PIXI.Container()
    vm.app.stage.addChild(vm.focusSplitContainer)
    const value = chartData[0][0]
    // const text = value < 10 ? value < 1 ? value.toFixed(4) : value.toFixed(3) : value.toFixed(2)
    const text = (value / 10000000).toFixed(3)


    if (vm.tapLineStyle === 'doubleDash' || vm.tapLineStyle === 'dash') {
      vm.focusSplitLabel = new PIXI.Text(text, {
        fill: 0xffffff,
        fontSize: 10
      })
      vm.focusSplitLabel.position.set(5, -vm.focusSplitLabel.height / 2)

      vm.focusSplitBackground = new PIXI.Graphics()
      vm.focusSplitBackground.lineStyle(0.8, 0xffffff, 0.7)
      vm.focusSplitBackground.beginFill(0x111217)
      vm.focusSplitBackground.moveTo(0, -vm.focusSplitLabel.height * 5 / 6)
      vm.focusSplitBackground.lineTo(vm.focusSplitLabel.width + 10, -vm.focusSplitLabel.height * 5 / 6)
      vm.focusSplitBackground.lineTo(vm.focusSplitLabel.width + 15, 0)
      vm.focusSplitBackground.lineTo(vm.focusSplitLabel.width + 10, vm.focusSplitLabel.height * 5 / 6)
      vm.focusSplitBackground.lineTo(0, vm.focusSplitLabel.height * 5 / 6)
      vm.focusSplitBackground.lineTo(0, -vm.focusSplitLabel.height * 5 / 6)

      vm.tapLine = new PIXI.Graphics()
      vm.tapLine.lineStyle(0.8, 0xffffff, 0.7)
      vm.tapLine.moveTo(0, 0)
      vm.tapLine.lineTo(vm.appWidth, 0, 3, 3)

      vm.focusSplitContainer.addChild(vm.tapLine, vm.focusSplitBackground, vm.focusSplitLabel)
    }

    // tooltip box
    vm.toolBox = new PIXI.Container()
    vm.app.stage.addChild(vm.toolBox)

    const toolBoxBackground = new PIXI.Graphics()
    const toolBoxLabel = new PIXI.Container()
    vm.toolBoxNum = new PIXI.Container()

    vm.toolBox.addChild(toolBoxBackground, toolBoxLabel, vm.toolBoxNum)

    const toolBoxLabelArray = ['时间', '开', '高', '低', '收', '涨跌额', '涨跌幅', '成交量']

    for (let i = 0; i < toolBoxLabelArray.length; i++) {
      const label = new PIXI.Text(toolBoxLabelArray[i], {
        fill: vm.option.toolBox.color,
        fontSize: vm.appWidth > 768 ? 10 : 9
      })
      label.position.set(0, label.height * i * 1.4)
      toolBoxLabel.addChild(label)
    }

    for (let i = 0; i < toolBoxLabelArray.length; i++) {
      const num = new PIXI.Text(i * 10, {
        fill: vm.option.toolBox.color,
        fontSize: vm.appWidth > 768 ? 10 : 9
      })
      num.position.set(vm.toolBoxWidth - num.width, num.height * i * 1.4)
      vm.toolBoxNum.addChild(num)
    }

    toolBoxBackground.beginFill(vm.option.toolBox.background)
    toolBoxBackground.lineStyle(vm.toolBoxBorderWidth, vm.option.toolBox.border)
    toolBoxBackground.drawRect(
      -vm.toolBoxPadding[0],
      -vm.toolBoxPadding[1],
      vm.toolBoxWidth + vm.toolBoxPadding[0] * 2,
      vm.toolBox.height + vm.toolBoxPadding[1] * 2
    )

    vm.toolBox.position.set(vm.toolBoxOffset * 1.5, vm.mainContainerHeight / 11 + vm.toolBoxPadding[1])

    // 預設
    vm.toolBox.alpha = 0
    vm.focusLine.alpha = 0
    vm.focusSplitContainer.alpha = 0
    const offsetMax = Math.floor((-vm.candleContainer.width + vm.appWidth) / vm.dataSpace) * vm.dataSpace - vm.chartRightSpace

    if (chartData.length * vm.dataSpace + vm.chartRightSpace > vm.appWidth) {
      vm.candleContainer.position.x = offsetMax
      vm.tradeContainer.position.x = offsetMax
      vm.topMALineContaier.position.x = offsetMax
      vm.bottomMALineContaier.position.x = offsetMax
    }

    await vm.getDataIndex(chartData, tradeData)
    vm.getSplitData()
    vm.resizeHeight()
    vm.getPricePosY(chartData)
    vm.getMaxMinCandle()
    vm.getRealTimeMAValue(tradeData)

    vm.app.start() // 開始渲染

    const loading = document.getElementById('loading')
    loading.style.opacity = 0
    setTimeout(() => {
      loading.style.display = 'none'
    }, 450);
  }

  async computerOnZoom(event, chartData, tradeData) {
    const vm = this
    const delta = Math.sign(event.deltaY) * 2 // 1 或 -1
    const maxScaleLength = Math.min(vm.dataLength * 2, chartData.length + (vm.chartRightSpace / vm.dataSpace))
    vm.scaleLength = Math.max(Math.floor(vm.dataLength / 2), Math.min(maxScaleLength, vm.scaleLength + delta)) // 縮放大小
    vm.scaleX = vm.dataLength / vm.scaleLength

    const maxDataLength = Math.ceil(vm.appWidth / (vm.dataSpace * vm.scaleX))
    const offsetMax = -((chartData.length - maxDataLength) * vm.dataSpace * vm.scaleX) - (Math.floor(vm.chartRightSpace / (vm.dataSpace * vm.scaleX)) * vm.dataSpace * vm.scaleX)
    const canvasPosX = Math.min(0, Math.max(offsetMax, -(vm.firstIndex * vm.dataSpace * vm.scaleX)))

    vm.candleContainer.scale.x = vm.scaleX
    vm.topMALineContaier.scale.x = vm.scaleX
    vm.tradeContainer.scale.x = vm.scaleX
    vm.bottomMALineContaier.scale.x = vm.scaleX

    vm.candleContainer.position.x = canvasPosX
    vm.tradeContainer.position.x = canvasPosX
    vm.topMALineContaier.position.x = canvasPosX
    vm.bottomMALineContaier.position.x = canvasPosX

    vm.candleMask.width = vm.appWidth - vm.chartMaskRightSpace * vm.scaleX
    vm.tradeMask.width = vm.appWidth - vm.chartMaskRightSpace * vm.scaleX

    // vm.focusLine.width = vm.dataWidth * 2 * vm.scaleX
    vm.focusLine.alpha = 0
    vm.focusSplitContainer.alpha = 0
    vm.toolBox.alpha = 0

    await vm.getDataIndex(chartData, tradeData)
    vm.getSplitData()
    vm.resizeHeight()
    vm.getPricePosY(chartData)
    vm.getMaxMinCandle()
  }

  async computerOnMove(event, chartData, tradeData) {
    const vm = this
    const targetX = event.pageX
    const targetY = event.pageY

    const candleContainerOffset = vm.candleContainer.position.x
    const tapObject = Math.abs(parseInt((candleContainerOffset - targetX) / (vm.dataSpace * vm.scaleX)))
    const focusLineOffset = (tapObject - vm.firstIndex) * vm.dataSpace * vm.scaleX
    const tapY = Math.min(Math.max(0, targetY - vm.mainContainerHeight / 11), vm.mainContainerHeight * 8 / 11)
    const tapValue = vm.candleMaxData - (vm.candleMaxData - vm.candleMinData) * (tapY / (vm.mainContainerHeight * 8 / 11))

    if (chartData[tapObject]) {
      if (parseInt(vm.wsOption.type) < 8) {
        vm.toolBoxNum.children[0].text = moment.unix(chartData[tapObject][4]).format('MM-DD HH:mm')
      } else {
        vm.toolBoxNum.children[0].text = moment.unix(chartData[tapObject][4]).format('YYYY MM-DD')
      }

      vm.toolBoxNum.children[1].text = (chartData[tapObject][0] / 10000000).toFixed(vm.fixNum)
      vm.toolBoxNum.children[2].text = (chartData[tapObject][3] / 10000000).toFixed(vm.fixNum)
      vm.toolBoxNum.children[3].text = (chartData[tapObject][2] / 10000000).toFixed(vm.fixNum)
      vm.toolBoxNum.children[4].text = (chartData[tapObject][1] / 10000000).toFixed(vm.fixNum)
      if ((chartData[tapObject][0] - chartData[tapObject][1]) > 0) {
        // 跌
        vm.toolBoxNum.children[5].tint = vm.option.candle.downColor
        vm.toolBoxNum.children[6].tint = vm.option.candle.downColor
      } else {
        // 漲
        vm.toolBoxNum.children[5].tint = vm.option.candle.upColor
        vm.toolBoxNum.children[6].tint = vm.option.candle.upColor
      }
      // vm.toolBoxNum.children[5].text = parseFloat(chartData[tapObject][0] - chartData[tapObject][1]) * -1
      // vm.toolBoxNum.children[6].text = parseFloat((chartData[tapObject][0] - chartData[tapObject][1]) / chartData[tapObject][1] * 100).toFixed(3) * -1 + '%'
      vm.toolBoxNum.children[5].text = (parseFloat(chartData[tapObject][0] - chartData[tapObject][1]).toFixed(4) * -1 / 10000000).toFixed(vm.fixNum)
      vm.toolBoxNum.children[6].text = parseFloat((chartData[tapObject][0] - chartData[tapObject][1]) / chartData[tapObject][1] * 100).toFixed(3) * -1 + '%'
      vm.toolBoxNum.children[7].text = tradeData[tapObject]

      vm.toolBoxNum.children.forEach(item => {
        item.position.x = vm.toolBoxWidth - item.width
      })

      vm.topMAContainer.children[1].text = vm.MA5Data[tapObject] !== '-' ? parseFloat(vm.MA5Data[tapObject] / 10000000).toFixed(vm.fixNum) : '-'
      vm.topMAContainer.children[3].text = vm.MA10Data[tapObject] !== '-' ? parseFloat(vm.MA10Data[tapObject] / 10000000).toFixed(vm.fixNum) : '-'
      vm.topMAContainer.children[5].text = vm.MA30Data[tapObject] !== '-' ? parseFloat(vm.MA30Data[tapObject] / 10000000).toFixed(vm.fixNum) : '-'

      vm.bottomMAContainer.children[1].text = parseFloat(tradeData[tapObject]).toFixed(3)

      if (vm.bottomMA5Data[tapObject] !== '-') {
        vm.bottomMAContainer.children[3].text = parseFloat(vm.bottomMA5Data[tapObject]).toFixed(3)
      } else {
        vm.bottomMAContainer.children[3].text = '-'
      }

      if (vm.bottomMA10Data[tapObject] !== '-') {
        vm.bottomMAContainer.children[5].text = parseFloat(vm.bottomMA10Data[tapObject]).toFixed(3)
      } else {
        vm.bottomMAContainer.children[5].text = '-'
      }

      vm.toolBox.alpha = 1

      if (vm.tapLineStyle === 'dash') {
        vm.focusLine.position.x = focusLineOffset
        vm.focusSplitContainer.position.y = Math.min(Math.max(targetY, vm.mainContainerHeight / 11 + vm.dataPaddingY - 1), vm.mainContainerHeight * 9 / 11 - vm.dataPaddingY + 2)
      } else if (vm.tapLineStyle === 'doubleDash') {
        vm.focusLine.position.x = focusLineOffset + vm.dataWidth * vm.scaleX
        vm.focusSplitContainer.position.y = Math.min(Math.max(targetY, vm.mainContainerHeight / 11 + vm.dataPaddingY - 1), vm.mainContainerHeight * 9 / 11 - vm.dataPaddingY + 2)
      } else {
        vm.focusLine.position.x = focusLineOffset
      }
      vm.focusLine.alpha = 1
      vm.focusSplitLabel.text = (+tapValue / 10000000).toFixed(vm.fixNum)
      vm.focusSplitContainer.alpha = 1
      if (targetX < vm.appWidth / 3) {
        vm.toolBox.position.x = vm.appWidth - vm.toolBox.width
        vm.focusSplitBackground.scale.x = 1
        vm.focusSplitBackground.position.x = 0
        vm.focusSplitLabel.position.x = 4
      } else {
        vm.toolBox.position.x = vm.toolBoxOffset * 1.5
        vm.focusSplitBackground.scale.x = -1
        vm.focusSplitBackground.position.x = vm.appWidth
        vm.focusSplitLabel.position.x = vm.appWidth - vm.focusSplitLabel.width - 4
      }
    } else {
      vm.focusLine.alpha = 0
      vm.focusSplitContainer.alpha = 0
      vm.toolBox.alpha = 0
    }
  }

  async computerOnOut() {
    const vm = this

    vm.focusLine.alpha = 0
    vm.focusSplitContainer.alpha = 0
    vm.toolBox.alpha = 0
  }

  async hammerOnTap(event, chartData, tradeData) {
    const vm = this
    // 點擊位置 -> X座標
    const targetX = event.changedPointers[0].offsetX
    const targetY = event.changedPointers[0].globalY || event.changedPointers[0].offsetY

    const candleContainerOffset = vm.candleContainer.position.x
    const tapObject = Math.abs(parseInt((candleContainerOffset - targetX) / (vm.dataSpace * vm.scaleX)))
    // const focusLineOffset = Math.floor(targetX / (vm.dataSpace * vm.scaleX)) * vm.dataSpace * vm.scaleX
    const tapY = Math.min(Math.max(0, targetY - vm.mainContainerHeight / 11), vm.mainContainerHeight * 8 / 11)
    const tapValue = vm.candleMaxData - (vm.candleMaxData - vm.candleMinData) * (tapY / (vm.mainContainerHeight * 8 / 11))

    const focusLineOffset = (tapObject - vm.firstIndex) * vm.dataSpace * vm.scaleX

    // click now price
    const nowPricePosX = vm.priceAllRect.position.x
    const nowPricePosY = vm.priceAllContainer.position.y
    const nowPriceWidth = vm.priceAllRect.width
    const nowPriceHeight = vm.priceAllRect.height

    const booleanNowPriceX = targetX > nowPricePosX && targetX < nowPricePosX + nowPriceWidth
    const booleanNowPriceY = targetY > nowPricePosY - vm.nowPriceLabelPadding[1] && targetY < nowPricePosY + nowPriceHeight - vm.nowPriceLabelPadding[1]
    const offsetMax = -(chartData.length) * vm.dataSpace * vm.scaleX + Math.floor((vm.appWidth - vm.chartRightSpace) / (vm.dataSpace * vm.scaleX)) * vm.dataSpace * vm.scaleX

    if (booleanNowPriceX && booleanNowPriceY && vm.priceAllContainer.alpha && chartData.length * vm.dataSpace + vm.chartRightSpace > vm.appWidth) {
      vm.candleContainer.position.x = offsetMax
      vm.tradeContainer.position.x = offsetMax
      vm.topMALineContaier.position.x = offsetMax
      vm.bottomMALineContaier.position.x = offsetMax

      vm.focusLine.alpha = 0
      vm.focusSplitLabel.text = (tapValue / 10000000).toFixed(4)
      vm.focusSplitContainer.alpha = 1
      vm.toolBox.alpha = 0

      await vm.getDataIndex(chartData, tradeData)
      vm.getSplitData()
      vm.resizeHeight()
      vm.getPricePosY(chartData)
      vm.getMaxMinCandle()
    } else if (targetX < vm.appWidth - vm.dataSpace * 2 * vm.scaleX && targetY < vm.mainContainerHeight) {
      if (chartData[tapObject]) {
        if (parseInt(vm.wsOption.type) < 8) {
          vm.toolBoxNum.children[0].text = moment.unix(chartData[tapObject][4]).format('MM-DD HH:mm')
        } else {
          return moment.unix(chartData[tapObject][4]).format('YYYY  MM-DD')
        }

        vm.toolBoxNum.children[1].text = (chartData[tapObject][0] / 10000000).toFixed(vm.fixNum)
        vm.toolBoxNum.children[2].text = (chartData[tapObject][3] / 10000000).toFixed(vm.fixNum)
        vm.toolBoxNum.children[3].text = (chartData[tapObject][2] / 10000000).toFixed(vm.fixNum)
        vm.toolBoxNum.children[4].text = (chartData[tapObject][1] / 10000000).toFixed(vm.fixNum)
        if ((chartData[tapObject][0] - chartData[tapObject][1]) > 0) {
          // 跌
          vm.toolBoxNum.children[5].tint = vm.option.candle.downColor
          vm.toolBoxNum.children[6].tint = vm.option.candle.downColor
        } else if ((chartData[tapObject][0] - chartData[tapObject][1]) < 0) {
          // 漲
          vm.toolBoxNum.children[5].tint = vm.option.candle.upColor
          vm.toolBoxNum.children[6].tint = vm.option.candle.upColor
        } else {
          vm.toolBoxNum.children[5].tint = 0xffffff
          vm.toolBoxNum.children[6].tint = 0xffffff
        }
        vm.toolBoxNum.children[5].text = (parseFloat(chartData[tapObject][0] - chartData[tapObject][1]).toFixed(4) * -1 / 10000000).toFixed(vm.fixNum)
        vm.toolBoxNum.children[6].text = parseFloat((chartData[tapObject][0] - chartData[tapObject][1]) / chartData[tapObject][1] * 100).toFixed(3) * -1 + '%'
        // vm.toolBoxNum.children[5].text = parseFloat(chartData[tapObject][0] - chartData[tapObject][1]).toFixed(4) * -1
        // vm.toolBoxNum.children[6].text = parseFloat((chartData[tapObject][0] - chartData[tapObject][1]) / chartData[tapObject][1] * 100).toFixed(3) * -1 + '%'
        vm.toolBoxNum.children[7].text = parseFloat(tradeData[tapObject])

        vm.toolBoxNum.children.forEach(item => {
          item.position.x = vm.toolBoxWidth - item.width
        })

        vm.topMAContainer.children[1].text = vm.MA5Data[tapObject] !== '-' ? parseFloat(vm.MA5Data[tapObject] / 10000000).toFixed(vm.fixNum) : '-'
        vm.topMAContainer.children[3].text = vm.MA10Data[tapObject] !== '-' ? parseFloat(vm.MA10Data[tapObject] / 10000000).toFixed(vm.fixNum) : '-'
        vm.topMAContainer.children[5].text = vm.MA30Data[tapObject] !== '-' ? parseFloat(vm.MA30Data[tapObject] / 10000000).toFixed(vm.fixNum) : '-'

        vm.bottomMAContainer.children[1].text = parseFloat(tradeData[tapObject]).toFixed(5)
        vm.bottomMAContainer.children[3].text = parseFloat(vm.bottomMA5Data[tapObject]).toFixed(5)
        vm.bottomMAContainer.children[5].text = parseFloat(vm.bottomMA10Data[tapObject]).toFixed(5)

        vm.toolBox.alpha = 1

        if (vm.tapLineStyle === 'dash') {
          vm.focusLine.position.x = focusLineOffset
          vm.focusSplitLabel.text = (tapValue / 10000000).toFixed(2)
          vm.focusSplitContainer.position.y = Math.min(Math.max(targetY, vm.mainContainerHeight / 11 + vm.dataPaddingY - 1), vm.mainContainerHeight * 9 / 11 - vm.dataPaddingY + 2)
          vm.focusSplitContainer.alpha = 1
        } else if (vm.tapLineStyle === 'doubleDash') {
          vm.focusLine.position.x = focusLineOffset + vm.dataWidth * vm.scaleX
          vm.focusSplitLabel.text = (tapValue / 10000000).toFixed(2)
          vm.focusSplitContainer.position.y = Math.min(Math.max(targetY, vm.mainContainerHeight / 11 + vm.dataPaddingY - 1), vm.mainContainerHeight * 9 / 11 - vm.dataPaddingY + 2)
          vm.focusSplitContainer.alpha = 1
        } else {
          vm.focusLine.position.x = focusLineOffset
        }
        vm.focusLine.alpha = 1
        vm.focusSplitContainer.alpha = 1
        if (targetX < vm.appWidth / 3) {
          vm.toolBox.position.x = vm.appWidth - vm.toolBox.width
          vm.focusSplitBackground.scale.x = 1
          vm.focusSplitBackground.position.x = 0
          vm.focusSplitLabel.position.x = 4
        } else {
          vm.toolBox.position.x = vm.toolBoxOffset * 1.5
          vm.focusSplitBackground.scale.x = -1
          vm.focusSplitBackground.position.x = vm.appWidth
          vm.focusSplitLabel.position.x = vm.appWidth - vm.focusSplitLabel.width - 4
        }
      } else {
        vm.focusLine.alpha = 0
        vm.focusSplitContainer.alpha = 0
        vm.toolBox.alpha = 0
      }
    } else {
      vm.focusLine.alpha = 0
      vm.focusSplitContainer.alpha = 0
      vm.toolBox.alpha = 0
    }
  }

  async hammerOnPanStart(event) {
    const vm = this
    vm.event.originPoint = vm.candleContainer.position.x
    vm.event.originOffset = event.changedPointers[0].clientX

    vm.moving = true

    if (vm.resizeHeightAnimation1) {
      vm.resizeHeightAnimation1.kill()
      vm.resizeHeightAnimation2.kill()
      vm.resizeHeightAnimation3.kill()
      vm.resizeHeightAnimation4.kill()
      vm.resizeHeightAnimation5.kill()
      vm.resizeHeightAnimation6.kill()
      vm.resizeHeightAnimation7.kill()
      vm.resizeHeightAnimation8.kill()
    }
  }

  async hammerOnPanMove(event, chartData, tradeData) {
    const vm = this
    const pageX = event.changedPointers[0].pageX
    const offsetMax = -(chartData.length) * vm.dataSpace * vm.scaleX + Math.floor((vm.appWidth - vm.chartRightSpace) / (vm.dataSpace * vm.scaleX)) * vm.dataSpace * vm.scaleX
    const candleOffset = vm.event.originPoint + pageX - vm.event.originOffset
    const canvasOffset = Math.min(0, Math.max(offsetMax, Math.floor(candleOffset / (vm.dataSpace * vm.scaleX)) * vm.dataSpace * vm.scaleX))

    if (vm.candleContainer.position.x !== canvasOffset) {
      vm.candleContainer.position.x = canvasOffset
      vm.tradeContainer.position.x = canvasOffset
      vm.topMALineContaier.position.x = canvasOffset
      vm.bottomMALineContaier.position.x = canvasOffset

      await vm.getDataIndex(chartData, tradeData)
      vm.getSplitData()
      vm.resizeHeight()
      vm.getPricePosY(chartData)
      vm.getMaxMinCandle()

      vm.focusLine.alpha = 0
      vm.focusSplitContainer.alpha = 0
      vm.toolBox.alpha = 0
    }
  }

  async hammerOnPanEnd() {
    const vm = this
    vm.moving = false
  }

  async hammerOnZoomStart(event) {
    const vm = this

    vm.moving = true

    if (vm.resizeHeightAnimation1) {
      vm.resizeHeightAnimation1.kill()
      vm.resizeHeightAnimation2.kill()
      vm.resizeHeightAnimation3.kill()
      vm.resizeHeightAnimation4.kill()
      vm.resizeHeightAnimation5.kill()
      vm.resizeHeightAnimation6.kill()
      vm.resizeHeightAnimation7.kill()
      vm.resizeHeightAnimation8.kill()
    }

    vm.hammer.touch1 = event.pointers[0].clientX
    vm.hammer.touch2 = event.pointers[1].clientX

    vm.toolBox.alpha = 0
    vm.focusLine.alpha = 0
    vm.focusSplitContainer.alpha = 0
  }

  async hammerOnZoomMove(event, chartData, tradeData) {
    const vm = this
    const touch1 = event.pointers[0].clientX
    const touch2 = event.pointers[1].clientX

    let touchScale
    if (touch1 > touch2) {
      touchScale = vm.hammer.touch1 - touch1 + touch2 - vm.hammer.touch2
    } else if (touch2 > touch1) {
      touchScale = touch1 - vm.hammer.touch1 + vm.hammer.touch2 - touch2
    } else {
      touchScale = 0
    }

    touchScale = Math.floor(touchScale / vm.dataSpace)

    vm.scaleLength = Math.max(Math.ceil(vm.dataLength / 2), Math.min(vm.dataLength * 2, vm.currectLength + touchScale))
    vm.scaleX = vm.dataLength / vm.scaleLength

    const maxDataLength = Math.ceil(vm.appWidth / (vm.dataSpace * vm.scaleX))
    const offsetMax = -((chartData.length - maxDataLength) * vm.dataSpace * vm.scaleX) - (Math.ceil(vm.chartRightSpace / (vm.dataSpace * vm.scaleX)) * vm.dataSpace * vm.scaleX)
    const posX = Math.min(0, Math.max(offsetMax, -(vm.firstIndex * vm.dataSpace * vm.scaleX)))

    vm.candleContainer.scale.x = vm.scaleX
    vm.tradeContainer.scale.x = vm.scaleX
    vm.topMALineContaier.scale.x = vm.scaleX
    vm.bottomMALineContaier.scale.x = vm.scaleX

    vm.candleContainer.position.x = posX
    vm.tradeContainer.position.x = posX
    vm.topMALineContaier.position.x = posX
    vm.bottomMALineContaier.position.x = posX

    vm.candleMask.width = vm.appWidth - vm.chartMaskRightSpace * vm.scaleX
    vm.tradeMask.width = vm.appWidth - vm.chartMaskRightSpace * vm.scaleX

    vm.focusLine.width = vm.dataWidth * 2 * vm.scaleX
    vm.focusLine.alpha = 0
    vm.focusSplitContainer.alpha = 0
    vm.toolBox.alpha = 0

    vm.hammer.move1 = event.pointers[0].clientX
    vm.hammer.move2 = event.pointers[1].clientX

    await vm.getDataIndex(chartData, tradeData)
    vm.getSplitData()
    vm.resizeHeight()
    vm.getPricePosY(chartData)
    vm.getMaxMinCandle()
  }

  async hammerOnZoomEnd() {
    const vm = this
    vm.moving = false

    vm.currectLength = vm.scaleLength
  }

  getDataIndex(chartData, tradeData, offsetMax) {
    return new Promise(resolve => {
      const vm = this
      let chartPosX
      if (offsetMax) {
        chartPosX = offsetMax
      } else {
        chartPosX = vm.candleContainer.position.x
      }
      // console.log(vm.candleContainer.position.x)
      vm.firstIndex = Math.max(0, Math.floor(Math.ceil(Math.abs(chartPosX)) / (vm.dataSpace * vm.scaleX)))
      vm.lastIndex = Math.min(chartData.length, -Math.floor((chartPosX - vm.appWidth + vm.chartMaskRightSpace * vm.scaleX) / (vm.dataSpace * vm.scaleX)))

      // candle
      vm.candleCurrectData = chartData.slice(vm.firstIndex, vm.lastIndex)
      const candleLow = vm.candleCurrectData.map(item => item[2])
      const candleHigh = vm.candleCurrectData.map(item => item[3])
      vm.candleMinData = Math.min(...candleLow)
      vm.candleMaxData = Math.max(...candleHigh)

      // trade
      vm.tradeCurrectData = tradeData.slice(vm.firstIndex, vm.lastIndex)
      vm.tradeMaxData = Math.max(...vm.tradeCurrectData)
      vm.tradeMinData = Math.min(...vm.tradeCurrectData)

      resolve()
    })
  }

  getSplitData() {
    const vm = this
    // // yLabel
    const yChildren = vm.ySplitLabelContainer.children

    const yText_1 = (vm.candleMaxData / 10000000).toFixed(vm.fixNum)
    const yText_2 = ((vm.candleMaxData * 3 / 4 + vm.candleMinData / 4) / 10000000).toFixed(vm.fixNum)
    const yText_3 = (((vm.candleMaxData + vm.candleMinData) / 2) / 10000000).toFixed(vm.fixNum)
    const yText_4 = ((vm.candleMaxData / 4 + vm.candleMinData * 3 / 4) / 10000000).toFixed(vm.fixNum)
    const yText_5 = (vm.candleMinData / 10000000).toFixed(vm.fixNum)

    yChildren[0].text = yText_1
    yChildren[1].text = yText_2
    yChildren[2].text = yText_3
    yChildren[3].text = yText_4
    yChildren[4].text = yText_5

    // yChildren[0].text = yText_1 < 10 ? yText_1 < 1 ? yText_1.toFixed(4) : yText_1.toFixed(3) : yText_1.toFixed(2)
    // yChildren[1].text = yText_2 < 10 ? yText_2 < 1 ? yText_2.toFixed(4) : yText_2.toFixed(3) : yText_2.toFixed(2)
    // yChildren[2].text = yText_3 < 10 ? yText_3 < 1 ? yText_3.toFixed(4) : yText_3.toFixed(3) : yText_3.toFixed(2)
    // yChildren[3].text = yText_4 < 10 ? yText_4 < 1 ? yText_4.toFixed(4) : yText_4.toFixed(3) : yText_4.toFixed(2)
    // yChildren[4].text = yText_5 < 10 ? yText_5 < 1 ? yText_5.toFixed(4) : yText_5.toFixed(3) : yText_5.toFixed(2)
    yChildren.forEach(item => {
      item.position.x = vm.appWidth - item.width - 2
    })
    // xLabel
    const time = vm.candleCurrectData.map(item => {
      if (parseInt(vm.wsOption.type) === '0') {
        return moment.unix(item[4]).format('mm:ss')
      } else if (parseInt(vm.wsOption.type) < 4) {
        return moment.unix(item[4]).format('HH:mm')
      } else if (parseInt(vm.wsOption.type) < 8) {
        return moment.unix(item[4]).format('MM-DD HH:mm')
      } else {
        return moment.unix(item[4]).format('YYYY  MM-DD')
      }
    })
    const maxDataLength = Math.floor(vm.appWidth / (vm.dataSpace * vm.scaleX))
    const currectTime = maxDataLength / this.xLength
    for (let i = 0; i < this.xLength; i++) {
      const xChildren = vm.xSplitLabelContainer.children[i]
      xChildren.text = time[Math.floor(currectTime * i)]
      xChildren.position.x = vm.appWidth / this.xLength * (i) - xChildren.width / 2
    }
  }

  resizeHeight() {
    const vm = this

    // candleData
    vm.candleScaleY = (vm.candleMax - vm.candleMin) / (vm.candleMaxData - vm.candleMinData)
    const candleMaxGap = vm.candleMax - vm.candleMaxData
    const candlePosY = vm.mainContainerHeight / 11 - (candleMaxGap * vm.candlePixel) * vm.candleScaleY + vm.dataPaddingY

    vm.candleContainer.scale.y = vm.candleScaleY
    vm.candleContainer.position.y = candlePosY

    vm.topMALineContaier.scale.y = vm.candleScaleY
    vm.topMALineContaier.position.y = candlePosY

    // tradeData
    vm.tradeScaleY = (vm.tradeMax - vm.tradeMin) / (vm.tradeMaxData - vm.tradeMinData)
    const tradePosY = Math.max(0, (vm.tradeMinData - vm.tradeMin) * vm.tradePixel * vm.tradeScaleY)

    vm.tradeContainer.scale.y = vm.tradeScaleY
    vm.tradeContainer.position.y = vm.mainContainerHeight + tradePosY

    vm.bottomMALineContaier.scale.y = vm.tradeScaleY
    vm.bottomMALineContaier.position.y = vm.mainContainerHeight + tradePosY
  }

  resizeHeightAnimate() {
    const vm = this

    // candleData
    vm.candleScaleY = (vm.candleMax - vm.candleMin) / (vm.candleMaxData - vm.candleMinData)
    const candleMaxGap = vm.candleMax - vm.candleMaxData
    const candlePosY = vm.mainContainerHeight / 11 - (candleMaxGap * vm.candlePixel) * vm.candleScaleY + vm.dataPaddingY

    vm.resizeHeightAnimation1 = gsap.to(vm.candleContainer, { y: candlePosY, duration: 0.3 })
    vm.resizeHeightAnimation2 = gsap.to(vm.candleContainer.scale, { y: vm.candleScaleY, duration: 0.3 })

    vm.resizeHeightAnimation3 = gsap.to(vm.topMALineContaier, { y: candlePosY, duration: 0.3 })
    vm.resizeHeightAnimation4 = gsap.to(vm.topMALineContaier.scale, { y: vm.candleScaleY, duration: 0.3 })

    // tradeData
    vm.tradeScaleY = (vm.tradeMax - vm.tradeMin) / (vm.tradeMaxData - vm.tradeMinData)
    const tradePosY = Math.max(0, (vm.tradeMinData - vm.tradeMin) * vm.tradePixel * vm.tradeScaleY)

    vm.resizeHeightAnimation5 = gsap.to(vm.tradeContainer.scale, { y: vm.tradeScaleY, duration: 0.3 })
    vm.resizeHeightAnimation6 = gsap.to(vm.tradeContainer, { y: vm.mainContainerHeight + tradePosY, duration: 0.3 })

    vm.resizeHeightAnimation7 = gsap.to(vm.bottomMALineContaier.scale, { y: vm.tradeScaleY, duration: 0.3 })
    vm.resizeHeightAnimation8 = gsap.to(vm.bottomMALineContaier, { y: vm.mainContainerHeight + tradePosY, duration: 0.3 })
  }

  getPricePosY(chartData) {
    const vm = this

    // 讀入NowPrice && 調整長度
    const NowPriceRightPosition = (vm.candleCurrectData.length - 0.5) * vm.dataSpace * vm.scaleX
    const value = parseFloat(chartData[chartData.length - 1][1])
    const nowprice = value
    // const nowprice = value < 10 ? value < 1 ? value.toFixed(4) : value.toFixed(3) : value.toFixed(2)
    vm.priceRightContainer.children[2].text = (nowprice / 10000000).toFixed(vm.fixNum)
    vm.priceAllContainer.children[4].text = (nowprice / 10000000).toFixed(vm.fixNum)
    vm.priceRightContainer.position.x = NowPriceRightPosition

    if (vm.appWidth - NowPriceRightPosition < vm.chartRightSpace / 2 + 15 || chartData.length * vm.dataSpace + vm.chartRightSpace < vm.appWidth) {
      vm.priceRightContainer.alpha = 0
      vm.priceAllContainer.alpha = 1
    } else {
      // right line
      vm.priceRightLine.clear()
      vm.priceRightLine.position.y = vm.priceRightLabel.height / 2
      vm.priceRightLine.lineStyle(1, vm.option.nowPrice.right.color)
      vm.priceRightLine.moveTo(0, 0)
      vm.priceRightLine.drawDashLine(vm.chartRightSpace, 0, 3, 3)
      // right other
      vm.priceRightContainer.children[1].position.x = vm.appWidth - NowPriceRightPosition - vm.priceRightContainer.children[1].width + 5
      vm.priceRightContainer.children[2].position.x = vm.appWidth - NowPriceRightPosition - vm.priceRightContainer.children[2].width - 2
      // nowPrice alpha
      vm.priceRightContainer.alpha = 1
      vm.priceAllContainer.alpha = 0
    }

    // now price
    const nowPrice = value
    const nowPricePixel = vm.dataHeight / (vm.candleMaxData - vm.candleMinData)
    const nowPricePosY = vm.mainContainerHeight / 11 + (vm.candleMaxData - nowPrice) * nowPricePixel + 2.5
    const PosY = Math.min(vm.mainContainerHeight * 9 / 11 - vm.priceRightContainer.height / 2, Math.max(vm.mainContainerHeight / 11 - vm.priceRightContainer.height / 2, nowPricePosY))
    vm.priceRightContainer.position.y = PosY
    vm.priceAllContainer.position.y = PosY
  }

  getPricePosYAnimate(chartData) {
    const vm = this

    // 讀入NowPrice && 調整長度
    const NowPriceRightPosition = (vm.candleCurrectData.length - 0.5) * vm.dataSpace * vm.scaleX
    const value = parseFloat(chartData[chartData.length - 1][1])
    const nowprice = value
    // const nowprice = value < 10 ? value < 1 ? value.toFixed(4) : value.toFixed(3) : value.toFixed(2)
    vm.priceRightContainer.children[2].text = (nowprice / 10000000).toFixed(vm.fixNum)
    vm.priceAllContainer.children[4].text = (nowprice / 10000000).toFixed(vm.fixNum)
    vm.priceRightContainer.position.x = NowPriceRightPosition

    if (vm.appWidth - NowPriceRightPosition < vm.chartRightSpace / 2 + 15 || chartData.length * vm.dataSpace + vm.chartRightSpace < vm.appWidth) {
      vm.priceRightContainer.alpha = 0
      vm.priceAllContainer.alpha = 1
    } else {
      // right line
      vm.priceRightLine.clear()
      vm.priceRightLine.position.y = vm.priceRightLabel.height / 2
      vm.priceRightLine.lineStyle(1, vm.option.nowPrice.right.color)
      vm.priceRightLine.moveTo(0, 0)
      vm.priceRightLine.drawDashLine(vm.chartRightSpace, 0, 3, 3)
      // right other
      vm.priceRightContainer.children[1].position.x = vm.appWidth - NowPriceRightPosition - vm.priceRightContainer.children[1].width + 5
      vm.priceRightContainer.children[2].position.x = vm.appWidth - NowPriceRightPosition - vm.priceRightContainer.children[2].width - 2
      // nowPrice alpha
      vm.priceRightContainer.alpha = 1
      vm.priceAllContainer.alpha = 0
    }

    // now price
    const nowPrice = value
    const nowPricePixel = vm.dataHeight / (vm.candleMaxData - vm.candleMinData)
    const nowPricePosY = vm.mainContainerHeight / 11 + (vm.candleMaxData - nowPrice) * nowPricePixel + 2.5
    const PosY = Math.min(vm.mainContainerHeight * 9 / 11 - vm.priceRightContainer.height / 2, Math.max(vm.mainContainerHeight / 11 - vm.priceRightContainer.height / 2, nowPricePosY))
    gsap.to(vm.priceRightContainer, { y: PosY, duration: 0.3 })
    gsap.to(vm.priceAllContainer, { y: PosY, duration: 0.3 })
  }

  getMaxMinCandle() {
    const vm = this
    // 更改candleMax & candleMin值和position.x
    const maxDataIndex = vm.candleCurrectData.findIndex(item => item[3] === vm.candleMaxData)
    const minDataIndex = vm.candleCurrectData.findIndex(item => item[2] === vm.candleMinData)

    // 讀入數據
    const value_max = vm.candleMaxData / 10000000
    const value_min = vm.candleMinData / 10000000
    // vm.candleMaxContainer.children[0].text = value_max < 10 ? value_max < 1 ? value_max.toFixed(4) : value_max.toFixed(3) : value_max.toFixed(2)
    // vm.candleMinContainer.children[0].text = value_min < 10 ? value_min < 1 ? value_min.toFixed(4) : value_min.toFixed(3) : value_min.toFixed(2)
    vm.candleMaxContainer.children[0].text = parseFloat(value_max.toFixed(vm.fixNum))
    vm.candleMinContainer.children[0].text = parseFloat(value_min.toFixed(vm.fixNum))

    // 更改 Max & Min 位置 & 判斷樣式
    vm.candleMaxContainer.position.x = (vm.dataSpace * maxDataIndex + vm.dataWidth) * vm.scaleX
    vm.candleMinContainer.position.x = (vm.dataSpace * minDataIndex + vm.dataWidth) * vm.scaleX
    if (vm.candleMaxContainer.position.x > vm.appWidth / 2) {
      vm.candleMaxLine.position.x = -vm.candleMaxLine.width
      vm.candleMaxLabel.position.x = -vm.candleMaxLine.width - vm.candleMaxLabel.width - 2
    } else {
      vm.candleMaxLine.position.x = 0
      vm.candleMaxLabel.position.x = vm.candleMaxLine.width
    }

    if (vm.candleMinContainer.position.x > vm.appWidth / 2) {
      vm.candleMinLine.position.x = -vm.candleMinLine.width
      vm.candleMinLabel.position.x = -vm.candleMinLine.width - vm.candleMinLabel.width - 2
    } else {
      vm.candleMinLine.position.x = 0
      vm.candleMinLabel.position.x = vm.candleMinLine.width
    }
  }

  drawCandle(open, close, low, high, i) {
    const vm = this
    let color = open > close ? vm.option.candle.downColor : vm.option.candle.upColor
    const width = vm.dataWidth
    let candleHigh = (vm.candleMax - high) * vm.candlePixel
    let candleOpen = open > close ? (high - open) * vm.candlePixel : (high - close) * vm.candlePixel
    let candleClose = open > close ? (high - close) * vm.candlePixel : (high - open) * vm.candlePixel
    let candleLow = (high - low) * vm.candlePixel

    if (Math.abs(open - close) < 0.4 && open - close !== 0) {
      // 判斷 candle box height 過小
      // console.log('test:', candleOpen, candleClose, open, close, i)
      if (high - close > close - low) {
        // 距離低點較近
        // console.log('low:', candleLow, i)
        candleOpen -= 1.5
        candleClose -= 0.5
        if (candleOpen < 0) {
          // console.log('小於0:', i)
          candleOpen = 1
          candleClose = 2
        }
        if (candleClose > candleLow) {
          candleLow = candleClose
        }
      } else {
        // 距離高點較近
        // console.log('high:', i)
        candleOpen += 0.5
        candleClose += 1.5
        if (candleClose > candleLow) {
          candleLow += 1.5
        }
      }
    } else if (open - close === 0) {
      // console.log('平盤', i)
      color = vm.option.candle.upColor
      if (high - close > close - low) {
        candleOpen -= 1.5
        candleClose -= 0.5
        if (candleOpen < 0) {
          candleOpen = 1
          candleClose = 2
        }
        if (candleClose > candleLow) {
          candleLow = candleClose
        }
      } else if (high === low) {
        candleOpen = 0
        candleClose = 1
        candleLow = 1
      } else {
        candleOpen += 0.5
        candleClose += 1.5
        if (candleClose > candleLow) {
          candleLow += 1.5
        }
      }
    }

    // console.log(candleClose)

    const candle = new PIXI.Graphics()
    candle.candle = [open, close, low, high]
    candle.position.set(vm.dataSpace * i + vm.dataWidth, candleHigh)
    candle.beginFill(color)
    candle.lineTo(-width / 6, 0)
    candle.lineTo(-width / 6, candleOpen)
    candle.lineTo(-width, candleOpen)
    candle.lineTo(-width, candleClose)
    candle.lineTo(-width / 6, candleClose)
    candle.lineTo(-width / 6, candleLow)
    candle.lineTo(width / 6, candleLow)
    candle.lineTo(width / 6, candleClose)
    candle.lineTo(width, candleClose)
    candle.lineTo(width, candleOpen)
    candle.lineTo(width / 6, candleOpen)
    candle.lineTo(width / 6, 0)

    if (!vm.fill.upColor && close > open) {
      vm.fill.upColor = candle.fill.color
    } else if (!vm.fill.downColor && open > close) {
      vm.fill.downColor = candle.fill.color
    }

    vm.candleContainer.addChild(candle)
  }

  drawLastCandle(open, close, low, high, i) {
    const vm = this
    const color = open > close ? vm.option.candle.downColor : vm.option.candle.upColor
    const candleHigh = (vm.candleMax - high) * vm.candlePixel
    const candleOpen = (high - open) * vm.candlePixel
    const candleBoxHeight = (open - close) * vm.candlePixel
    const candleLineHeight = (high - low) * vm.candlePixel

    const candle = new PIXI.Container()
    candle.candle = [open, close, low, high]
    candle.position.set(vm.dataSpace * i, candleHigh)

    const candleBox = new PIXI.Graphics()
    candleBox.beginFill(color)
    candleBox.drawRect(0, 0, vm.dataWidth * 2, 1)
    candleBox.height = candleBoxHeight > 0 ? Math.max(1, candleBoxHeight) : Math.min(-1, candleBoxHeight)
    candleBox.position.y = candleOpen

    const candleLine = new PIXI.Graphics()
    candleLine.beginFill(color)
    candleLine.drawRect(0, 0, vm.dataWidth / 2, 1)
    candleLine.height = candleLineHeight
    candleLine.position.x = vm.dataWidth - candleLine.width / 2
    candle.addChild(candleBox, candleLine)

    vm.candleContainer.addChild(candle)
  }

  drawTrade(open, close, i, tradeData) {
    const vm = this
    const trade = new PIXI.Graphics()
    const color = open > close ? vm.option.candle.downColor : vm.option.candle.upColor
    const tradeHeight = vm.tradeHeight - (vm.tradeMax - tradeData[i]) * vm.tradePixel + 2

    trade.beginFill(color)
    trade.drawRect(0, 0, vm.dataWidth * 2, 1)
    trade.position.x = vm.dataSpace * i
    trade.height = -tradeHeight

    vm.tradeContainer.addChild(trade)
  }

  drawTopMA() {
    const vm = this
    // MA5
    const MA5Line = new PIXI.Graphics()
    MA5Line.lineStyle(0.5, vm.option.topMA.color[0], 1, 0.5, true)

    let firstload_ma5 = true
    for (let i = 0; i < vm.MA5Data.length; i++) {
      if (vm.MA5Data[i] !== '-' && firstload_ma5) {
        MA5Line.moveTo((i + 0.5) * vm.dataSpace, (vm.candleMax - vm.MA5Data[i]) * vm.candlePixel)
        firstload_ma5 = false
      } else if (vm.MA5Data[i] !== '-') {
        const cx1 = vm.dataSpace * i
        const cx2 = vm.dataSpace * i
        const cy1 = (vm.candleMax - (vm.MA5Data[i - 1] * 5 + vm.MA5Data[i] * 3) / 8) * vm.candlePixel
        const cy2 = (vm.candleMax - (vm.MA5Data[i - 1] * 3 + vm.MA5Data[i] * 5) / 8) * vm.candlePixel
        const x = vm.dataSpace * (i + 0.5)
        const y = (vm.candleMax - vm.MA5Data[i]) * vm.candlePixel
        // MA5Line.bezierCurveTo(cx1, cy1, cx2, cy2, x, y)
        MA5Line.lineTo(x, y)
      }
    }

    vm.MA5Container.addChild(MA5Line)

    // MA10
    const MA10Line = new PIXI.Graphics()
    MA10Line.lineStyle(0.5, vm.option.topMA.color[1], 1, 0.5, true)

    let firstload_ma10 = true
    for (let i = 0; i < vm.MA10Data.length; i++) {
      if (vm.MA10Data[i] !== '-' && firstload_ma10) {
        MA10Line.moveTo((i + 0.5) * vm.dataSpace, (vm.candleMax - vm.MA10Data[i]) * vm.candlePixel)
        firstload_ma10 = false
      } else if (vm.MA10Data[i] !== '-') {
        const cx1 = vm.dataSpace * i
        const cx2 = vm.dataSpace * i
        const cy1 = (vm.candleMax - (vm.MA10Data[i - 1] * 5 + vm.MA10Data[i] * 3) / 8) * vm.candlePixel
        const cy2 = (vm.candleMax - (vm.MA10Data[i - 1] * 3 + vm.MA10Data[i] * 5) / 8) * vm.candlePixel
        const x = vm.dataSpace * (i + 0.5)
        const y = (vm.candleMax - vm.MA10Data[i]) * vm.candlePixel
        // MA10Line.bezierCurveTo(cx1, cy1, cx2, cy2, x, y)
        MA10Line.lineTo(x, y)
      }
    }

    vm.MA10Container.addChild(MA10Line)

    // MA30
    const MA30Line = new PIXI.Graphics()
    MA30Line.lineStyle(0.5, vm.option.topMA.color[2], 1, 0.5, true)

    let firstload_ma30 = true
    for (let i = 0; i < vm.MA30Data.length; i++) {
      if (vm.MA30Data[i] !== '-' && firstload_ma30) {
        MA30Line.moveTo((i + 0.5) * vm.dataSpace, (vm.candleMax - vm.MA30Data[i]) * vm.candlePixel)
        firstload_ma30 = false
      } else if (vm.MA30Data[i] !== '-') {
        const cx1 = vm.dataSpace * i
        const cx2 = vm.dataSpace * i
        const cy1 = (vm.candleMax - (vm.MA30Data[i - 1] * 5 + vm.MA30Data[i] * 3) / 8) * vm.candlePixel
        const cy2 = (vm.candleMax - (vm.MA30Data[i - 1] * 3 + vm.MA30Data[i] * 5) / 8) * vm.candlePixel
        const x = vm.dataSpace * (i + 0.5)
        const y = (vm.candleMax - vm.MA30Data[i]) * vm.candlePixel
        // MA30Line.bezierCurveTo(cx1, cy1, cx2, cy2, x, y)
        MA30Line.lineTo(x, y)
      }
    }

    vm.MA30Container.addChild(MA30Line)
  }

  drawBotMA() {
    const vm = this

    // MA5
    const bottomMA5Line = new PIXI.Graphics()
    bottomMA5Line.lineStyle(0.5, vm.option.bottomMA.color[1], 1, 0.5, true)

    let bottomMA5load = true
    for (let i = 0; i < vm.bottomMA5Data.length; i++) {
      if (vm.bottomMA5Data[i] !== '-' && bottomMA5load) {
        bottomMA5Line.moveTo((i + 0.5) * vm.dataSpace, (vm.tradeMax - vm.bottomMA5Data[i]) * vm.tradePixel)
        bottomMA5load = false
      } else if (vm.bottomMA5Data[i] !== '-') {
        const cx1 = vm.dataSpace * i
        const cx2 = vm.dataSpace * i
        const cy1 = (vm.tradeMax - (vm.bottomMA5Data[i - 1] * 3 + vm.bottomMA5Data[i]) / 4) * vm.tradePixel
        const cy2 = (vm.tradeMax - (vm.bottomMA5Data[i - 1] + vm.bottomMA5Data[i] * 3) / 4) * vm.tradePixel
        const x = vm.dataSpace * (i + 0.5)
        const y = (vm.tradeMax - vm.bottomMA5Data[i]) * vm.tradePixel
        // bottomMA5Line.bezierCurveTo(cx1, cy1, cx2, cy2, x, y)
        bottomMA5Line.lineTo(x, y)
      }
    }

    vm.bottomMA5Container.addChild(bottomMA5Line)

    // MA10
    const bottomMA10Line = new PIXI.Graphics()
    bottomMA10Line.lineStyle(0.5, vm.option.bottomMA.color[2], 1, 0.5, true)

    let bottomMA10load = true
    for (let i = 0; i < vm.bottomMA10Data.length; i++) {
      if (vm.bottomMA10Data[i] !== '-' && bottomMA10load) {
        bottomMA10Line.moveTo((i + 0.5) * vm.dataSpace, (vm.tradeMax - vm.bottomMA10Data[i]) * vm.tradePixel)
        bottomMA10load = false
      } else if (vm.bottomMA10Data[i] !== '-') {
        const cx1 = vm.dataSpace * i
        const cx2 = vm.dataSpace * i
        const cy1 = (vm.tradeMax - (vm.bottomMA10Data[i - 1] * 3 + vm.bottomMA10Data[i]) / 4) * vm.tradePixel
        const cy2 = (vm.tradeMax - (vm.bottomMA10Data[i - 1] + vm.bottomMA10Data[i] * 3) / 4) * vm.tradePixel
        const x = vm.dataSpace * (i + 0.5)
        const y = (vm.tradeMax - vm.bottomMA10Data[i]) * vm.tradePixel
        // bottomMA10Line.bezierCurveTo(cx1, cy1, cx2, cy2, x, y)
        bottomMA10Line.lineTo(x, y)
      }
    }

    vm.bottomMA10Container.addChild(bottomMA10Line)
  }

  windowResize() {
    // console.log(this.canvas)
    // app.renderer.resize(w,h)
    this.canvas.style.width = window.innerWidth + 'px'
    this.canvas.style.height = window.innerHeight + 'px'
    var w = window.innerWidth
    var h = window.innerHeight

    this.app.renderer.resize(w, h)
  }

  gradient(from, to, height) {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = height

    const ctx = canvas.getContext('2d')

    // use canvas2d API to create gradient
    const grd = ctx.createLinearGradient(0, 0, 0, height)
    grd.addColorStop(0, from)
    grd.addColorStop(1, to)

    ctx.fillStyle = grd
    ctx.fillRect(0, 0, 1, height)

    return PIXI.Texture.from(canvas)
  }

  calculateMA(dayCount, data) {
    var result = [];
    for (var i = 0, len = data.length; i < len; i++) {
      if (i < dayCount) {
        result.push('-');
        continue;
      }
      var sum = 0;
      for (var j = 0; j < dayCount; j++) {
        sum += data[i - j][1];
      }
      result.push(sum / dayCount);
    }
    return result;
  }

  calculateBottomMA(dayCount, data) {
    var result = [];
    for (var i = 0, len = data.length; i < len; i++) {
      if (i < dayCount) {
        result.push('-');
        continue;
      }
      var sum = 0;
      for (var j = 0; j < dayCount; j++) {
        sum += parseFloat(data[i - j]);
      }
      result.push(sum / dayCount);
    }
    return result;
  }

  async updateRealtime(chartData, tradeData, i) {
    // console.log('realtime')
    const vm = this
    const realTime = chartData[chartData.length - 1]
    const open = realTime[0]
    const close = realTime[1]
    const low = realTime[2]
    const high = realTime[3]

    const candleBoxHeight = (open - close) * vm.candlePixel < 0 ? Math.min(-1, (open - close) * vm.candlePixel) : Math.max(1, (open - close) * vm.candlePixel)
    // const candleBoxHeight = (open - close)
    const candleLineHeight = (high - low) * vm.candlePixel

    // candle data
    const lastCandle = vm.candleContainer.children[vm.candleContainer.children.length - 1]
    const lastCandleBox = lastCandle.children[0]
    const lastCandleLine = lastCandle.children[1]

    // trade data
    const lastTrade = vm.tradeContainer.children[vm.tradeContainer.children.length - 1]
    const lastTradeData = tradeData[tradeData.length - 1]
    const lastTradePosX = lastTrade.position.x
    const lastTradeHeight = vm.tradeHeight - (vm.tradeMax - lastTradeData) * vm.tradePixel + 2

    let candleLinePosY = lastCandleLine.y

    if (lastCandle.candle[3] < high) {
      candleLinePosY += (lastCandle.candle[3] - high) * vm.candlePixel
    }

    vm.animation = gsap.to(lastCandleBox, {
      height: candleBoxHeight,
      duration: 0.3,
      onUpdate: function () {
        if (this._targets[0].height > 0) {
          lastCandleBox.clear()
          lastCandleBox.beginFill(vm.option.candle.downColor)
          lastCandleBox.drawRect(0, 0, vm.dataWidth)
          lastCandleBox.drawRect(0, 0, vm.dataWidth * 2, 1)

          lastCandleLine.clear()
          lastCandleLine.beginFill(vm.option.candle.downColor)
          lastCandleLine.drawRect(0, 0, vm.dataWidth / 2, 1)
          lastCandleLine.height = candleLineHeight
          lastCandleLine.position.set(vm.dataWidth - lastCandleLine.width / 2, candleLinePosY)
        } else if (this._targets[0].height < 0) {
          lastCandleBox.clear()
          lastCandleBox.beginFill(vm.option.candle.upColor)
          lastCandleBox.drawRect(0, 0, vm.dataWidth)
          lastCandleBox.drawRect(0, 0, vm.dataWidth * 2, 1)

          lastCandleLine.clear()
          lastCandleLine.beginFill(vm.option.candle.upColor)
          lastCandleLine.drawRect(0, 0, vm.dataWidth / 2, 1)
          lastCandleLine.height = candleLineHeight
          lastCandleLine.position.set(vm.dataWidth - lastCandleLine.width / 2, candleLinePosY)
        }
      }
    })
    vm.animation2 = gsap.to(lastCandleLine, { height: candleLineHeight, y: candleLinePosY, duration: 0.3 })
    vm.animation3 = gsap.to(lastTrade, { height: -lastTradeHeight, duration: 0.3 })

    lastCandle.candle = [open, close, low, high]
    await vm.getDataIndex(chartData, tradeData)
    vm.getRealTimeMAValue(tradeData)
    vm.getSplitData()
    if (!vm.moving) {
      vm.resizeHeightAnimate()
    }
    vm.getPricePosYAnimate(chartData)
    vm.getMaxMinCandle()
  }

  async updateNewData(chartData, tradeData, i) {
    // console.log('update')

    const vm = this
    const newData = chartData[chartData.length - 1]
    const open = newData[0]
    const close = newData[1]
    const low = newData[2]
    const high = newData[3]
    const color = open < close ? vm.option.candle.upColor : vm.option.candle.downColor

    // candle
    const candleHigh = (vm.candleMax - high) * vm.candlePixel
    const candleOpen = (high - open) * vm.candlePixel
    const candleBoxHeight = (open - close) * vm.candlePixel
    const candleLineHeight = (high - low) * vm.candlePixel

    const candle = new PIXI.Container()
    candle.candle = [open, close, low, high]
    candle.position.set(vm.dataSpace * i, candleHigh)

    const candleBox = new PIXI.Graphics()
    candleBox.beginFill(color)
    candleBox.drawRect(0, 0, vm.dataWidth * 2, 1)
    // candleBox.height = candleBoxHeight
    gsap.to(candleBox, { height: candleBoxHeight, duration: 0.3 })
    candleBox.position.y = candleOpen

    const candleLine = new PIXI.Graphics()
    candleLine.beginFill(color)
    candleLine.drawRect(0, 0, vm.dataWidth / 2, 1)
    gsap.to(candleLine, { height: candleLineHeight, duration: 0.3 })
    candleLine.position.x = vm.dataWidth - candleLine.width / 2
    candle.addChild(candleBox, candleLine)

    vm.candleContainer.addChild(candle)

    // trade
    const trade = new PIXI.Graphics()
    const tradeHeight = vm.tradeHeight - (vm.tradeMax - tradeData[i]) * vm.tradePixel + 2

    trade.beginFill(color)
    trade.drawRect(0, 0, vm.dataWidth * 2, 1)
    trade.position.set(vm.dataSpace * i, 0)

    gsap.to(trade, { height: -tradeHeight, duration: 0.3 })

    vm.tradeContainer.addChild(trade)

    // topMALine
    const MA5Data = this.calculateMA(5, chartData)
    const MA10Data = this.calculateMA(10, chartData)
    const MA30Data = this.calculateMA(30, chartData)

    vm.MA5Data.push(MA5Data[MA5Data.length - 1])
    vm.MA10Data.push(MA10Data[MA10Data.length - 1])
    vm.MA30Data.push(MA30Data[MA30Data.length - 1])

    // MA5
    const MA5Bezier = {
      cx1: vm.dataSpace * i,
      cx2: vm.dataSpace * i,
      cy1: (vm.candleMax - (vm.MA5Data[i - 1] * 3 + vm.MA5Data[i]) / 4) * vm.candlePixel,
      cy2: (vm.candleMax - (vm.MA5Data[i - 1] + vm.MA5Data[i] * 3) / 4) * vm.candlePixel,
      x: vm.dataSpace * (i + 0.5),
      y: (vm.candleMax - vm.MA5Data[i]) * vm.candlePixel
    }

    const topMA5 = vm.MA5Container
    topMA5.children[0].moveTo((i - 0.5) * vm.dataSpace, (vm.candleMax - vm.MA5Data[i - 1]) * vm.candlePixel)
    // topMA5.children[0].bezierCurveTo(MA5Bezier.cx1, MA5Bezier.cy1, MA5Bezier.cx2, MA5Bezier.cy2, MA5Bezier.x, MA5Bezier.y)
    topMA5.children[0].lineTo(MA5Bezier.x, MA5Bezier.y)

    // MA10
    const MA10Bezier = {
      cx1: vm.dataSpace * i,
      cx2: vm.dataSpace * i,
      cy1: (vm.candleMax - (vm.MA10Data[i - 1] * 3 + vm.MA10Data[i]) / 4) * vm.candlePixel,
      cy2: (vm.candleMax - (vm.MA10Data[i - 1] + vm.MA10Data[i] * 3) / 4) * vm.candlePixel,
      x: vm.dataSpace * (i + 0.5),
      y: (vm.candleMax - vm.MA10Data[i]) * vm.candlePixel
    }

    const topMA10 = vm.MA10Container
    topMA10.children[0].moveTo((i - 0.5) * vm.dataSpace, (vm.candleMax - vm.MA10Data[i - 1]) * vm.candlePixel)
    // topMA10.children[0].bezierCurveTo(MA10Bezier.cx1, MA10Bezier.cy1, MA10Bezier.cx2, MA10Bezier.cy2, MA10Bezier.x, MA10Bezier.y)
    topMA10.children[0].lineTo(MA10Bezier.x, MA10Bezier.y)

    // MA30
    const MA30Bezier = {
      cx1: vm.dataSpace * i,
      cx2: vm.dataSpace * i,
      cy1: (vm.candleMax - (vm.MA30Data[i - 1] * 3 + vm.MA30Data[i]) / 4) * vm.candlePixel,
      cy2: (vm.candleMax - (vm.MA30Data[i - 1] + vm.MA30Data[i] * 3) / 4) * vm.candlePixel,
      x: vm.dataSpace * (i + 0.5),
      y: (vm.candleMax - vm.MA30Data[i]) * vm.candlePixel
    }

    const topMA30 = vm.MA30Container
    topMA30.children[0].moveTo((i - 0.5) * vm.dataSpace, (vm.candleMax - vm.MA30Data[i - 1]) * vm.candlePixel)
    // topMA30.children[0].bezierCurveTo(MA30Bezier.cx1, MA30Bezier.cy1, MA30Bezier.cx2, MA30Bezier.cy2, MA30Bezier.x, MA30Bezier.y)
    topMA30.children[0].lineTo(MA30Bezier.x, MA30Bezier.y)

    // bottomMALine
    const bottomMA5Data = this.calculateBottomMA(5, tradeData)
    const bottomMA10Data = this.calculateBottomMA(10, tradeData)

    vm.bottomMA5Data.push(bottomMA5Data[bottomMA5Data.length - 1])
    vm.bottomMA10Data.push(bottomMA10Data[bottomMA10Data.length - 1])

    // MA5
    const MA5Bezier2 = {
      cx1: vm.dataSpace * i,
      cx2: vm.dataSpace * i,
      cy1: (vm.tradeMax - (vm.bottomMA5Data[i - 1] * 3 + vm.bottomMA5Data[i]) / 4) * vm.tradePixel,
      cy2: (vm.tradeMax - (vm.bottomMA5Data[i - 1] + vm.bottomMA5Data[i] * 3) / 4) * vm.tradePixel,
      x: vm.dataSpace * (i + 0.5),
      y: (vm.tradeMax - vm.bottomMA5Data[i]) * vm.tradePixel
    }

    const bottomMA5 = vm.bottomMA5Container
    bottomMA5.children[0].moveTo((i - 0.5) * vm.dataSpace, (vm.tradeMax - vm.bottomMA5Data[i - 1]) * vm.tradePixel)
    // bottomMA5.children[0].bezierCurveTo(MA5Bezier2.cx1, MA5Bezier2.cy1, MA5Bezier2.cx2, MA5Bezier2.cy2, MA5Bezier2.x, MA5Bezier2.y)
    bottomMA5.children[0].lineTo(MA5Bezier2.x, MA5Bezier2.y)

    // MA10
    const MA10Bezier2 = {
      cx1: vm.dataSpace * i,
      cx2: vm.dataSpace * i,
      cy1: (vm.tradeMax - (vm.bottomMA10Data[i - 1] * 3 + vm.bottomMA10Data[i]) / 4) * vm.tradePixel,
      cy2: (vm.tradeMax - (vm.bottomMA10Data[i - 1] + vm.bottomMA10Data[i] * 3) / 4) * vm.tradePixel,
      x: vm.dataSpace * (i + 0.5),
      y: (vm.tradeMax - vm.bottomMA10Data[i]) * vm.tradePixel
    }

    const bottomMA10 = vm.bottomMA10Container
    bottomMA10.children[0].moveTo((i - 0.5) * vm.dataSpace, (vm.tradeMax - vm.bottomMA10Data[i - 1]) * vm.tradePixel)
    // bottomMA10.children[0].bezierCurveTo(MA10Bezier2.cx1, MA10Bezier2.cy1, MA10Bezier2.cx2, MA10Bezier2.cy2, MA10Bezier2.x, MA10Bezier2.y)
    bottomMA10.children[0].lineTo(MA10Bezier2.cx1, MA10Bezier2.cy1, MA10Bezier2.cx2, MA10Bezier2.cy2, MA10Bezier2.x, MA10Bezier2.y)

    // change container position x
    const candlePosX = vm.candleContainer.position.x
    const offsetMax = -(chartData.length) * vm.dataSpace * vm.scaleX + Math.floor((vm.appWidth - vm.chartRightSpace) / (vm.dataSpace * vm.scaleX)) * vm.dataSpace * vm.scaleX

    if (candlePosX - offsetMax <= vm.dataSpace * 2 * vm.scaleX && vm.dataSpace * chartData.length * vm.scaleX > vm.appWidth) {
      gsap.to(vm.candleContainer, { x: offsetMax, duration: 0.3 })
      gsap.to(vm.tradeContainer, { x: offsetMax, duration: 0.3 })
      gsap.to(vm.topMALineContaier, { x: offsetMax, duration: 0.3 })
      gsap.to(vm.bottomMALineContaier, { x: offsetMax, duration: 0.3 })

      await vm.getDataIndex(chartData, tradeData, offsetMax)
    } else {
      await vm.getDataIndex(chartData, tradeData)
    }

    vm.getSplitData()
    if (!vm.moving) {
      vm.resizeHeightAnimate()
    }
    vm.getPricePosYAnimate(chartData)
    vm.getMaxMinCandle()
  }

  async updateRealtimeTab(chartData, tradeData, i) {
    // console.log('realtime')
    const vm = this
    const realTime = chartData[chartData.length - 1]
    const open = realTime[0]
    const close = realTime[1]
    const low = realTime[2]
    const high = realTime[3]

    const candleBoxHeight = (open - close) * vm.candlePixel
    const candleLineHeight = (high - low) * vm.candlePixel

    // candle data
    const lastCandle = vm.candleContainer.children[vm.candleContainer.children.length - 1]
    const lastCandleBox = lastCandle.children[0]
    const lastCandleLine = lastCandle.children[1]

    // trade data
    const lastTrade = vm.tradeContainer.children[vm.tradeContainer.children.length - 1]
    const lastTradeData = tradeData[tradeData.length - 1]
    const lastTradePosX = lastTrade.position.x
    const lastTradeHeight = vm.tradeHeight - (vm.tradeMax - lastTradeData) * vm.tradePixel + 2

    let candleLinePosY = lastCandleLine.y

    if (lastCandle.candle[3] < high) {
      candleLinePosY += (lastCandle.candle[3] - high) * vm.candlePixel
    }

    const color = open > close ? vm.option.candle.downColor : vm.option.candle.upColor
    lastCandleBox.clear()
    lastCandleBox.beginFill(color)
    lastCandleBox.drawRect(0, 0, vm.dataWidth * 2, 1)
    lastCandleBox.height = candleBoxHeight

    lastCandleLine.clear()
    lastCandleLine.beginFill(color)
    lastCandleLine.drawRect(0, 0, vm.dataWidth / 2, 1)
    lastCandleLine.height = candleLineHeight
    lastCandleLine.position.set(vm.dataWidth - lastCandleLine.width / 2, candleLinePosY)

    lastTrade.height = -lastTradeHeight

    lastCandle.candle = [open, close, low, high]

    await vm.getDataIndex(chartData, tradeData)
    vm.getSplitData()
    vm.resizeHeight()
    vm.getPricePosY(chartData)
    vm.getMaxMinCandle()
  }

  async updateNewDataTab(chartData, tradeData, i) {
    // console.log('update')

    const vm = this
    const newData = chartData[chartData.length - 1]
    const open = newData[0]
    const close = newData[1]
    const low = newData[2]
    const high = newData[3]
    const color = open > close ? vm.option.candle.upColor : vm.option.candle.downColor

    vm.animation.kill()
    vm.animation2.kill()
    vm.animation3.kill()

    // candle
    const candleHigh = (vm.candleMax - high) * vm.candlePixel
    const candleOpen = (high - open) * vm.candlePixel
    const candleBoxHeight = (open - close) * vm.candlePixel
    const candleLineHeight = (high - low) * vm.candlePixel

    const candle = new PIXI.Container()
    candle.candle = [open, close, low, high]
    candle.position.set(vm.dataSpace * i, candleHigh)

    const candleBox = new PIXI.Graphics()
    candleBox.beginFill(color)
    candleBox.drawRect(0, 0, vm.dataWidth * 2, 1)
    candleBox.height = candleBoxHeight
    candleBox.position.y = candleOpen

    const candleLine = new PIXI.Graphics()
    candleLine.beginFill(color)
    candleLine.drawRect(0, 0, vm.dataWidth / 2, 1)
    candleLine.height = candleLineHeight
    candleLine.position.x = vm.dataWidth - candleLine.width / 2
    candle.addChild(candleBox, candleLine)

    vm.candleContainer.addChild(candle)

    // trade
    const trade = new PIXI.Graphics()
    const tradeHeight = vm.tradeHeight - (vm.tradeMax - tradeData[i]) * vm.tradePixel + 2

    trade.beginFill(color)
    trade.drawRect(0, 0, vm.dataWidth * 2, -tradeHeight)
    trade.position.set(vm.dataSpace * i, 0)

    vm.tradeContainer.addChild(trade)

    // topMALine
    const MA5Data = this.calculateMA(5, chartData)
    const MA10Data = this.calculateMA(10, chartData)
    const MA30Data = this.calculateMA(30, chartData)

    vm.MA5Data.push(MA5Data[MA5Data.length - 1])
    vm.MA10Data.push(MA10Data[MA10Data.length - 1])
    vm.MA30Data.push(MA30Data[MA30Data.length - 1])

    // MA5
    const MA5Bezier = {
      cx1: vm.dataSpace * i,
      cx2: vm.dataSpace * i,
      cy1: (vm.candleMax - (vm.MA5Data[i - 1] * 3 + vm.MA5Data[i]) / 4) * vm.candlePixel,
      cy2: (vm.candleMax - (vm.MA5Data[i - 1] + vm.MA5Data[i] * 3) / 4) * vm.candlePixel,
      x: vm.dataSpace * (i + 0.5),
      y: (vm.candleMax - vm.MA5Data[i]) * vm.candlePixel
    }

    const topMA5 = vm.MA5Container
    topMA5.children[0].moveTo((i - 0.5) * vm.dataSpace, (vm.candleMax - vm.MA5Data[i - 1]) * vm.candlePixel)
    topMA5.children[0].bezierCurveTo(MA5Bezier.cx1, MA5Bezier.cy1, MA5Bezier.cx2, MA5Bezier.cy2, MA5Bezier.x, MA5Bezier.y)

    // MA10
    const MA10Bezier = {
      cx1: vm.dataSpace * i,
      cx2: vm.dataSpace * i,
      cy1: (vm.candleMax - (vm.MA10Data[i - 1] * 3 + vm.MA10Data[i]) / 4) * vm.candlePixel,
      cy2: (vm.candleMax - (vm.MA10Data[i - 1] + vm.MA10Data[i] * 3) / 4) * vm.candlePixel,
      x: vm.dataSpace * (i + 0.5),
      y: (vm.candleMax - vm.MA10Data[i]) * vm.candlePixel
    }

    const topMA10 = vm.MA10Container
    topMA10.children[0].moveTo((i - 0.5) * vm.dataSpace, (vm.candleMax - vm.MA10Data[i - 1]) * vm.candlePixel)
    topMA10.children[0].bezierCurveTo(MA10Bezier.cx1, MA10Bezier.cy1, MA10Bezier.cx2, MA10Bezier.cy2, MA10Bezier.x, MA10Bezier.y)

    // MA30
    const MA30Bezier = {
      cx1: vm.dataSpace * i,
      cx2: vm.dataSpace * i,
      cy1: (vm.candleMax - (vm.MA30Data[i - 1] * 3 + vm.MA30Data[i]) / 4) * vm.candlePixel,
      cy2: (vm.candleMax - (vm.MA30Data[i - 1] + vm.MA30Data[i] * 3) / 4) * vm.candlePixel,
      x: vm.dataSpace * (i + 0.5),
      y: (vm.candleMax - vm.MA30Data[i]) * vm.candlePixel
    }

    const topMA30 = vm.MA30Container
    topMA30.children[0].moveTo((i - 0.5) * vm.dataSpace, (vm.candleMax - vm.MA30Data[i - 1]) * vm.candlePixel)
    topMA30.children[0].bezierCurveTo(MA30Bezier.cx1, MA30Bezier.cy1, MA30Bezier.cx2, MA30Bezier.cy2, MA30Bezier.x, MA30Bezier.y)

    // bottomMALine
    const bottomMA5Data = this.calculateBottomMA(5, tradeData)
    const bottomMA10Data = this.calculateBottomMA(10, tradeData)

    vm.bottomMA5Data.push(bottomMA5Data[bottomMA5Data.length - 1])
    vm.bottomMA10Data.push(bottomMA10Data[bottomMA10Data.length - 1])

    // MA5
    const MA5Bezier2 = {
      cx1: vm.dataSpace * i,
      cx2: vm.dataSpace * i,
      cy1: (vm.tradeMax - (vm.bottomMA5Data[i - 1] * 3 + vm.bottomMA5Data[i]) / 4) * vm.tradePixel,
      cy2: (vm.tradeMax - (vm.bottomMA5Data[i - 1] + vm.bottomMA5Data[i] * 3) / 4) * vm.tradePixel,
      x: vm.dataSpace * (i + 0.5),
      y: (vm.tradeMax - vm.bottomMA5Data[i]) * vm.tradePixel
    }

    const bottomMA5 = vm.bottomMA5Container
    bottomMA5.children[0].moveTo((i - 0.5) * vm.dataSpace, (vm.tradeMax - vm.bottomMA5Data[i - 1]) * vm.tradePixel)
    bottomMA5.children[0].bezierCurveTo(MA5Bezier2.cx1, MA5Bezier2.cy1, MA5Bezier2.cx2, MA5Bezier2.cy2, MA5Bezier2.x, MA5Bezier2.y)

    // MA10
    const MA10Bezier2 = {
      cx1: vm.dataSpace * i,
      cx2: vm.dataSpace * i,
      cy1: (vm.tradeMax - (vm.bottomMA10Data[i - 1] * 3 + vm.bottomMA10Data[i]) / 4) * vm.tradePixel,
      cy2: (vm.tradeMax - (vm.bottomMA10Data[i - 1] + vm.bottomMA10Data[i] * 3) / 4) * vm.tradePixel,
      x: vm.dataSpace * (i + 0.5),
      y: (vm.tradeMax - vm.bottomMA10Data[i]) * vm.tradePixel
    }

    const bottomMA10 = vm.bottomMA10Container
    bottomMA10.children[0].moveTo((i - 0.5) * vm.dataSpace, (vm.tradeMax - vm.bottomMA10Data[i - 1]) * vm.tradePixel)
    bottomMA10.children[0].bezierCurveTo(MA10Bezier2.cx1, MA10Bezier2.cy1, MA10Bezier2.cx2, MA10Bezier2.cy2, MA10Bezier2.x, MA10Bezier2.y)

    // change container position x
    const candlePosX = vm.candleContainer.position.x
    const offsetMax = -(chartData.length) * vm.dataSpace * vm.scaleX + Math.floor((vm.appWidth - vm.chartRightSpace) / (vm.dataSpace * vm.scaleX)) * vm.dataSpace * vm.scaleX

    if (candlePosX - offsetMax <= vm.dataSpace * 2 * vm.scaleX && vm.dataSpace * chartData.length * vm.scaleX) {
      vm.candleContainer.x = offsetMax
      vm.tradeContainer.x = offsetMax
      vm.topMALineContaier.x = offsetMax
      vm.bottomMALineContaier.x = offsetMax

      await vm.getDataIndex(chartData, tradeData, offsetMax)
    } else {
      await vm.getDataIndex(chartData, tradeData)
    }

    vm.getSplitData()
    vm.resizeHeight()
    vm.getPricePosY(chartData)
    vm.getMaxMinCandle()
  }

  async windowHidden() {
    const vm = this

    if (vm.animation) {
      vm.animation.kill()
      vm.animation2.kill()
      vm.animation3.kill()
    }

    const candleLength = vm.candleContainer.children.length
    const tradeLength = vm.tradeContainer.children.length

    for (let i = 0; i < candleLength; i++) {
      vm.candleContainer.children[0].destroy(true)
    }

    for (let j = 0; j < tradeLength; j++) {
      vm.tradeContainer.children[0].destroy(true)
    }

    // top MA
    vm.MA5Container.children[0].destroy(true)
    vm.MA10Container.children[0].destroy(true)
    vm.MA30Container.children[0].destroy(true)

    // bottom MA
    vm.bottomMA5Container.children[0].destroy(true)
    vm.bottomMA10Container.children[0].destroy(true)
  }

  async windowVisible(chartData, tradeData) {
    const vm = this

    const open = chartData.map(item => item[0])
    const close = chartData.map(item => item[1])
    const low = chartData.map(item => item[2])
    const high = chartData.map(item => item[3])

    vm.candleMax = Math.max(...high)
    vm.candleMin = Math.min(...low)

    vm.candlePixel = (vm.dataHeight) / (vm.candleMax - vm.candleMin)

    for (let i = 0; i < chartData.length; i++) {
      vm.drawLastCandle(open[i], close[i], low[i], high[i], i)
    }

    vm.tradeMax = Math.max(...tradeData)
    vm.tradeMin = Math.min(...tradeData)
    vm.tradePixel = vm.tradeHeight / (vm.tradeMax - vm.tradeMin)

    for (let i = 0; i < tradeData.length; i++) {
      vm.drawTrade(open[i], close[i], i, tradeData)
    }

    vm.MA5Data = this.calculateMA(5, chartData)
    vm.MA10Data = this.calculateMA(10, chartData)
    vm.MA30Data = this.calculateMA(30, chartData)
    vm.drawTopMA()

    vm.bottomMA5Data = this.calculateBottomMA(5, tradeData)
    vm.bottomMA10Data = this.calculateBottomMA(10, tradeData)
    vm.drawBotMA()

    await vm.getDataIndex(chartData, tradeData)
    vm.getSplitData()
    vm.resizeHeight()
    vm.getPricePosY(chartData)
    vm.getMaxMinCandle()
  }

  getRealTimeMAValue(tradeData) {
    const vm = this

    if (!vm.toolBox.alpha) {
      vm.bottomMAContainer.children[1].text = parseFloat(tradeData[tradeData.length - 1]).toFixed(5)
      vm.bottomMAContainer.children[3].text = parseFloat(vm.bottomMA5Data[vm.bottomMA5Data.length - 1]).toFixed(5)
      vm.bottomMAContainer.children[5].text = parseFloat(vm.bottomMA10Data[vm.bottomMA10Data.length - 1]).toFixed(5)

      vm.topMAContainer.children[1].text = parseFloat(((vm.MA5Data[vm.MA5Data.length - 1]) / 10000000)).toFixed(vm.fixNum)
      vm.topMAContainer.children[3].text = parseFloat(((vm.MA10Data[vm.MA10Data.length - 1]) / 10000000)).toFixed(vm.fixNum)
      vm.topMAContainer.children[5].text = parseFloat(((vm.MA30Data[vm.MA30Data.length - 1]) / 10000000)).toFixed(vm.fixNum)
    }
  }
}