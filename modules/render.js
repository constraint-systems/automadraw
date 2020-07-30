import { add, sub, mul, div } from '/modules/global.js'
import { setCanvasSize } from '/modules/utils.js'
import { addHistory } from '/modules/actions.js'
import state from '/modules/state.js'

export function setLayerSizes() {
  let { C, px, cols, rows, render_border } = state
  let w = mul(cols, px)
  let h = mul(rows, px)
  // render size, add 2 for border
  setCanvasSize(
    C.rx.canvas,
    add(w, mul(render_border, 2)),
    add(h, mul(render_border, 2))
  )
  // cursor size
  setCanvasSize(
    C.cx.canvas,
    add(w, mul(render_border, 2)),
    add(h, mul(render_border, 2))
  )
  C.cx.translate(render_border, render_border)
  // grid size
  setCanvasSize(
    C.gx.canvas,
    add(w, mul(render_border, 2)),
    add(h, mul(render_border, 2))
  )
  C.gx.translate(render_border, render_border)
  // art size, cols and rows are pixels
  setCanvasSize(C.ax, cols, rows)
  // turn off image smoothing for render canvas
  C.rx.imageSmoothingEnabled = false

  renderGrid()
}

// renderGrid only needs to run on size change
function renderGrid() {
  let { C, cols, rows, px, grid_color, render_border } = state
  C.gx.clearRect(
    -render_border,
    -render_border,
    C.gx.canvas.width,
    C.gx.canvas.height
  )
  C.gx.strokeStyle = grid_color
  C.gx.lineWidth = 1
  C.gx.strokeRect(0.5, 0.5, sub(mul(cols, px), 1), sub(mul(rows, px), 1))
  C.gx.lineWidth = 2
  for (let c = 1; c < state.cols; c++) {
    C.gx.beginPath()
    C.gx.moveTo(mul(c, px), 0)
    C.gx.lineTo(mul(c, px), mul(rows, px))
    C.gx.stroke()
  }
  for (let r = 1; r < state.rows; r++) {
    C.gx.beginPath()
    C.gx.moveTo(0, mul(r, px))
    C.gx.lineTo(mul(cols, px), mul(r, px))
    C.gx.stroke()
  }
}
function renderMode() {
  let draw_active = state.mode === 'draw' || state.mode === 'resize_draw'
  let auto_active =
    state.mode === 'automata' || state.mode === 'resize_automata'
  let canvas_active = state.mode === 'resize_canvas'

  let $mode_buttons = state.dom.$mode_buttons

  function renderActive($el) {
    $el.style.background = '#222'
    $el.style.color = 'white'
  }

  for (let i = 0; i < $mode_buttons.length; i++) {
    let $el = $mode_buttons[i]
    $el.style.background = 'transparent'
    $el.style.color = 'inherit'
    if (draw_active && i === 0) renderActive($el)
    if (auto_active && i === 1) renderActive($el)
    if (canvas_active && i === 2) renderActive($el)
  }
}

function formatCursor(c) {
  return `${c[0]},${c[1]}:${c[2]},${c[3]}`
}
function writeCursor() {
  let draw_active = state.mode === 'draw' || state.mode === 'resize_draw'
  let auto_active =
    state.mode === 'automata' || state.mode === 'resize_automata'
  let canvas_active = state.mode === 'resize_canvas'
  let select_active = state.mode === 'select'

  let $draw_cursor = state.dom.$draw_cursor_read
  $draw_cursor.innerHTML = formatCursor(state.draw_cursor)
  let $auto_cursor = state.dom.$auto_cursor_read
  let auto_text = formatCursor(state.auto_cursor) + ` ${state.act}`
  if (state.act === 'flow') {
    let lookup = { north: '↑', south: '↓', west: '←', east: '→' }
    auto_text += ':' + lookup[state.flow_choice]
  } else if (state.act === 'ant') {
    let lookup = { north: '↑', south: '↓', west: '←', east: '→' }
    auto_text += ':' + state.ant_position.join(',')
    auto_text += ',' + lookup[state.ant_dir]
  }
  $auto_cursor.innerHTML = auto_text
  let $canvas_read = state.dom.$canvas_read
  if (state.mode === 'resize_canvas') {
    $canvas_read.innerHTML = `${state.crop_cache_resize[0]},${state.crop_cache_dims[1]}:${state.cols},${state.rows}`
  } else {
    $canvas_read.innerHTML = `${state.cols},${state.rows}`
  }

  let elements = [$draw_cursor, $auto_cursor, $canvas_read]
  for (let i = 0; i < elements.length; i++) {
    let $el = elements[i]
    $el.style.backgroundColor = 'transparent'
    $el.style.color = '#222'
  }
  function setActive($el) {
    $el.style.backgroundColor = '#fff'
    $el.style.color = '#111'
  }
  if (draw_active) {
    setActive($draw_cursor)
  } else if (auto_active) {
    setActive($auto_cursor)
  } else if (canvas_active) {
    setActive($canvas_read)
  } else if (select_active) {
    setActive($auto_cursor)
  }
}

