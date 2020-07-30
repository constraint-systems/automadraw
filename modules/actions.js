import { add, sub, mul, div } from '/modules/global.js'
import { getRectIndexes, chunk } from '/modules/utils.js'
import { setLayerSizes, render } from '/modules/render.js'
import state from '/modules/state.js'
import history from '/modules/history.js'

// TODO clear all

export function setCropCache() {
  state.crop_cache_art = state.art.slice()
  state.crop_cache_dims = [state.cols, state.rows]
  state.crop_cache_resize = [0, 0, state.cols, state.rows]
}
export function addHistory() {
  let frozen_state = JSON.stringify(state)
  if (history.index === null) {
    history.stack.push(frozen_state)
  } else {
    history.stack = history.stack.slice(0, history.index)
    history.stack.push(frozen_state)
    history.index = null
  }
}
function changeState(new_state) {
  function changeProp(prop_key) {
    state[prop_key] = new_state[prop_key]
  }
  function changeProps(prop_keys) {
    for (let i = 0; i < prop_keys.length; i++) {
      let prop_key = prop_keys[i]
      changeProp(prop_key)
    }
  }
  // change canvas is special
  if (state.cols !== new_state.cols || state.rows !== new_state.rows) {
    state.cols = new_state.cols
    state.rows = new_state.rows
    setLayerSizes()
  }
  let prop_keys = [
    'art',
    'mode',
    'act',
    'show_grid',
    'mode_cache',
    'crop_cache_art',
    'crop_cache_dims',
    'crop_cache_resize',
    'draw_cursor',
    'auto_cursor',
    'flow_choice',
    'ant_position',
    'ant_dir',
    'show_help',
  ]
  changeProps(prop_keys)
}
export function travelHistory(option) {
  if (option === 'forward') {
    if (history.index !== null && history.index !== history.stack.length - 2) {
      history.index += 1
      changeState(JSON.parse(history.stack[history.index]))
      render('no_history')
    }
  } else {
    if (history.index === null) {
      history.index = history.stack.length - 2
      changeState(JSON.parse(history.stack[history.index]))
      render('no_history')
    } else {
      if (history.index > 0) {
        history.index -= 1
        changeState(JSON.parse(history.stack[history.index]))
        render('no_history')
      }
    }
  }
}
function containCursor(cursor) {
  let { cols, rows } = state
  if (cursor[2] > state.cols) cursor[2] = state.cols
  if (cursor[3] > state.rows) cursor[3] = state.rows
  if (cursor[0] < 0) {
    cursor[0] = 0
  }
  if (cursor[0] + cursor[2] >= cols) {
    cursor[0] = cols - cursor[2]
  }
  if (cursor[1] < 0) {
    cursor[1] = 0
  }
  if (cursor[1] + cursor[2] >= rows) {
    cursor[1] = rows - cursor[3]
  }
}
function containCursors() {
  containCursor(state.draw_cursor)
  containCursor(state.auto_cursor)
}
function checkCanvasProposed(proposed) {
  return (
    proposed[0] >= state.draw_cursor[2] &&
    proposed[0] >= state.auto_cursor[2] &&
    proposed[1] >= state.draw_cursor[3] &&
    proposed[1] >= state.auto_cursor[3]
  )
}
export function changeCanvas(dm) {
  if (!checkCanvasProposed([state.cols + dm[2], state.rows + dm[3]])) return
  let art = state.crop_cache_art.slice()
  let resize = state.crop_cache_resize.map((v, i) => v + dm[i])
  let dims = state.crop_cache_dims
  let [ow, oh] = dims
  let [rx, ry, rw, rh] = resize
  // handle width
  let rows = chunk(art, ow)
  for (let r = 0; r < oh; r++) {
    let row = rows[r]
    if (rx < 0) {
      row.splice(0, 0, ...Array(Math.abs(rx)).fill(0))
    } else if (rx > 0) {
      row.splice(0, rx)
    }
    if (row.length < rw) {
      row.splice(row.length, 0, ...Array(sub(rw, row.length)).fill(0))
    } else if (row.length > rw) {
      rows[r] = row.slice(0, rw)
    }
  }
  let cols = rows[0].length
  art = rows.flat()
  if (ry < 0) {
    art.splice(0, 0, ...Array(mul(Math.abs(ry), cols)).fill(0))
  } else {
    art.splice(0, mul(ry, rw))
  }
  let target_cells = mul(rw, rh)
  if (art.length < target_cells) {
    art.splice(art.length, 0, ...Array(sub(target_cells, art.length)).fill(0))
  } else if (art.length > target_cells) {
    art = art.slice(0, target_cells)
  }
  state.art = art
  state.crop_cache_resize = resize
  state.cols = rw
  state.rows = rh
  state.draw_cursor[0] -= dm[0]
  state.draw_cursor[1] -= dm[1]
  state.auto_cursor[0] -= dm[0]
  state.auto_cursor[1] -= dm[1]
  containCursors()
  setLayerSizes()
}

