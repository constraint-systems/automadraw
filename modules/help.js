import { add, sub, mul, div } from '/modules/global.js'
import state from '/modules/state.js'

let spacer = `<div class="spacer"></div>`
let hspacer = `<div class="hspacer"></div>`
let qspacer = `<div class="qspacer"></div>`
function b(text) {
  // button trigger function from actions added to window for use here
  return `<button onclick="buttonTrigger('${text}')">${text}</button>`
}
function l(label, content) {
  return `<label>${content} ${label}</label>`
}
function l2(label, content) {
  return `<label>${content}${qspacer}${label}</label>`
}
function hjkl() {
  return 'hjkl'
    .split('')
    .map(l => b(l))
    .join('')
}
function arrows() {
  return '←↓↑→'
    .split('')
    .map(l => b(l))
    .join('')
}
function linkButton(value) {
  return `<button class="link">${value}</button>`
}
function actList() {
  let descriptions = [
    `Conway's Game of Life`,
    `flow in direction`,
    `Langton's Ant`,
  ]
  return state.actions
    .map((name, i) => {
      return `<div class="${
        state.act === name ? 'active' : ''
      }" style="padding-left: 3ch;">${linkButton(name)} - ${
        descriptions[i]
      }</div>`
    })
    .join('')
}

function move() {
  let html = ''
  html += hspacer
  html += l('move', `${hjkl()} or ${arrows()}`)
  return html
}

function resize() {
  let html = ''
  html += hspacer
  html += l('resize cursor', `${hjkl()} or ${arrows()}`)
  html += hspacer
  html += `hold ${b('shift')} to resize top left`
  html += hspacer
  html += `${b(`enter`)} or ${b('esc')} to exit`
  return html
}

function drawActions() {
  let html = ''
  html += hspacer
  html += l('draw', b('d'))
  html += hspacer
  html += l('erase', b('e'))
  return html
}

function activeActions() {
  let html = ''
  html += hspacer
  html += l('toggle cursor', b('i'))
  html += hspacer
  html += l('resize cursor', b('y'))
  return html
}

function drawTitle() {
  let html = ''
  html += spacer
  html += `<span style="padding: 0 0.5ch; margin-left: -0.25ch; background: ${state.cursor_border_color}66">Draw</span>`
  return html
}

function actTitle() {
  let html = ''
  html += spacer
  html += `<span style="padding: 0 0.5ch; margin-left: -0.25ch; background: ${state.auto_cursor_border_color}55">Act</span>`
  return html
}

function actActions() {
  let html = ''
  html += hspacer
  html += l('run automata:', b('a'))
  html += hspacer
  html += actList()
  if (state.act === 'flow') {
    html += hspacer
    html += l('select flow direction', b('s'))
  } else if (state.act === 'ant') {
    html += hspacer
    html += l('select ant position', b('s'))
  }
  html += hspacer
  html += l('switch automata', b('n'))
  return html
}

function setSpecial() {
  let html = ''
  html += spacer
  html += `Special`
  html += hspacer
  html += l('undo', b('z'))
  html += hspacer
  html += l('redo', b('shift+z'))
  html += hspacer
  html += l('clear canvas', b('c'))
  html += hspacer
  html += l('toggle grid', b('u'))
  html += hspacer
  html += l('toggle help', b('?'))
  return html
}

export function renderHelp() {
  let $content = state.dom.$help_content
  let html = ''

  if (state.mode === 'draw') {
    html += drawTitle()
    html += move()
    html += drawActions()
    html += activeActions()
    html += actTitle()
    html += actActions()
    html += setSpecial()
  } else if (state.mode === 'automata') {
    html += actTitle()
    html += move()
    html += actActions()
    html += activeActions()
    html += drawTitle()
    html += drawActions()
    html += setSpecial()
  } else if (state.mode === 'resize_draw') {
    html += hspacer
    html += `Resize draw cursor`
    html += resize()
  } else if (state.mode === 'resize_automata') {
    html += hspacer
    html += `Resize act cursor`
    html += resize()
  } else if (state.mode === 'resize_canvas') {
    html += hspacer
    html += `Resize canvas`
    html += resize()
  } else if (state.mode === 'select') {
    if (state.act === 'flow') {
      html += hspacer
      html += `Select flow direction`
      html += hspacer
      html += l('↑', b('w'))
      html += hspacer
      html += l('←', b('a'))
      html += hspacer
      html += l('↓', b('s'))
      html += hspacer
      html += l('→', b('d'))
    } else if (state.act === 'ant') {
      html += hspacer
      html += 'Ant position'
      html += move()
      html += hspacer
      html += 'Select direction'
      html += hspacer
      html += l('↑', b('w'))
      html += hspacer
      html += l('←', b('a'))
      html += hspacer
      html += l('↓', b('s'))
      html += hspacer
      html += l('→', b('d'))
    }
  }

  $content.innerHTML = html
}
