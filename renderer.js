let img
let effectShader
let canvas

vert = `attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;
uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat3 uNormalMatrix;
varying highp vec2 vVertTexCoord;
void main(void) {
  vec4 positionVec4 = vec4(aPosition, 1.0);
  gl_Position = uProjectionMatrix * uModelViewMatrix * positionVec4;
  vVertTexCoord = aTexCoord;
}
`;

frag = `
precision mediump float;
varying vec3 vVertexNormal;
varying highp vec2 vVertTexCoord;
varying vec4 position;
uniform sampler2D uSampler;
uniform int uNegate;
uniform int uBW;
uniform vec3 uModeColor;
uniform vec3 uTintColor;
uniform vec3 uToneColor;

void main(void) {
  vec4 color = texture2D(uSampler, vVertTexCoord);
  if (uBW == 0) {
    color.rgb = color.rgb * uModeColor;
  } else {
    color.rgb = vec3(1.0, 1.0, 1.0) * dot(color.rgb, uModeColor) / (uModeColor.x + uModeColor.y + uModeColor.z);
  }

  color.rgb = mix(uToneColor, uTintColor, color.rgb);

  if (uNegate == 1) {
    color.rgb = vec3(1.0, 1.0, 1.0) - color.rgb;
  }

  gl_FragColor = color;
}
`;

function preload() {
  img = loadImage('img/marypoppins.jpg');
}

function setup() {
  setAttributes('premultipliedAlpha', true)
  setAttributes('depth', false)
  canvas = createCanvas(2*16*20, 2*9*20, WEBGL);
  effectShader = createShader(vert, frag)
}

function draw() {
  clear()
  noStroke();

  if (window.colors.blend === 'MULTIPLY' || window.colors.blend === 'SUBTRACT') {
    resetShader();
    blendMode(BLEND);
    fill(255);
    window.colors.channels.forEach(c => {
      rect(c.x * width / 2, c.y * height / 2, width/2, height/2);
    });
  }

  shader(effectShader);
  effectShader.setUniform('uSampler', img);
  if (window.colors.blend === 'ADD') {
    blendMode(ADD);
  } else if (window.colors.blend === 'MULTIPLY') {
    blendMode(MULTIPLY);
  } else if (window.colors.blend === 'SUBTRACT') {
    blendMode(SUBTRACT);
  } else {
    blendMode(BLEND);
  }
  window.colors.channels.forEach(c => {
    effectShader.setUniform('uNegate', c.negate);
    effectShader.setUniform('uBW', c.bw);
    const tintColor = color(c.tint)
    const toneColor = color(c.tone)
    const modeColor = color(c.mode)
    effectShader.setUniform('uModeColor', [red(modeColor)/255, green(modeColor)/255, blue(modeColor)/255]);
    effectShader.setUniform('uTintColor', [red(tintColor)/255, green(tintColor)/255, blue(tintColor)/255]);
    effectShader.setUniform('uToneColor', [red(toneColor)/255, green(toneColor)/255, blue(toneColor)/255]);
    rect(c.x * width / 2, c.y * height / 2, width/2, height/2);
  });
}
