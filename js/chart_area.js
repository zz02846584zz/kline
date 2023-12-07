/* eslint-disable */
class Chart {
  constructor(target, option, wsOption) {
    this.canvas = document.getElementById(target)
    this.option = {
      // background: 0x111217,
      background: 0x0d1318,
      color: '#ffffff',
      area: {
        lineColor: 0x90cdf4,
        background: ['rgba(200, 235, 255, 0.5)', '#0d1318']
      },
      trade: {
        lineColor: 0x2083f4
      },
      topMA: {
        // bg: ['#0b0b0e', 'transparent']
        bg: ['#050709', '#0d1318']
      },
      bottomMA: {
        color: 0x8e4dc8,
        // bg: ['#0b0b0e', 'transparent']
        bg: ['#050709', '#0d1318']
      },
      splitLine: {
        x: {
          lineStyle: 0x1b1d29,
          color: 0x6b6f84
        },
        y: {
          lineStyle: 0x1b1d29,
          color: 0x6b6f84
        }
      },
      nowPrice: {
        all: {
          color: 0x6b6f84,
          stroke: 0x121318,
          background: 0x121318
        },
        right: {
          color: 0x2083f4
        }
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
    this.area = {
      max: undefined,
      min: undefined
    }
    this.moving = false

    // ws option
    this.wsOption = wsOption

    this.bottomSpace = 25
    this.splitLineRightSpace = 2

    this.appWidth = window.innerWidth
    this.appHeight = window.innerHeight
    this.mainContainerHeight = this.appHeight - this.bottomSpace

    this.dataSpace = window.innerWidth > 768 ? this.appWidth / 100 : 10
    this.dataPaddingY = 8
    this.dataHeight = this.mainContainerHeight / 11 * 8 - this.dataPaddingY * 2

    this.topHeight = this.mainContainerHeight / 11 * 8
    this.bottomHeight = this.mainContainerHeight / 11 * 2

    this.xLength = window.innerWidth > 768 ? this.appWidth / 120 : 5
    this.chartRightSpace = Math.floor(this.appWidth / this.xLength / this.dataSpace) * this.dataSpace
    this.chartMaskRightSpace = this.dataSpace

    this.tradeHeight = this.bottomHeight / 2

    this.nowPriceSpace = 2
    this.nowPriceLabelPadding = [15, 3] // x,y
    this.nowPriceStrokeWidth = 1

    // scale
    this.scaleX = 1
    this.dataLength = Math.ceil(this.appWidth / this.dataSpace) // 預設顯示資料筆數
    this.scaleLength = this.dataLength
    this.currectLength = Math.ceil(this.appWidth / this.dataSpace)
    // pixi
    this.app = undefined
  }

  async startChart(chartData, tradeData) {
    const vm = this

    // toFixed
    vm.fixNum = Math.min(String(parseFloat(chartData[0][1] / 10000000)).split('.')[1].length, 2)

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

    vm.app.stop()

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

    // BottomMAContainer Gradient
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

    // area data
    vm.areaContainer = new PIXI.Container()
    vm.app.stage.addChild(vm.areaContainer)
    vm.areaContainer.position.y = vm.mainContainerHeight / 11 + vm.dataPaddingY

    vm.areaLineContainer = new PIXI.Container()
    vm.areaBackgroundContainer = new PIXI.Container()
    vm.areaContainer.addChild(vm.areaLineContainer, vm.areaBackgroundContainer)

    const close = chartData.map(item => item[0])

    vm.areaMax = Math.max(...close)
    vm.areaMin = Math.min(...close)
    vm.area = {
      min: Math.min(...close),
      max: Math.max(...close)
    }
    vm.areaPixel = vm.dataHeight / (vm.areaMax - vm.areaMin)

    // area line
    const line = new PIXI.Graphics()
    const lineBackground = new PIXI.Graphics()

    line.lineStyle(0.5, vm.option.area.lineColor, 1, 0.5, true)
    line.moveTo(0, (vm.areaMax - close[0]) * vm.areaPixel)

    lineBackground.beginFill(0x000000)
    lineBackground.moveTo(0, (vm.areaMax - vm.areaMin) * vm.areaPixel + vm.dataPaddingY * 2)
    lineBackground.lineTo(0, (vm.areaMax - close[0]) * vm.areaPixel)
    for (let i = 1; i < chartData.length - 1; i++) {
      const cx1 = vm.dataSpace * i
      const cx2 = vm.dataSpace * i
      const cy1 = (vm.areaMax - (close[i - 1] * 3 + close[i]) / 4) * vm.areaPixel
      const cy2 = (vm.areaMax - (close[i - 1] + close[i] * 3) / 4) * vm.areaPixel
      const x = vm.dataSpace * (i + 0.5)
      const y = (vm.areaMax - close[i]) * vm.areaPixel

      line.bezierCurveTo(cx1, cy1, cx2, cy2, x, y)
      lineBackground.bezierCurveTo(cx1, cy1, cx2, cy2, x, y)
    }
    lineBackground.lineTo(vm.dataSpace * (chartData.length - 1.5), (vm.areaMax - vm.areaMin) * vm.areaPixel + vm.dataPaddingY * 2)

    vm.areaLineContainer.addChild(line)
    vm.areaBackgroundContainer.addChild(lineBackground)

    // last
    const lastLine = new PIXI.Graphics()
    const lastLineBackground = new PIXI.Graphics()
    const i = chartData.length - 1

    const cx1 = vm.dataSpace * i
    const cx2 = vm.dataSpace * i
    const cy1 = (vm.areaMax - (close[i - 1] * 3 + close[i]) / 4) * vm.areaPixel
    const cy2 = (vm.areaMax - (close[i - 1] + close[i] * 3) / 4) * vm.areaPixel
    const x = vm.dataSpace * (i + 0.5)
    const y = (vm.areaMax - close[i]) * vm.areaPixel

    vm.points = {
      moveTo: {
        x: vm.dataSpace * (i - 0.5),
        y: (vm.areaMax - close[i - 1]) * vm.areaPixel
      },
      lineTo: {
        cx1: cx1,
        cx2: cx2,
        cy1: cy1,
        cy2: cy2,
        x: x,
        y: y
      }
    }

    lastLine.lineStyle(0.5, vm.option.area.lineColor, 1, 0.5, true)
    lastLine.moveTo(vm.dataSpace * (i - 0.5), (vm.areaMax - close[i - 1]) * vm.areaPixel)
    lastLine.bezierCurveTo(cx1, cy1, cx2, cy2, x, y)

    lastLineBackground.beginFill(0x000000)
    lastLineBackground.moveTo(vm.dataSpace * (i - 0.5), (vm.areaMax - vm.areaMin) * vm.areaPixel + vm.dataPaddingY * 2)
    lastLineBackground.lineTo(vm.dataSpace * (i - 0.5), (vm.areaMax - close[i - 1]) * vm.areaPixel)
    lastLineBackground.bezierCurveTo(cx1, cy1, cx2, cy2, x, y)
    lastLineBackground.lineTo(vm.dataSpace * (i + 0.5), (vm.areaMax - vm.areaMin) * vm.areaPixel + vm.dataPaddingY * 2)

    vm.areaLineContainer.addChild(lastLine)
    vm.areaBackgroundContainer.addChild(lastLineBackground)

    // area mask
    vm.areaMask = new PIXI.Graphics()
    vm.areaMask.beginFill(0x000000)
    vm.areaMask.drawRect(0, vm.mainContainerHeight / 11, vm.appWidth - vm.chartMaskRightSpace, vm.mainContainerHeight * 8 / 11)
    vm.areaContainer.mask = vm.areaMask

    // area line mask
    vm.areaLineMask = new PIXI.Graphics()
    vm.areaLineMask.beginFill(0x000000)
    vm.areaLineMask.drawRect(0, vm.mainContainerHeight / 11 + vm.dataPaddingY, vm.appWidth - vm.chartMaskRightSpace, vm.mainContainerHeight * 8 / 11 + vm.dataPaddingY * 2)
    vm.areaLineContainer.mask = vm.areaLineMask

    // area background mask
    vm.areaBackground = new PIXI.Graphics()
    vm.areaBackground.beginTextureFill({ texture: vm.gradient(vm.option.area.background[0], vm.option.area.background[1], vm.mainContainerHeight * 9 / 11) })
    vm.areaBackground.drawRect(0, vm.mainContainerHeight / 11 + vm.dataPaddingY, vm.appWidth - vm.chartMaskRightSpace, vm.topHeight - vm.dataPaddingY)
    vm.areaBackground.endFill()
    vm.areaBackground.mask = vm.areaBackgroundContainer
    vm.topContainer.addChild(vm.areaBackground)

    // bottom MA container
    vm.bottomMAContainer = new PIXI.Container()
    vm.bottomContainer.addChild(vm.bottomMAContainer)
    vm.bottomMAContainer.position.set(8, vm.mainContainerHeight * 9 / 11 + 8)

    // label & num
    const BottomMAText = ['VOL']
    for (let i = 0; i < 1; i++) {
      const label = new PIXI.Text(`${BottomMAText[i]}:`, {
        fill: vm.option.bottomMA.color,
        fontSize: 10
      })
      if (i > 0) {
        label.position.x = vm.bottomMAContainer.width + 10
      } else {
        label.position.x = vm.bottomMAContainer.width
      }
      vm.bottomMAContainer.addChild(label)

      const num = new PIXI.Text(tradeData[tradeData.length - 1], {
        fill: vm.option.bottomMA.color,
        fontSize: 10
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
      const trade = new PIXI.Graphics()
      const tradeHeight = (tradeData[i] - vm.tradeMin) * vm.tradePixel + 2

      trade.beginFill(vm.option.trade.lineColor)
      trade.drawRect(0, 0, 1, 1)
      trade.position.x = vm.dataSpace * (i + 0.5)
      trade.height = -tradeHeight
      vm.tradeContainer.addChild(trade)
    }

    // tradeContainer mask
    vm.tradeMask = new PIXI.Graphics()
    vm.tradeMask.beginFill(0xff0000)
    vm.tradeMask.drawRect(0, vm.mainContainerHeight / 11 * 10 - 10, vm.appWidth - vm.chartMaskRightSpace + vm.dataSpace * 0.5, vm.mainContainerHeight / 11 + 10)
    vm.tradeMask.endFill()
    vm.tradeContainer.mask = vm.tradeMask
    vm.app.stage.addChild(vm.tradeMask)

    // line Point
    vm.linePoint = new PIXI.Container()
    vm.areaContainer.addChild(vm.linePoint)

    const point = new PIXI.Graphics()
    point.beginFill(0xffffff)
    point.drawCircle(0, 0, 2)

    const pointBG = new PIXI.Graphics()
    pointBG.beginFill(0xffffff)
    pointBG.drawCircle(0, 0, 5)
    pointBG.filters = [new PIXI.filters.BlurFilter(10, 10, 1)]
    vm.linePoint.addChild(point, pointBG)

    if (!vm.app.renderer.options.forceCanvas) {
      gsap.to(pointBG, { alpha: 0, duration: 1, ease: 'none', yoyo: true, repeat: -1 })
    } else {
      pointBG.alpha = 0
    }

    // focus point
    vm.focusPoint = new PIXI.Graphics()
    vm.focusPoint.beginFill(0xffffff)
    vm.focusPoint.drawCircle(0, 0, 1)
    vm.focusPoint.width = 0
    vm.focusPoint.height = 0
    vm.app.stage.addChild(vm.focusPoint)

    // focus mask
    vm.linePoint.mask = vm.areaMask

    // focus line
    vm.focusLine = new PIXI.Graphics()
    vm.focusLine.beginTextureFill({ texture: vm.gradient('rgba(255, 255, 255, 0.01)', 'rgba(255, 255, 255, 0.3)', vm.mainContainerHeight) })
    vm.focusLine.drawRect(0, 0, 2, vm.mainContainerHeight)
    vm.app.stage.addChild(vm.focusLine)

    // focus splitline label
    vm.focusSplitContainer = new PIXI.Container()
    vm.app.stage.addChild(vm.focusSplitContainer)
    const value = chartData[0][0] / 10000000
    // const text = value < 10 ? value < 1 ? value.toFixed(4) : value.toFixed(3) : value.toFixed(2)
    const text = value.toFixed(vm.fixNum)

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
    vm.tapLine.lineTo(vm.appWidth, 0)

    vm.focusSplitContainer.addChild(vm.tapLine, vm.focusSplitBackground, vm.focusSplitLabel)

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
    vm.priceAllLabel = new PIXI.Text('0000.00', {
      fill: vm.option.nowPrice.all.color,
      fontSize: 10
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

    // 預設
    // vm.areaContainer.position.x = -(chartData.length) * vm.dataSpace + Math.floor((vm.appWidth - vm.dataSpace * 3) / vm.dataSpace) * vm.dataSpace
    // vm.tradeContainer.position.x = -(chartData.length) * vm.dataSpace + Math.floor((vm.appWidth - vm.dataSpace * 3) / vm.dataSpace) * vm.dataSpace
    if (chartData.length * vm.dataSpace + vm.chartRightSpace > vm.appWidth) {
      vm.areaContainer.position.x = -(chartData.length) * vm.dataSpace + Math.floor((vm.appWidth - vm.chartRightSpace) / vm.dataSpace) * vm.dataSpace
      vm.tradeContainer.position.x = -(chartData.length) * vm.dataSpace + Math.floor((vm.appWidth - vm.chartRightSpace) / vm.dataSpace) * vm.dataSpace
    }

    if (vm.appWidth < 768) {
      vm.focusLine.width = vm.dataSpace / 4
    }

    vm.priceAllContainer.alpha = 0
    vm.focusLine.alpha = 0
    vm.focusSplitContainer.alpha = 0

    // vm.focusLine.alpha = 0
    await vm.getDataIndex(chartData, tradeData)
    vm.getSplitData()
    vm.resizeHeight()
    vm.getPricePosY(chartData)
    vm.pointsPosXY(chartData)

    vm.app.start()

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
    const posX = Math.min(0, Math.max(offsetMax, -(vm.firstIndex * vm.dataSpace * vm.scaleX)))

    vm.areaContainer.scale.x = vm.scaleX
    vm.tradeContainer.scale.x = vm.scaleX

    vm.areaContainer.position.x = posX
    vm.tradeContainer.position.x = posX

    vm.areaMask.width = vm.appWidth - vm.chartMaskRightSpace * vm.scaleX
    vm.tradeMask.width = vm.appWidth - vm.chartMaskRightSpace * vm.scaleX


    if (vm.appWidth < 768) {
      vm.focusLine.width = vm.dataSpace / 4 * vm.scaleX
    } else {
      vm.focusLine.width = 2 * vm.scaleX
    }
    vm.focusLine.alpha = 0
    vm.focusSplitContainer.alpha = 0

    vm.focusPoint.width = 0
    vm.focusPoint.height = 0

    await vm.getDataIndex(chartData, tradeData)
    vm.getSplitData()
    vm.resizeHeight()
    vm.getPricePosY(chartData)
    vm.pointsPosXY(chartData)
  }

  async computerOnMove(event, chartData, tradeData) {
    // console.log(event.pageX, event.pageY)
    const vm = this
    const targetX = event.pageX

    const areaContainerOffset = vm.areaContainer.position.x
    const tapObject = Math.abs(parseInt((areaContainerOffset - targetX) / (vm.dataSpace * vm.scaleX)))
    const focusLineOffset = (tapObject - vm.firstIndex) * vm.dataSpace * vm.scaleX

    if (chartData[tapObject]) {
      await vm.getDataIndex(chartData, tradeData)
      const value = chartData[tapObject][0] / 10000000
      // const tapValue = value < 10 ? value < 1 ? value.toFixed(4) : value.toFixed(3) : value.toFixed(2)
      const tapValue = value.toFixed(3)
      const tapPixel = vm.dataHeight / (vm.areaMaxData - vm.areaMinData)
      const tapPosY = (vm.areaMaxData - tapValue) * tapPixel + vm.mainContainerHeight / 11 + vm.dataPaddingY

      if (vm.appWidth < 768) {
        vm.focusLine.position.x = focusLineOffset + vm.dataSpace * vm.scaleX / 4 + 1 * vm.scaleX
      } else {
        vm.focusLine.position.x = focusLineOffset + vm.dataSpace * vm.scaleX / 2 - 0.5 * vm.scaleX
      }
      vm.focusLine.alpha = 1

      vm.focusSplitLabel.text = tapValue
      vm.focusSplitContainer.position.y = tapPosY
      vm.focusSplitContainer.alpha = 1

      vm.focusPoint.width = 3.5 * vm.scaleX
      vm.focusPoint.height = 3.5 * vm.scaleX

      vm.focusPoint.position.set(focusLineOffset + vm.dataSpace * vm.scaleX / 2 + 0.7 * vm.scaleX, tapPosY)
      vm.bottomMAContainer.children[1].text = tradeData[tapObject]
    } else {
      vm.focusLine.alpha = 0
      vm.focusSplitContainer.alpha = 0

      vm.focusPoint.width = 0
      vm.focusPoint.height = 0
    }
  }

  async computerOnOut() {
    const vm = this
    vm.focusLine.alpha = 0
    vm.focusSplitContainer.alpha = 0

    vm.focusPoint.width = 0
    vm.focusPoint.height = 0
  }

  async hammerOnTap(event, chartData, tradeData) {
    // 點擊位置 -> X座標
    const vm = this
    const targetX = event.changedPointers[0].offsetX
    const targetY = event.changedPointers[0].globalY || event.changedPointers[0].offsetY

    const areaContainerOffset = vm.areaContainer.position.x
    const tapObject = Math.abs(parseInt((areaContainerOffset - targetX) / (vm.dataSpace * vm.scaleX)))
    // const focusLineOffset = Math.floor(targetX / (vm.dataSpace * vm.scaleX)) * vm.dataSpace * vm.scaleX

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
      vm.areaContainer.position.x = offsetMax
      vm.tradeContainer.position.x = offsetMax

      vm.focusLine.alpha = 0
      vm.focusSplitContainer.alpha = 0

      vm.focusPoint.width = 0
      vm.focusPoint.height = 0

      await vm.getDataIndex(chartData, tradeData)
      vm.getSplitData()
      vm.resizeHeight()
      vm.getPricePosY(chartData)
      vm.pointsPosXY(chartData)
    } else if (targetX < vm.appWidth - vm.dataSpace * 2 * vm.scaleX && targetY < vm.mainContainerHeight) {
      if (chartData[tapObject]) {
        await vm.getDataIndex(chartData, tradeData)
        const tapValue = chartData[tapObject][0]
        const tapPixel = vm.dataHeight / (vm.areaMaxData - vm.areaMinData)
        const tapPosY = (vm.areaMaxData - tapValue) * tapPixel + vm.mainContainerHeight / 11 + vm.dataPaddingY

        if (vm.appWidth < 768) {
          vm.focusLine.position.x = focusLineOffset + vm.dataSpace * vm.scaleX / 4 + 1 * vm.scaleX
        } else {
          vm.focusLine.position.x = focusLineOffset + vm.dataSpace * vm.scaleX / 2 - 0.5 * vm.scaleX
        }
        vm.focusLine.alpha = 1

        vm.focusSplitLabel.text = (tapValue / 10000000).toFixed(vm.fixNum)
        vm.focusSplitContainer.position.y = tapPosY
        vm.focusSplitContainer.alpha = 1

        gsap.fromTo(vm.focusPoint, { width: 0, height: 0 }, { width: 3.5 * vm.scaleX, height: 3.5 * vm.scaleX, duration: 0.3 })

        vm.focusPoint.position.set(focusLineOffset + vm.dataSpace * vm.scaleX / 2 + 0.7 * vm.scaleX, tapPosY)
        vm.bottomMAContainer.children[1].text = tradeData[tapObject]
      } else {
        vm.focusLine.alpha = 0
        vm.focusSplitContainer.alpha = 0

        vm.focusPoint.width = 0
        vm.focusPoint.height = 0
      }
    } else {
      vm.focusLine.alpha = 0
      vm.focusSplitContainer.alpha = 0

      vm.focusPoint.width = 0
      vm.focusPoint.height = 0
    }
  }

  async hammerOnPanStart(event) {
    const vm = this
    vm.event.originPoint = vm.areaContainer.position.x
    vm.event.originOffset = event.changedPointers[0].clientX

    vm.moving = true

    if (vm.resizeHeightAnimation1) {
      vm.resizeHeightAnimation1.kill()
      vm.resizeHeightAnimation2.kill()
      vm.resizeHeightAnimation3.kill()
      vm.resizeHeightAnimation4.kill()
    }
  }

  async hammerOnPanMove(event, chartData, tradeData) {
    const vm = this
    const pageX = event.changedPointers[0].pageX
    const offsetMax = -(chartData.length) * vm.dataSpace * vm.scaleX + Math.floor((vm.appWidth - vm.chartRightSpace) / (vm.dataSpace * vm.scaleX)) * vm.dataSpace * vm.scaleX
    const areaOffset = vm.event.originPoint + pageX - vm.event.originOffset
    const canvasOffset = Math.min(0, Math.max(offsetMax, Math.floor(areaOffset / (vm.dataSpace * vm.scaleX)) * vm.dataSpace * vm.scaleX))

    if (vm.areaContainer.position.x !== canvasOffset) {
      vm.areaContainer.position.x = canvasOffset
      vm.tradeContainer.position.x = canvasOffset

      await vm.getDataIndex(chartData, tradeData)
      vm.getSplitData()
      vm.resizeHeight()
      vm.getPricePosY(chartData)
      vm.pointsPosXY(chartData)

      vm.focusLine.alpha = 0
      vm.focusSplitContainer.alpha = 0

      vm.focusPoint.width = 0
      vm.focusPoint.height = 0
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
    }

    vm.hammer.touch1 = event.pointers[0].clientX
    vm.hammer.touch2 = event.pointers[1].clientX
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

    vm.areaContainer.scale.x = vm.scaleX
    vm.tradeContainer.scale.x = vm.scaleX

    vm.areaContainer.position.x = posX
    vm.tradeContainer.position.x = posX

    // console.log(touchGap)

    vm.areaMask.width = vm.appWidth - vm.chartMaskRightSpace * vm.scaleX
    vm.tradeMask.width = vm.appWidth - vm.chartMaskRightSpace * vm.scaleX

    vm.focusLine.width = vm.dataWidth * 2 * vm.scaleX

    vm.hammer.move1 = event.pointers[0].clientX
    vm.hammer.move2 = event.pointers[1].clientX

    vm.focusLine.alpha = 0
    vm.focusSplitContainer.alpha = 0

    vm.focusPoint.width = 0
    vm.focusPoint.height = 0

    await vm.getDataIndex(chartData, tradeData)
    vm.getSplitData()
    vm.resizeHeight()
    vm.getPricePosY(chartData)
    vm.pointsPosXY(chartData)
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
        chartPosX = vm.areaContainer.position.x
      }
      vm.firstIndex = Math.max(0, Math.floor(Math.ceil(Math.abs(chartPosX)) / (vm.dataSpace * vm.scaleX)))
      vm.lastIndex = Math.min(chartData.length, -Math.floor((chartPosX - vm.appWidth + vm.chartMaskRightSpace * vm.scaleX) / (vm.dataSpace * vm.scaleX)))

      // area
      vm.areaCurrectData = chartData.slice(vm.firstIndex, vm.lastIndex)
      const data = vm.areaCurrectData.map(item => item[0])
      vm.areaMaxData = Math.max(...data)
      vm.areaMinData = Math.min(...data)

      // trade
      vm.tradeCurrectData = tradeData.slice(vm.firstIndex, vm.lastIndex)
      vm.tradeMaxData = Math.max(...vm.tradeCurrectData)
      vm.tradeMinData = Math.min(...vm.tradeCurrectData)

      resolve()
    })
  }

  getSplitData() {
    const vm = this
    const yChildren = vm.ySplitLabelContainer.children

    const yText_1 = vm.areaMaxData
    const yText_2 = (vm.areaMaxData * 3 / 4 + vm.areaMinData / 4)
    const yText_3 = ((vm.areaMaxData + vm.areaMinData) / 2)
    const yText_4 = (vm.areaMaxData / 4 + vm.areaMinData * 3 / 4)
    const yText_5 = vm.areaMinData

    yChildren[0].text = (yText_1 / 10000000).toFixed(vm.fixNum)
    yChildren[1].text = (yText_2 / 10000000).toFixed(vm.fixNum)
    yChildren[2].text = (yText_3 / 10000000).toFixed(vm.fixNum)
    yChildren[3].text = (yText_4 / 10000000).toFixed(vm.fixNum)
    yChildren[4].text = (yText_5 / 10000000).toFixed(vm.fixNum)

    // yChildren[0].text = yText_1 < 10 ? yText_1 < 1 ? yText_1.toFixed(4) : yText_1.toFixed(3) : yText_1.toFixed(2)
    // yChildren[1].text = yText_2 < 10 ? yText_2 < 1 ? yText_2.toFixed(4) : yText_2.toFixed(3) : yText_2.toFixed(2)
    // yChildren[2].text = yText_3 < 10 ? yText_3 < 1 ? yText_3.toFixed(4) : yText_3.toFixed(3) : yText_3.toFixed(2)
    // yChildren[3].text = yText_4 < 10 ? yText_4 < 1 ? yText_4.toFixed(4) : yText_4.toFixed(3) : yText_4.toFixed(2)
    // yChildren[4].text = yText_5 < 10 ? yText_5 < 1 ? yText_5.toFixed(4) : yText_5.toFixed(3) : yText_5.toFixed(2)

    yChildren.forEach(item => {
      item.position.x = vm.appWidth - item.width - 2
    })
    // xLabel
    const time = vm.areaCurrectData.map(item => {
      if (parseInt(vm.wsOption.type) === '0') {
        return moment.unix(item[1]).format('mm:ss')
      } else if (parseInt(vm.wsOption.type) < 4) {
        return moment.unix(item[1]).format('HH:mm')
      } else if (parseInt(vm.wsOption.type) < 8) {
        return moment.unix(item[1]).format('MM-DD HH:mm')
      } else {
        return moment.unix(item[1]).format('YYYY  MM-DD')
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

    // areaData
    vm.areaScaleY = (vm.areaMax - vm.areaMin) / (vm.areaMaxData - vm.areaMinData)
    const areaMaxGap = vm.areaMax - vm.areaMaxData
    const areaPosY = vm.mainContainerHeight / 11 - (areaMaxGap * vm.areaPixel) * vm.areaScaleY + vm.dataPaddingY

    vm.areaContainer.scale.y = vm.areaScaleY
    vm.areaContainer.position.y = areaPosY

    // tradeData
    vm.tradeScaleY = (vm.tradeMax - vm.tradeMin) / (vm.tradeMaxData - vm.tradeMinData)
    const tradePosY = Math.max(0, (vm.tradeMinData - vm.tradeMin) * vm.tradePixel * vm.tradeScaleY)

    vm.tradeContainer.scale.y = vm.tradeScaleY
    vm.tradeContainer.position.y = vm.mainContainerHeight + tradePosY
  }

  resizeHeightAnimate() {
    // areaData
    const vm = this
    const areaScaleY = (vm.areaMax - vm.areaMin) / (vm.areaMaxData - vm.areaMinData)
    const areaMaxGap = vm.areaMax - vm.areaMaxData
    vm.areaScaleY = areaScaleY

    const areaPosY = vm.mainContainerHeight / 11 - (areaMaxGap * vm.areaPixel) * areaScaleY + vm.dataPaddingY
    vm.resizeHeightAnimation1 = gsap.to(vm.areaContainer, { y: areaPosY, duration: 0.3 })
    vm.resizeHeightAnimation2 = gsap.to(vm.areaContainer.scale, { y: areaScaleY, duration: 0.3 })

    // tradeData
    vm.tradeScaleY = (vm.tradeMax - vm.tradeMin) / (vm.tradeMaxData - vm.tradeMinData)
    const tradePosY = Math.max(0, (vm.tradeMinData - vm.tradeMin) * vm.tradePixel * vm.tradeScaleY)

    vm.resizeHeightAnimation3 = gsap.to(vm.tradeContainer.scale, { y: vm.tradeScaleY, duration: 0.3 })
    vm.resizeHeightAnimation4 = gsap.to(vm.tradeContainer, { y: vm.mainContainerHeight + tradePosY, duration: 0.3 })
  }

  getPricePosY(chartData) {
    const vm = this

    // 讀入NowPrice && 調整長度
    const NowPriceRightPosition = (vm.areaCurrectData.length - 0.5) * vm.dataSpace * vm.scaleX
    const value = parseFloat(chartData[chartData.length - 1][0])
    // const nowprice = value < 10 ? value < 1 ? value.toFixed(4) : value.toFixed(3) : value.toFixed(2)
    const nowprice = value / 10000000
    vm.priceRightContainer.children[2].text = nowprice.toFixed(vm.fixNum)
    vm.priceAllContainer.children[4].text = nowprice.toFixed(vm.fixNum)
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
      vm.priceRightContainer.children[1].position.x = vm.appWidth - NowPriceRightPosition - vm.priceRightContainer.children[1].width
      vm.priceRightContainer.children[2].position.x = vm.appWidth - NowPriceRightPosition - vm.priceRightContainer.children[2].width - 2
      // nowPrice alpha
      vm.priceRightContainer.alpha = 1
      vm.priceAllContainer.alpha = 0
    }

    // now price
    const nowPrice = value
    const nowPricePixel = vm.dataHeight / (vm.areaMaxData - vm.areaMinData)
    const nowPricePosY = vm.mainContainerHeight / 11 + (vm.areaMaxData - nowPrice) * nowPricePixel + 2.5
    const PosY = Math.min(vm.mainContainerHeight * 9 / 11 - vm.priceRightContainer.height / 2, Math.max(vm.mainContainerHeight / 11 - vm.priceRightContainer.height / 2, nowPricePosY))
    vm.priceRightContainer.position.y = PosY
    vm.priceAllContainer.position.y = PosY
  }

  getPricePosYAnimate(chartData) {
    const vm = this

    // 讀入NowPrice && 調整長度
    const NowPriceRightPosition = (vm.areaCurrectData.length - 0.5) * vm.dataSpace * vm.scaleX
    const value = parseFloat(chartData[chartData.length - 1][0])
    // const nowprice = value < 10 ? value < 1 ? value.toFixed(4) : value.toFixed(3) : value.toFixed(2)
    const nowprice = value / 10000000
    vm.priceRightContainer.children[2].text = nowprice.toFixed(vm.fixNum)
    vm.priceAllContainer.children[4].text = nowprice.toFixed(vm.fixNum)
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
      vm.priceRightContainer.children[1].position.x = vm.appWidth - NowPriceRightPosition - vm.priceRightContainer.children[1].width
      vm.priceRightContainer.children[2].position.x = vm.appWidth - NowPriceRightPosition - vm.priceRightContainer.children[2].width - 2
      // nowPrice alpha
      vm.priceRightContainer.alpha = 1
      vm.priceAllContainer.alpha = 0
    }

    // now price
    const nowPrice = value
    const nowPricePixel = vm.dataHeight / (vm.areaMaxData - vm.areaMinData)
    const nowPricePosY = vm.mainContainerHeight / 11 + (vm.areaMaxData - nowPrice) * nowPricePixel + 2.5
    const PosY = Math.min(vm.mainContainerHeight * 9 / 11 - vm.priceRightContainer.height / 2, Math.max(vm.mainContainerHeight / 11 - vm.priceRightContainer.height / 2, nowPricePosY))
    gsap.to(vm.priceRightContainer, { y: PosY, duration: 0.3 })
    gsap.to(vm.priceAllContainer, { y: PosY, duration: 0.3 })
  }

  pointsPosXY(chartData) {
    const vm = this
    const i = chartData.length - 1
    const close = chartData.map(item => item[0])
    const value = close[close.length - 1]
    const posX = (i + 0.5) * vm.dataSpace
    const posY = (vm.areaMax - value) * vm.areaPixel

    vm.linePoint.children[0].width = 4 / vm.scaleX
    vm.linePoint.children[0].height = 4 / vm.areaScaleY
    vm.linePoint.children[1].width = 10 / vm.scaleX
    vm.linePoint.children[1].height = 10 / vm.areaScaleY

    vm.linePoint.position.set(posX, posY)
  }

  pointsAnimate(chartData) {
    const vm = this
    const i = chartData.length - 1
    const close = chartData.map(item => item[0])
    const value = close[close.length - 1]
    const posX = (i + 0.5) * vm.dataSpace
    const posY = (vm.areaMax - value) * vm.areaPixel

    vm.linePoint.children[0].width = 4 / vm.scaleX
    vm.linePoint.children[0].height = 4 / vm.areaScaleY
    vm.linePoint.children[1].width = 10 / vm.scaleX
    vm.linePoint.children[1].height = 10 / vm.areaScaleY

    gsap.to(vm.linePoint, { x: posX, y: posY, duration: 0.3 })
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

    const grd = ctx.createLinearGradient(0, 0, 0, height)
    grd.addColorStop(0, from)
    grd.addColorStop(1, to)

    ctx.fillStyle = grd
    ctx.fillRect(0, 0, 1, height)

    return PIXI.Texture.from(canvas)
  }

  async updateRealtime(chartData, tradeData, i) {
    // console.log('realtime')
    const vm = this
    const close = chartData.map(item => item[0])
    const max = Math.max(...close)
    const min = Math.min(...close)

    if (min < vm.area.min) {
      vm.redrawChart(chartData)
    }

    const lastLine = vm.areaLineContainer.children[vm.areaLineContainer.children.length - 1]
    const lastBackground = vm.areaBackgroundContainer.children[vm.areaBackgroundContainer.children.length - 1]
    vm.animation = gsap.to(vm.points.lineTo, {
      cx1: vm.dataSpace * i,
      cx2: vm.dataSpace * i,
      cy1: (vm.areaMax - (close[i - 1] * 3 + close[i]) / 4) * vm.areaPixel,
      cy2: (vm.areaMax - (close[i - 1] + close[i] * 3) / 4) * vm.areaPixel,
      x: vm.dataSpace * (i + 0.5),
      y: (vm.areaMax - close[i]) * vm.areaPixel,
      duration: 0.3,
      onUpdate: function () {
        lastLine.clear()
        lastLine.lineStyle(0.5, vm.option.area.lineColor, 1, 0.5, true)
        lastLine.moveTo(vm.points.moveTo.x, vm.points.moveTo.y)
        lastLine.bezierCurveTo(
          vm.points.lineTo.cx1,
          vm.points.lineTo.cy1,
          vm.points.lineTo.cx2,
          vm.points.lineTo.cy2,
          vm.points.lineTo.x,
          vm.points.lineTo.y
        )

        lastBackground.clear()
        lastBackground.beginFill(0x000000)
        lastBackground.moveTo(vm.points.moveTo.x, (max - min) * vm.areaPixel + vm.dataPaddingY * 4)
        lastBackground.lineTo(vm.points.moveTo.x, vm.points.moveTo.y)
        lastBackground.bezierCurveTo(
          vm.points.lineTo.cx1,
          vm.points.lineTo.cy1,
          vm.points.lineTo.cx2,
          vm.points.lineTo.cy2,
          vm.points.lineTo.x,
          vm.points.lineTo.y
        )
        lastBackground.lineTo(vm.points.lineTo.x, (max - min) * vm.areaPixel + vm.dataPaddingY * 4)
      }
    })

    const lastTrade = vm.tradeContainer.children[vm.tradeContainer.children.length - 1]
    const tradeHeight = (tradeData[i] - vm.tradeMin) * vm.tradePixel + 2

    vm.animation2 = gsap.to(lastTrade, { height: -tradeHeight, duration: 0.3 })

    await vm.getDataIndex(chartData, tradeData)
    vm.getRealTimeMAValue(tradeData)
    vm.getSplitData()
    if (!vm.moving) {
      vm.resizeHeightAnimate()
    }
    vm.getPricePosYAnimate(chartData)
    vm.pointsAnimate(chartData)
  }

  async updateNewData(chartData, tradeData, i) {
    const vm = this
    const close = chartData.map(item => item[0])
    const max = Math.max(...close)
    const min = Math.min(...close)

    const points = {
      moveTo: {
        x: vm.dataSpace * (i - 0.5),
        y: (vm.areaMax - close[i - 1]) * vm.areaPixel
      },
      lineTo: {
        cx1: vm.dataSpace * (i - 0.5),
        cx2: vm.dataSpace * (i - 0.5),
        cy1: (vm.areaMax - close[i - 1]) * vm.areaPixel,
        cy2: (vm.areaMax - close[i - 1]) * vm.areaPixel,
        x: vm.dataSpace * (i - 0.5),
        y: (vm.areaMax - close[i - 1]) * vm.areaPixel
      }
    }

    if (min < vm.area.min) {
      vm.redrawChart(chartData)
    }

    const line = new PIXI.Graphics()
    const lineBackground = new PIXI.Graphics()

    vm.areaLineContainer.addChild(line)
    vm.areaBackgroundContainer.addChild(lineBackground)

    gsap.to(points.lineTo, {
      cx1: vm.dataSpace * i,
      cx2: vm.dataSpace * i,
      cy1: (vm.areaMax - (close[i - 1] * 3 + close[i]) / 4) * vm.areaPixel,
      cy2: (vm.areaMax - (close[i - 1] + close[i] * 3) / 4) * vm.areaPixel,
      x: vm.dataSpace * (i + 0.5),
      y: (vm.areaMax - close[i]) * vm.areaPixel,
      duration: 0.3,
      onUpdate: function () {
        line.clear()
        line.lineStyle(0.5, vm.option.area.lineColor, 1, 0.5, true)
        line.moveTo(vm.dataSpace * (i - 0.5), (vm.areaMax - close[i - 1]) * vm.areaPixel)
        line.bezierCurveTo(
          points.lineTo.cx1,
          points.lineTo.cy1,
          points.lineTo.cx2,
          points.lineTo.cy2,
          points.lineTo.x,
          points.lineTo.y
        )

        lineBackground.clear()
        lineBackground.beginFill(0x000000)
        lineBackground.moveTo(vm.dataSpace * (i - 0.5), (max - min) * vm.areaPixel + vm.dataPaddingY * 4)
        lineBackground.lineTo(vm.dataSpace * (i - 0.5), (vm.areaMax - close[i - 1]) * vm.areaPixel)
        lineBackground.bezierCurveTo(
          points.lineTo.cx1,
          points.lineTo.cy1,
          points.lineTo.cx2,
          points.lineTo.cy2,
          points.lineTo.x,
          points.lineTo.y
        )
        lineBackground.lineTo(points.lineTo.x, (vm.areaMax - min) * vm.areaPixel + vm.dataPaddingY * 4)
      },
      onComplete: function () {
        vm.points = points
      }
    })

    // trade
    const trade = new PIXI.Graphics()
    const tradeHeight = (tradeData[i] - vm.tradeMin) * vm.tradePixel + 2

    trade.beginFill(vm.option.trade.lineColor)
    trade.drawRect(0, 0, 1, 1)
    trade.position.x = vm.dataSpace * (i + 0.5)

    gsap.to(trade, { height: -tradeHeight, duration: 0.3 })

    vm.tradeContainer.addChild(trade)

    // change areaContainer position x
    const areaPosX = vm.areaContainer.position.x
    const maxDataLength = Math.ceil(vm.appWidth / (vm.dataSpace * vm.scaleX))
    const offsetMax = -(chartData.length) * vm.dataSpace * vm.scaleX + Math.floor((vm.appWidth - vm.chartRightSpace) / (vm.dataSpace * vm.scaleX)) * vm.dataSpace * vm.scaleX

    if (areaPosX - offsetMax <= vm.dataSpace * 2 * vm.scaleX && vm.dataSpace * chartData.length * vm.scaleX > vm.appWidth) {
      gsap.to(vm.areaContainer, {
        x: offsetMax,
        duration: 0.3
      })
      gsap.to(vm.tradeContainer, { x: offsetMax, duration: 0.3 })

      await vm.getDataIndex(chartData, tradeData, offsetMax)
    } else {
      await vm.getDataIndex(chartData, tradeData)
    }

    vm.getSplitData()
    if (!vm.moving) {
      vm.resizeHeightAnimate()
    }
    vm.getPricePosYAnimate(chartData)
    vm.pointsAnimate(chartData)
  }

  redrawChart(chartData) {
    const vm = this
    const close = chartData.map(item => item[0])
    vm.area = {
      min: Math.min(...close),
      max: Math.max(...close)
    }

    const promise = new Promise(resolve => {
      const lineLength = vm.areaLineContainer.children.length - 1
      const backgroundLength = vm.areaBackgroundContainer.children.length - 1
      const tradeLength = vm.tradeContainer.children.length - 1

      for (let i = 0; i < lineLength; i++) {
        vm.areaLineContainer.children[0].destroy(true)
      }

      for (let i = 0; i < backgroundLength; i++) {
        vm.areaBackgroundContainer.children[0].destroy(true)
      }
      resolve()
    })

    promise.then(() => {
      const line = new PIXI.Graphics()

      line.lineStyle(0.5, vm.option.area.lineColor, 1, 0.5, true)
      line.moveTo(0, (vm.areaMax - close[0]) * vm.areaPixel)

      for (let i = 1; i < chartData.length - 1; i++) {
        const cx1 = vm.dataSpace * i
        const cx2 = vm.dataSpace * i
        const cy1 = (vm.areaMax - (close[i - 1] * 3 + close[i]) / 4) * vm.areaPixel
        const cy2 = (vm.areaMax - (close[i - 1] + close[i] * 3) / 4) * vm.areaPixel
        const x = vm.dataSpace * (i + 0.5)
        const y = (vm.areaMax - close[i]) * vm.areaPixel

        line.bezierCurveTo(cx1, cy1, cx2, cy2, x, y)
      }

      vm.areaLineContainer.addChildAt(line, 0)

      const lineBackground = new PIXI.Graphics()

      lineBackground.beginFill(0x000000)
      lineBackground.moveTo(0, (vm.area.max - vm.area.min) * vm.areaPixel + vm.dataPaddingY * 4)
      lineBackground.lineTo(0, (vm.areaMax - close[0]) * vm.areaPixel)
      for (let i = 1; i < chartData.length - 1; i++) {
        const cx1 = vm.dataSpace * i
        const cx2 = vm.dataSpace * i
        const cy1 = (vm.areaMax - (close[i - 1] * 3 + close[i]) / 4) * vm.areaPixel
        const cy2 = (vm.areaMax - (close[i - 1] + close[i] * 3) / 4) * vm.areaPixel
        const x = vm.dataSpace * (i + 0.5)
        const y = (vm.areaMax - close[i]) * vm.areaPixel

        lineBackground.bezierCurveTo(cx1, cy1, cx2, cy2, x, y)
      }
      lineBackground.lineTo(vm.dataSpace * (chartData.length - 1.5), (vm.area.max - vm.area.min) * vm.areaPixel + vm.dataPaddingY * 4)

      vm.areaBackgroundContainer.addChildAt(lineBackground, 0)
    })
  }

  async updateRealtimeTab(chartData, tradeData, i) {
    // console.log('realtime')
    const vm = this
    const close = chartData.map(item => item[0])
    const max = Math.max(...close)
    const min = Math.min(...close)

    const lastLine = vm.areaLineContainer.children[vm.areaLineContainer.children.length - 1]
    const lastBackground = vm.areaBackgroundContainer.children[vm.areaBackgroundContainer.children.length - 1]

    vm.points.lineTo = {
      cx1: vm.dataSpace * i,
      cx2: vm.dataSpace * i,
      cy1: (vm.areaMax - (close[i - 1] * 3 + close[i]) / 4) * vm.areaPixel,
      cy2: (vm.areaMax - (close[i - 1] + close[i] * 3) / 4) * vm.areaPixel,
      x: vm.dataSpace * (i + 0.5),
      y: (vm.areaMax - close[i]) * vm.areaPixel
    }

    lastLine.clear()
    lastLine.lineStyle(0.5, vm.option.area.lineColor, 1, 0.5, true)
    lastLine.moveTo(vm.points.moveTo.x, vm.points.moveTo.y)
    lastLine.bezierCurveTo(
      vm.points.lineTo.cx1,
      vm.points.lineTo.cy1,
      vm.points.lineTo.cx2,
      vm.points.lineTo.cy2,
      vm.points.lineTo.x,
      vm.points.lineTo.y
    )

    lastBackground.clear()
    lastBackground.beginFill(0x000000)
    lastBackground.moveTo(vm.points.moveTo.x, (max - min) * vm.areaPixel + vm.dataPaddingY * 4)
    lastBackground.lineTo(vm.points.moveTo.x, vm.points.moveTo.y)
    lastBackground.bezierCurveTo(
      vm.points.lineTo.cx1,
      vm.points.lineTo.cy1,
      vm.points.lineTo.cx2,
      vm.points.lineTo.cy2,
      vm.points.lineTo.x,
      vm.points.lineTo.y
    )
    lastBackground.lineTo(vm.points.lineTo.x, (max - min) * vm.areaPixel + vm.dataPaddingY * 4)

    // trade
    const lastTrade = vm.tradeContainer.children[vm.tradeContainer.children.length - 1]
    const tradeHeight = (tradeData[i] - vm.tradeMin) * vm.tradePixel + 2

    lastTrade.height = -tradeHeight

    vm.getDataIndex(chartData, tradeData)
    vm.getSplitData()
    vm.resizeHeight()
    vm.getPricePosY(chartData)
    vm.pointsPosXY(chartData)
  }

  async updateNewDataTab(chartData, tradeData, i) {
    // console.log('newdata')
    const vm = this

    vm.loading = true

    const line = new PIXI.Graphics()
    const background = new PIXI.Graphics()
    const close = chartData.map(item => item[0])

    const cx1 = vm.dataSpace * i
    const cx2 = vm.dataSpace * i
    const cy1 = (vm.areaMax - (close[i - 1] * 3 + close[i]) / 4) * vm.areaPixel
    const cy2 = (vm.areaMax - (close[i - 1] + close[i] * 3) / 4) * vm.areaPixel
    const x = vm.dataSpace * (i + 0.5)
    const y = (vm.areaMax - close[i]) * vm.areaPixel

    vm.points = {
      moveTo: {
        x: vm.dataSpace * (i - 0.5),
        y: (vm.areaMax - close[i - 1]) * vm.areaPixel
      },
      lineTo: {
        cx1: cx1,
        cx2: cx2,
        cy1: cy1,
        cy2: cy2,
        x: x,
        y: y
      }
    }

    if (vm.animation) {
      vm.animation.kill()
    }

    line.lineStyle(1, 0xff00ee, 1, 0.5, true)
    line.moveTo(vm.dataSpace * (i - 0.5), (vm.areaMax - close[i - 1]) * vm.areaPixel)
    line.bezierCurveTo(cx1, cy1, cx2, cy2, x, y)

    background.beginFill(0x000000)
    background.moveTo(vm.dataSpace * (i - 0.5), (vm.areaMax - vm.areaMin) * vm.areaPixel + vm.dataPaddingY * 2)
    background.lineTo(vm.dataSpace * (i - 0.5), (vm.areaMax - close[i - 1]) * vm.areaPixel)
    background.bezierCurveTo(cx1, cy1, cx2, cy2, x, y)
    background.lineTo(vm.dataSpace * (i + 0.5), (vm.areaMax - vm.areaMin) * vm.areaPixel + vm.dataPaddingY * 2)

    vm.areaLineContainer.addChild(line)
    vm.areaBackgroundContainer.addChild(background)

    // trade
    const trade = new PIXI.Graphics()
    const tradeHeight = (tradeData[i] - vm.tradeMin) * vm.tradePixel + 2

    trade.beginFill(vm.option.trade.lineColor)
    trade.drawRect(0, 0, 1, 1)
    trade.position.x = vm.dataSpace * (i + 0.5)

    vm.tradeContainer.addChild(trade)

    // change areaContainer position x
    const areaPosX = vm.areaContainer.position.x
    const offsetMax = -(chartData.length) * vm.dataSpace * vm.scaleX + Math.floor((vm.appWidth - vm.chartRightSpace) / (vm.dataSpace * vm.scaleX)) * vm.dataSpace * vm.scaleX

    if (areaPosX - offsetMax <= vm.dataSpace * 2 * vm.scaleX && vm.dataSpace * chartData.length * vm.scaleX) {
      vm.areaContainer.position.x = offsetMax
      vm.tradeContainer.position.x = offsetMax
    }

    await vm.getDataIndex(chartData, tradeData)
    vm.getSplitData()
    vm.resizeHeight()
    vm.getPricePosY(chartData)
    vm.pointsPosXY(chartData)
  }

  async windowHidden() {
    const vm = this
    const lineLength = vm.areaLineContainer.children.length
    const bgLength = vm.areaBackgroundContainer.children.length
    const tradeLength = vm.tradeContainer.children.length

    if (vm.animation) {
      vm.animation.kill()
      vm.animation2.kill()
    }

    for (let i = 0; i < lineLength; i++) {
      vm.areaLineContainer.children[0].destroy(true)
    }

    for (let j = 0; j < bgLength; j++) {
      vm.areaBackgroundContainer.children[0].destroy(true)
    }

    for (let k = 0; k < tradeLength; k++) {
      vm.tradeContainer.children[0].destroy(true)
    }
  }

  async windowVisible(chartData, tradeData) {
    const vm = this

    const close = chartData.map(item => item[0])

    vm.areaMax = Math.max(...close)
    vm.areaMin = Math.min(...close)
    vm.area = {
      min: Math.min(...close),
      max: Math.max(...close)
    }
    vm.areaPixel = vm.dataHeight / (vm.areaMax - vm.areaMin)

    // area line
    const line = new PIXI.Graphics()
    const lineBackground = new PIXI.Graphics()

    line.lineStyle(0.5, vm.option.area.lineColor, 1, 0.5, true)
    line.moveTo(0, (vm.areaMax - close[0]) * vm.areaPixel)

    lineBackground.beginFill(0x000000)
    lineBackground.moveTo(0, (vm.areaMax - vm.areaMin) * vm.areaPixel + vm.dataPaddingY * 2)
    lineBackground.lineTo(0, (vm.areaMax - close[0]) * vm.areaPixel)
    for (let i = 1; i < chartData.length - 1; i++) {
      const cx1 = vm.dataSpace * i
      const cx2 = vm.dataSpace * i
      const cy1 = (vm.areaMax - (close[i - 1] * 3 + close[i]) / 4) * vm.areaPixel
      const cy2 = (vm.areaMax - (close[i - 1] + close[i] * 3) / 4) * vm.areaPixel
      const x = vm.dataSpace * (i + 0.5)
      const y = (vm.areaMax - close[i]) * vm.areaPixel

      line.bezierCurveTo(cx1, cy1, cx2, cy2, x, y)
      lineBackground.bezierCurveTo(cx1, cy1, cx2, cy2, x, y)
    }
    lineBackground.lineTo(vm.dataSpace * (chartData.length - 1.5), (vm.areaMax - vm.areaMin) * vm.areaPixel + vm.dataPaddingY * 2)

    vm.areaLineContainer.addChild(line)
    vm.areaBackgroundContainer.addChild(lineBackground)

    // last
    const lastLine = new PIXI.Graphics()
    const lastLineBackground = new PIXI.Graphics()
    const i = chartData.length - 1

    const cx1 = vm.dataSpace * i
    const cx2 = vm.dataSpace * i
    const cy1 = (vm.areaMax - (close[i - 1] * 3 + close[i]) / 4) * vm.areaPixel
    const cy2 = (vm.areaMax - (close[i - 1] + close[i] * 3) / 4) * vm.areaPixel
    const x = vm.dataSpace * (i + 0.5)
    const y = (vm.areaMax - close[i]) * vm.areaPixel

    vm.points = {
      moveTo: {
        x: vm.dataSpace * (i - 0.5),
        y: (vm.areaMax - close[i - 1]) * vm.areaPixel
      },
      lineTo: {
        cx1: cx1,
        cx2: cx2,
        cy1: cy1,
        cy2: cy2,
        x: x,
        y: y
      }
    }

    lastLine.lineStyle(0.5, vm.option.area.lineColor, 1, 0.5, true)
    lastLine.moveTo(vm.dataSpace * (i - 0.5), (vm.areaMax - close[i - 1]) * vm.areaPixel)
    lastLine.bezierCurveTo(cx1, cy1, cx2, cy2, x, y)

    lastLineBackground.beginFill(0x000000)
    lastLineBackground.moveTo(vm.dataSpace * (i - 0.5), (vm.areaMax - vm.areaMin) * vm.areaPixel + vm.dataPaddingY * 2)
    lastLineBackground.lineTo(vm.dataSpace * (i - 0.5), (vm.areaMax - close[i - 1]) * vm.areaPixel)
    lastLineBackground.bezierCurveTo(cx1, cy1, cx2, cy2, x, y)
    lastLineBackground.lineTo(vm.dataSpace * (i + 0.5), (vm.areaMax - vm.areaMin) * vm.areaPixel + vm.dataPaddingY * 2)

    vm.areaLineContainer.addChild(lastLine)
    vm.areaBackgroundContainer.addChild(lastLineBackground)

    vm.tradeMax = Math.max(...tradeData)
    vm.tradeMin = Math.min(...tradeData)
    vm.tradePixel = vm.tradeHeight / (vm.tradeMax - vm.tradeMin)

    for (let i = 0; i < tradeData.length; i++) {
      const trade = new PIXI.Graphics()
      const tradeHeight = (tradeData[i] - vm.tradeMin) * vm.tradePixel + 2

      trade.beginFill(vm.option.trade.lineColor)
      trade.drawRect(0, 0, 1, 1)
      trade.position.x = vm.dataSpace * (i + 0.5)
      trade.height = -tradeHeight
      vm.tradeContainer.addChild(trade)
    }

    await vm.getDataIndex(chartData, tradeData)
    vm.getSplitData()
    vm.resizeHeight()
    vm.getPricePosY(chartData)
    vm.pointsPosXY(chartData)
  }

  getRealTimeMAValue(tradeData) {
    const vm = this

    if (!vm.focusSplitContainer.alpha) {
      vm.bottomMAContainer.children[1].text = parseFloat(tradeData[tradeData.length - 1]).toFixed(3)
    }
  }
}