export function setHelp() {
  let px = state.px
  let w = mul(add(state.cols, 2), px)
  if (state.show_help) {
    let p = mul(40, 8)
    w += p
    state.dom.$help.style.display = 'block'
    state.dom.$workspace.style.paddingRight = p + 'px'
    state.dom.$workspace.style.width = w + 'px'
  } else {
    state.dom.$help.style.display = 'none'
    state.dom.$workspace.style.paddingRight = 0
    state.dom.$workspace.style.width = w + 'px'
  }
}

function checkProposal(proposed) {
  let [x, y, w, h] = proposed
  return (
    x >= 0 &&
    y >= 0 &&
    x + w <= state.cols &&
    y + h <= state.rows &&
    w >= 1 &&
    h >= 1
  )
}

export function changeCursor(cursor_name, dm) {
  // dm = [dx, dy, dw, dh]
  let proposed = state[cursor_name].map((v, i) => add(v, dm[i]))
  if (checkProposal(proposed)) {
    state[cursor_name] = proposed
    if (cursor_name === 'auto_cursor' && state.act === 'ant') {
      // not pretty
      if (dm[0] < 0 && dm[2] !== 0) state.ant_position[0] -= dm[0]
      if (dm[0] > 0 && dm[2] !== 0) state.ant_position[0] -= dm[0]
      if (dm[1] < 0 && dm[3] !== 0) state.ant_position[1] -= dm[1]
      if (dm[1] > 0 && dm[3] !== 0) state.ant_position[1] -= dm[1]
      if (state.ant_position[0] < 0) state.ant_position[0] = 0
      if (state.ant_position[1] < 0) state.ant_position[1] = 0
      if (state[cursor_name][2] <= state.ant_position[0])
        state.ant_position[0] = state[cursor_name][2] - 1
      if (state[cursor_name][3] <= state.ant_position[1])
        state.ant_position[1] = state[cursor_name][3] - 1
    }
  }
}
export function draw(cursor) {
  let indexes = getRectIndexes(state.art, state.cols, state.rows, cursor)
  for (let i = 0; i < indexes.length; i++) {
    let index = indexes[i]
    state.art[index] = 1
  }
}
export function erase(cursor) {
  let indexes = getRectIndexes(state.art, state.cols, state.rows, cursor)
  for (let i = 0; i < indexes.length; i++) {
    let index = indexes[i]
    state.art[index] = 0
  }
}
function getXy(index) {
  return [index % state.cols, Math.floor(index / state.cols)]
}
function getIndex(x, y) {
  if (x >= 0 && x < state.cols && y >= 0 && y < state.rows) {
    return y * state.cols + x
  } else {
    return undefined
  }
}
function getMooreNeighborhood(art, index) {
  let [x, y] = getXy(index)
  let dirs = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ]
  // undefined (out of bounds) are dead
  return dirs.map(dir => {
    let index = getIndex(x + dir[0], y + dir[1])
    if (index === undefined) return 0
    return art[index]
  })
}
export function invert(cursor) {
  let indexes = getRectIndexes(state.art, state.cols, state.rows, cursor)
  for (let i = 0; i < indexes.length; i++) {
    let index = indexes[i]
    if (state.art[index] === 1) {
      state.art[index] = 0
    } else {
      state.art[index] = 1
    }
  }
}
function runLife(cursor) {
  let indexes = getRectIndexes(state.art, state.cols, state.rows, cursor)
  let art = state.art.slice()
  if (state.act === 'life') {
    for (let i = 0; i < indexes.length; i++) {
      let index = indexes[i]
      let val = art[index]
      let neighbors = getMooreNeighborhood(art, index)
      let alive = neighbors.reduce((tot, curr) => tot + curr, 0)
      if (val === 1) {
        if (!(alive === 2 || alive === 3)) {
          state.art[index] = 0
        }
      } else if (val === 0) {
        if (alive === 3) {
          state.art[index] = 1
        }
      }
    }
  }
}
function progressAnt(cursor) {
  let dir = state.ant_dir
  function clockWise() {
    let dir = state.ant_dir
    let new_dir
    if (dir === 'east') new_dir = 'south'
    if (dir === 'south') new_dir = 'west'
    if (dir === 'west') new_dir = 'north'
    if (dir === 'north') new_dir = 'east'
    state.ant_dir = new_dir
  }
  function counterClockWise() {
    let dir = state.ant_dir
    let new_dir
    if (dir === 'east') new_dir = 'north'
    if (dir === 'south') new_dir = 'east'
    if (dir === 'west') new_dir = 'south'
    if (dir === 'north') new_dir = 'west'
    state.ant_dir = new_dir
  }
  function forward() {
    let dir = state.ant_dir
    if (dir === 'east') state.ant_position[0] += 1
    if (dir === 'south') state.ant_position[1] += 1
    if (dir === 'west') state.ant_position[0] -= 1
    if (dir === 'north') state.ant_position[1] -= 1
  }
  function getAntIndex(cursor) {
    let ant_x = cursor[0] + state.ant_position[0]
    let ant_y = cursor[1] + state.ant_position[1]
    let index = add(mul(ant_y, state.cols), ant_x)
    return index
  }
  function outOfBoundsCheck(cursor) {
    let [ant_x, ant_y] = state.ant_position
    return ant_x < 0 || ant_y < 0 || ant_x >= cursor[2] || ant_y >= cursor[3]
  }
  let index = getAntIndex(cursor)
  let val = state.art[index]
  if (val === 0) {
    // white square turn clockwise
    clockWise()
    state.art[index] = 1
    forward()
  } else {
    counterClockWise()
    state.art[index] = 0
    forward()
  }
  if (outOfBoundsCheck(cursor)) initAnt()
}
export function automate(cursor) {
  if (state.act === 'life') {
    runLife(cursor)
  } else if (state.act === 'flow') {
    flow(cursor)
  } else if (state.act === 'ant') {
    progressAnt(cursor)
  }
}
export function flow(cursor) {
  let indexes = getRectIndexes(state.art, state.cols, state.rows, cursor)
  let art = state.art.slice()
  let dir = state.flow_choice
  if (dir === 'north') {
    let first_row = cursor[1]
    for (let i = 0; i < indexes.length; i++) {
      let index = indexes[i]
      let [x, y] = getXy(index)
      if (y !== first_row) {
        if (state.art[index] === 1) {
          let above = getIndex(x, y - 1)
          if (state.art[above] === 0) {
            state.art[index] = 0
            state.art[above] = 1
          }
        }
      }
    }
  } else if (dir === 'south') {
    let last_row = add(cursor[1], sub(cursor[3], 1))
    indexes.reverse()
    for (let i = 0; i < indexes.length; i++) {
      let index = indexes[i]
      let [x, y] = getXy(index)
      if (y !== last_row) {
        if (state.art[index] === 1) {
          let below = getIndex(x, y + 1)
          if (state.art[below] === 0) {
            state.art[index] = 0
            state.art[below] = 1
          }
        }
      }
    }
  } else if (dir === 'west') {
    let rows = chunk(indexes, cursor[2])
    for (let r = 0; r < cursor[3]; r++) {
      let row = rows[r]
      for (let c = 0; c < cursor[2]; c++) {
        let index = row[c]
        if (state.art[index] === 1) {
          if (c !== 0) {
            let before = row[c - 1]
            if (state.art[before] === 0) {
              state.art[index] = 0
              state.art[before] = 1
            }
          }
        }
      }
    }
  } else if (dir === 'east') {
    let rows = chunk(indexes, cursor[2])
    for (let r = 0; r < cursor[3]; r++) {
      let row = rows[r]
      for (let c = cursor[2] - 1; c >= 0; c--) {
        let index = row[c]
        if (state.art[index] === 1) {
          if (c !== cursor[2] - 1) {
            let after = row[c + 1]
            if (state.art[after] === 0) {
              state.art[index] = 0
              state.art[after] = 1
            }
          }
        }
      }
    }
  }
}

