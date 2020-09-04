const USE_CAPTURE = true;
const MIRROR = true;
let img
let capture
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
uniform vec3 uMatteColor;
uniform float uA;
uniform float uB;
uniform int uIsMatte;
uniform int uVizMatte;

float map(float value, float min1, float max1, float min2, float max2) {
  if (min1 == max1) return min2;
  return clamp(min2 + (value - min1) * (max2 - min2) / (max1 - min1), min(min2, max2), max(min2, max2));
}

void main(void) {
  vec2 uv = vVertTexCoord.xy;
  ${USE_CAPTURE && MIRROR ? 'uv.x = 1.0 - uv.x;' : ''}
  if (uIsMatte == 0) {
    vec4 color = texture2D(uSampler, uv);
    if (uBW == 0) {
      color.rgb = color.rgb * uModeColor;
    } else {
      color.rgb = vec3(1.0, 1.0, 1.0) * dot(color.rgb, uModeColor);
      float denom = uModeColor.x + uModeColor.y + uModeColor.z;
      if (denom > 0.0) {
        color.rgb = color.rgb / denom;
      }
    }

    color.rgb = mix(uToneColor, uTintColor, color.rgb);

    if (uNegate == 1) {
      color.rgb = vec3(1.0, 1.0, 1.0) - color.rgb;
    }
    gl_FragColor = vec4(color.rgb, 1.0);

  } else {
    vec3 rawColor = texture2D(uSampler, uv).rgb;
    vec3 color = rawColor;
    if (uNegate == 1) {
      color = vec3(1.0, 1.0, 1.0) - color;
    }
    vec3 opposite = color * uMatteColor;
    if (uMatteColor.r == 0.0 && uMatteColor.g == 0.0 && uMatteColor.b == 0.0) {
      opposite = vec3(1.0, 1.0, 1.0);
    }
    float matte = uA * dot(color * (vec3(1.0, 1.0, 1.0) - uMatteColor), vec3(1.0, 1.0, 1.0)) -
      uB * dot(opposite, vec3(1.0, 1.0, 1.0));
    matte = clamp((matte + 0.2) / 0.2, 0.0, 1.0);

    if (uVizMatte == 1) {
      gl_FragColor = vec4(matte, matte, matte, 1.0);
    } else {
      gl_FragColor = vec4(rawColor, matte); //min(color.g, color.b)
    }
  }
}
`;

function preload() {
  if (!USE_CAPTURE) {
    img = loadImage('img/marypoppins.jpg');
  }
}

function setup() {
  setAttributes('premultipliedAlpha', true)
  setAttributes('depth', false)
  canvas = createCanvas(2*320, 2*240, WEBGL);
  effectShader = createShader(vert, frag)
  if (USE_CAPTURE) {
    capture = createCapture(VIDEO);
    capture.size(320, 240);
    capture.hide();
  }
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
  effectShader.setUniform('uSampler', USE_CAPTURE ? capture : img);
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
    effectShader.setUniform('uTransparent', c.transparent);
    effectShader.setUniform('uOpaque', c.opaque);
    effectShader.setUniform('uIsMatte', c.isMatte);
    effectShader.setUniform('uVizMatte', c.vizMatte);
    effectShader.setUniform('uA', window.a || c.a);
    effectShader.setUniform('uB', window.b || c.b);
    const tintColor = color(c.tint)
    const toneColor = color(c.tone)
    const modeColor = color(c.mode)
    const matteColor = color(c.matte)
    effectShader.setUniform('uModeColor', [red(modeColor)/255, green(modeColor)/255, blue(modeColor)/255]);
    effectShader.setUniform('uTintColor', [red(tintColor)/255, green(tintColor)/255, blue(tintColor)/255]);
    effectShader.setUniform('uToneColor', [red(toneColor)/255, green(toneColor)/255, blue(toneColor)/255]);
    effectShader.setUniform('uMatteColor', [red(matteColor)/255, green(matteColor)/255, blue(matteColor)/255]);
    rect(c.x * width / 2, c.y * height / 2, width/2, height/2);
  });
}