export function render(option) {
  let { C, art, cols, rows, px } = state
  let w = cols * px
  let h = rows * px
  function renderCursor() {
    C.cx.clearRect(
      -state.render_border,
      -state.render_border,
      C.cx.canvas.width,
      C.cx.canvas.height
    )

    let draw_active = state.mode === 'draw' || state.mode === 'resize_draw'
    let auto_active =
      state.mode === 'automata' || state.mode === 'resize_automata'
    let select_active = state.mode === 'select'

    let draw_cursor_border = state.cursor_border_color
    let auto_cursor_border = state.auto_cursor_border_color

    function renderDrawCursor() {
      C.cx.strokeStyle = draw_cursor_border
      C.cx.lineWidth = draw_active ? 4 : state.cursor_border_width
      let [x, y, w, h] = state.draw_cursor
      if (draw_active) {
        C.cx.strokeRect(
          sub(mul(x, px), 1),
          sub(mul(y, px), 1),
          add(mul(w, px), 2),
          add(mul(h, px), 2)
        )
      } else {
        C.cx.strokeRect(mul(x, px), mul(y, px), mul(w, px), mul(h, px))
      }
      if (state.mode === 'resize_draw') {
        C.cx.fillStyle = draw_cursor_border
        if (!state.km.shift) {
          C.cx.fillRect(
            sub(mul(add(x, w), px), div(px, 2)),
            sub(mul(add(y, h), px), div(px, 2)),
            div(px, 2),
            div(px, 2)
          )
        } else {
          C.cx.fillRect(mul(x, px), mul(y, px), div(px, 2), div(px, 2))
        }
      }
    }
    function renderAutoCursor() {
      C.cx.strokeStyle = auto_cursor_border
      C.cx.lineWidth = auto_active ? 4 : state.cursor_border_width
      let [x, y, w, h] = state.auto_cursor
      if (auto_active) {
        C.cx.strokeRect(
          sub(mul(x, px), 1),
          sub(mul(y, px), 1),
          add(mul(w, px), 2),
          add(mul(h, px), 2)
        )
      } else {
        C.cx.strokeRect(mul(x, px), mul(y, px), mul(w, px), mul(h, px))
      }
      if (state.mode === 'resize_automata') {
        C.cx.fillStyle = auto_cursor_border
        if (!state.km.shift) {
          C.cx.fillRect(
            sub(mul(add(x, w), px), div(px, 2)),
            sub(mul(add(y, h), px), div(px, 2)),
            div(px, 2),
            div(px, 2)
          )
        } else {
          C.cx.fillRect(mul(x, px), mul(y, px), div(px, 2), div(px, 2))
        }
      }
      if (state.act === 'flow') {
        C.cx.fillStyle = state.auto_cursor_border_color
        let fx = add(sub(add(x, div(w, 2)), 0.5), 0.125)
        let fy = sub(add(y, div(h, 2)), 0.5)
        let spritex
        if (state.flow_choice === 'west') spritex = 0
        if (state.flow_choice === 'south') spritex = 12
        if (state.flow_choice === 'north') spritex = 24
        if (state.flow_choice === 'east') spritex = 36
        C.cx.drawImage(
          state.flow_arrow_sprite,
          spritex,
          0,
          12,
          16,
          mul(fx, px),
          mul(fy, px),
          12,
          px
        )
      }
      if (state.act === 'ant') {
        C.cx.fillStyle = state.auto_cursor_border_color
        let [ax, ay] = state.ant_position
        let basex = add(add(x, ax), 0.125)
        let basey = add(add(y, ay), 0.125)
        let lookup = {}
        lookup.east = [
          [basex, basey],
          [basex + 0.75, basey + 0.325],
          [basex, basey + 0.75],
        ]
        lookup.west = [
          [basex + 0.75, basey],
          [basex, basey + 0.325],
          [basex + 0.75, basey + 0.75],
        ]
        lookup.south = [
          [basex, basey],
          [basex + 0.75, basey],
          [basex + 0.325, basey + 0.75],
        ]
        lookup.north = [
          [basex, basey + 0.75],
          [basex + 0.75, basey + 0.75],
          [basex + 0.325, basey],
        ]
        let points = lookup[state.ant_dir]
        C.cx.beginPath()
        for (let i = 0; i < points.length; i++) {
          let [_x, _y] = points[i]
          if (i === 0) {
            C.cx.moveTo(mul(_x, px), mul(_y, px))
          } else {
            C.cx.lineTo(mul(_x, px), mul(_y, px))
          }
        }
        C.cx.fill()
        if (state.mode === 'select') {
          C.cx.strokeStyle = state.auto_cursor_border_color
          C.cx.lineWidth = 2
          C.cx.strokeRect(mul(add(x, ax), px), mul(add(y, ay), px), px, px)
        }
      }
    }
    function renderFlowChoice() {
      let [x, y, w, h] = state.auto_cursor
      let px = state.px
      let mid_w = sub(div(w, 2), 0.25)
      let mid_h = sub(div(h, 2), 0.25)
      C.cx.fillStyle = state.auto_cursor_border_color
      let points = [
        [x + mid_w, y],
        [x + w - 0.5, y + mid_h],
        [x + mid_w, y + h - 0.5],
        [x, y + mid_h],
      ]
      for (let i = 0; i < points.length; i++) {
        let point = points[i]
        let [x, y] = point
        C.cx.fillRect(mul(x, px), mul(y, px), div(px, 2), div(px, 2))
      }
    }

    if (draw_active) {
      renderAutoCursor()
      renderDrawCursor()
    } else if (auto_active) {
      renderDrawCursor()
      renderAutoCursor()
    } else if (select_active) {
      renderDrawCursor()
      renderAutoCursor()
      if (state.act === 'flow') {
        renderFlowChoice()
      }
    } else if (state.mode === 'resize_canvas') {
      renderAutoCursor()
      renderDrawCursor()
      C.cx.strokeStyle = state.canvas_border_color
      C.cx.fillStyle = state.canvas_border_color
      C.cx.lineWidth = 4
      C.cx.strokeRect(
        sub(mul(0, px), 1),
        sub(mul(0, px), 1),
        add(mul(state.cols, px), 2),
        add(mul(state.rows, px), 2)
      )
      if (!state.km.shift) {
        C.cx.fillRect(
          sub(mul(state.cols, px), div(px, 2)),
          sub(mul(state.rows, px), div(px, 2)),
          div(px, 2),
          div(px, 2)
        )
      } else {
        C.cx.fillRect(mul(0, px), mul(0, px), div(px, 2), div(px, 2))
      }
    }

    writeCursor()
  }
  function renderArt() {
    C.ax.fillStyle = 'white'
    C.ax.fillRect(0, 0, cols, rows)
    C.ax.fillStyle = '#222'
    for (let i = 0; i < cols * rows; i++) {
      let x = i % cols
      let y = Math.floor(i / cols)
      if (art[i] === 1) {
        C.ax.fillRect(x, y, 1, 1)
      }
    }
  }
  function compose() {
    C.rx.clearRect(0, 0, C.rx.canvas.width, C.rx.canvas.height)
    // C.rx.fillStyle = 'pink'
    // C.rx.fillRect(0, 0, C.rx.canvas.width, C.rx.canvas.height)
    C.rx.drawImage(
      C.ax.canvas,
      0,
      0,
      cols,
      rows,
      state.render_border,
      state.render_border,
      w,
      h
    )
    if (state.show_grid) {
      C.rx.drawImage(
        C.gx.canvas,
        0,
        0,
        C.gx.canvas.width,
        C.gx.canvas.height,
        0,
        0,
        C.gx.canvas.width,
        C.gx.canvas.height
      )
    }
    C.rx.drawImage(
      C.cx.canvas,
      0,
      0,
      C.cx.canvas.width,
      C.cx.canvas.height,
      0,
      0,
      C.cx.canvas.width,
      C.cx.canvas.height
    )
  }
  if (option !== 'no_history') {
    addHistory()
  }
  renderMode()
  renderCursor()
  if (option !== 'cursor_only') {
    renderArt()
  }
  compose()
}