export function flipHorizontal(cursor) {
  let indexes = getRectIndexes(state.art, state.cols, state.rows, cursor)
  let art = state.art.slice()
  let rows = chunk(indexes, cursor[2])
  for (let r = 0; r < rows.length; r++) {
    let row = rows[r]
    let start = row[0]
    row.reverse()
    let row_vals = row.map(i => art[i])
    state.art.splice(start, cursor[2], ...row_vals)
  }
}
export function flipVertical(cursor) {
  let indexes = getRectIndexes(state.art, state.cols, state.rows, cursor)
  let art = state.art.slice()
  let rows = chunk(indexes, cursor[2])
  let flipped = rows.slice().reverse()
  for (let r = 0; r < rows.length; r++) {
    let old_row = rows[r]
    let new_row = flipped[r]
    let start = old_row[0]
    let row_vals = new_row.map(i => art[i])
    state.art.splice(start, cursor[2], ...row_vals)
  }
}
export function prevAction() {
  let current = state.act
  let actions = state.actions
  let index = actions.indexOf(current)
  let next_index = sub(index, 1)
  if (next_index < 0) next_index = actions.length - 1
  let next_action = actions[next_index]
  state.act = next_action
  if (next_action === 'ant') {
    initAnt()
  }
}
export function nextAction() {
  let current = state.act
  let actions = state.actions
  let index = actions.indexOf(current)
  let next_index = add(index, 1) % actions.length
  let next_action = actions[next_index]
  state.act = next_action
  if (next_action === 'ant') {
    initAnt()
  }
}
export function initAnt() {
  let x = Math.floor(div(sub(state.auto_cursor[2], 1), 2))
  let y = Math.floor(div(sub(state.auto_cursor[3], 1), 2))
  state.ant_position = [x, y]
}
function getWindowDimensions() {
  return [window.innerWidth, window.innerHeight]
}
function getMaxGridScreenDimensions() {
  let dims = getWindowDimensions()
  let w = Math.floor(div(sub(dims[0], 32), state.px))
  let h = Math.floor(div(sub(dims[1], 64), state.px))
  return [w, h]
}
function _loadImage(src) {
  let px = state.px
  let max_dims = getMaxGridScreenDimensions()
  let [max_pxx, max_pxy] = max_dims.map(v => mul(v, px))
  let max_aspect = max_dims[0] / max_dims[1]

  let img = document.createElement('img')
  img.onload = function() {
    let ow = img.width
    let oh = img.height
    let aspect = ow / oh
    let w, h
    if (ow <= max_pxx && oh <= max_pxy) {
      w = Math.round(div(ow, px))
      h = Math.round(div(oh, px))
    } else {
      let resize = confirm(
        `The image you selected is larger than your screen. Click OK to resize it to fit your screen, or Cancel to load it at the original size.`
      )
      if (resize) {
        if (aspect > max_aspect) {
          // adjust width
          w = max_dims[0]
          h = Math.round(div(w, aspect))
        } else {
          // adjust height
          h = max_dims[1]
          w = Math.round(mul(h, aspect))
        }
      } else {
        w = Math.round(div(ow, px))
        h = Math.round(div(oh, px))
      }
    }
    let cx = document.createElement('canvas').getContext('2d')
    cx.canvas.width = w
    cx.canvas.height = h
    cx.drawImage(img, 0, 0, ow, oh, 0, 0, cx.canvas.width, cx.canvas.height)
    let image_data = cx.getImageData(0, 0, cx.canvas.width, cx.canvas.height)
    let pixels = image_data.data
    let new_art = Array(w * h).fill(0)
    for (let i = 0; i < pixels.length; i += 4) {
      let gray = 0.3 * pixels[i] + 0.59 * pixels[i + 1] + 0.11 * pixels[i + 2]
      if (gray < 128) {
        new_art[i / 4] = 1
      }
    }
    state.cols = w
    state.rows = h
    containCursors()
    setLayerSizes()
    state.art = new_art
    // will need to cursor check
    render()
  }
  img.src = src
}
export function loadImage() {
  let input = state.dom.$file_input
  function handleChange(e) {
    let files = ''
    for (let item of this.files) {
      files += item.name + '.' + item.type
      if (item.type.indexOf('image') < 0) {
        continue
      }
      let src = URL.createObjectURL(item)
      _loadImage(src)
    }
    this.removeEventListener('change', handleChange)
  }
  input.addEventListener('change', handleChange)

  input.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
    })
  )
}
export function createFlowSprite() {
  let c = document.createElement('canvas')
  c.width = 12 * 4
  c.height = 16
  let cx = c.getContext('2d')
  cx.font = '19.9995px JetBrains Mono'
  cx.textBaseline = 'middle'
  cx.fillStyle = state.auto_cursor_border_color
  let arrows = '←↓↑→'.split('')
  for (let i = 0; i < 4; i++) {
    let arrow = arrows[i]
    cx.fillText(arrow, i * 12, 9)
  }
  state.flow_arrow_sprite = c
}
export function saveImage() {
  let px = state.px
  let ax = state.C.ax
  let link = document.createElement('a')
  let dx = document.createElement('canvas').getContext('2d')
  dx.canvas.width = mul(state.cols, px)
  dx.canvas.height = mul(state.rows, px)
  dx.imageSmoothingEnabled = false
  dx.drawImage(
    ax.canvas,
    0,
    0,
    state.cols,
    state.rows,
    0,
    0,
    dx.canvas.width,
    dx.canvas.height
  )
  dx.canvas.toBlob(function(blob) {
    link.setAttribute(
      'download',
      'automadraw-' + Math.round(new Date().getTime() / 1000) + '.png'
    )

    link.setAttribute('href', URL.createObjectURL(blob))
    link.dispatchEvent(
      new MouseEvent(`click`, {
        bubbles: true,
        cancelable: true,
        view: window,
      })
    )
  })
}
export function clearCanvas() {
  let { cols, rows } = state
  state.art = new Array(cols * rows).fill(0)
}
