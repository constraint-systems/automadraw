import { add, sub, mul, div } from '/modules/global.js'

// Utils
export function setCanvasSize(ctx, w, h) {
  ctx.width = w
  ctx.height = h
}

export function getRectIndexes(art, cols, rows, rect) {
  let [rx, ry, rw, rh] = rect
  rw = Math.min(rw, cols - rx)
  rh = Math.min(rh, rows - ry)
  let indexes = []
  for (let r = 0; r < rh; r++) {
    for (let c = 0; c < rw; c++) {
      indexes.push(add(mul(add(ry, r), cols), add(rx, c)))
    }
  }
  return indexes
}

export function addMarker($el, color) {
  let mx = document.createElement('canvas').getContext('2d')
  mx.canvas.width = 16
  mx.canvas.height = 16
  mx.fillStyle = color
  mx.fillRect(5, 5, 6, 6)
  $el.style.backgroundImage = `url(${mx.canvas.toDataURL()})`
  $el.style.backgroundPosition = `0 0`
  $el.style.backgroundRepeat = `no-repeat`
  $el.style.paddingLeft = '16px'
}

export function chunk(arr, len) {
  // from https://stackoverflow.com/a/11764168
  let chunks = [],
    i = 0,
    n = arr.length

  while (i < n) {
    chunks.push(arr.slice(i, (i += len)))
  }

  return chunks
}
