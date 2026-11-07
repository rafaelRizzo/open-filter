// Filtro GLSL único do editor. Estágios no mesmo fragment shader:
// claridade/névoa (da original), tom, cor, HSL por faixa, color grading, curvas, LUT, nitidez e efeitos.
import {
    BufferImageSource,
    defaultFilterVert,
    Filter,
    GlProgram,
    type UniformData,
    UniformGroup,
} from 'pixi.js'
import { buildCurveLut } from './curves'
import type { Lut } from './lut'
import {
    type EditParams,
    GRADE_ZONES,
    gradeKey,
    HSL_BANDS,
    HSL_CENTERS,
    hslKey,
    PARAM_KEYS,
    type ParamKey,
} from './params'
import { toUniforms, UNIFORM_NAMES } from './uniforms'

const uniformDecls = PARAM_KEYS.map((k) => `uniform float ${UNIFORM_NAMES[k]};`).join('\n')
// Sem arrays em GLSL: o contexto pode ser WebGL1 (ES 1.00), que não tem construtor de array.
// As 8 faixas do HSL são desenroladas em código gerado.
const hslBandCode = HSL_BANDS.map((band) => {
    const c = (HSL_CENTERS[band] / 360).toFixed(5)
    return `    d = abs(hsl.x - ${c});
    d = min(d, 1.0 - d);
    w = smoothstep(0.0, 1.0, 1.0 - d / 0.14);
    hueSum += w * ${UNIFORM_NAMES[hslKey(band, 'Hue')]};
    satSum += w * ${UNIFORM_NAMES[hslKey(band, 'Sat')]};
    lumSum += w * ${UNIFORM_NAMES[hslKey(band, 'Lum')]};`
}).join('\n')
const zoneCall = (zone: (typeof GRADE_ZONES)[number], w: string) =>
    `rgb = gradeZone(rgb, ${UNIFORM_NAMES[gradeKey(zone, 'Hue')]}, ${UNIFORM_NAMES[gradeKey(zone, 'Sat')]}, ${UNIFORM_NAMES[gradeKey(zone, 'Lum')]}, ${w});`

// Trabalha em sRGB (gamma) de propósito: é o que o usuário vê e mantém o custo baixo no preview.
export const EDIT_FRAGMENT = /* glsl */ `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform sampler2D uCurves;
uniform sampler2D uLut;
// highp explícito: o vertex shader do Pixi declara estes uniforms em highp e precisões diferentes não linkam.
uniform highp vec4 uInputSize;
// Retângulo da imagem inteira (x, y, w, h) no espaço de pixels do filtro. Divisor, vinheta e raios
// precisam da posição real dentro da imagem: vTextureCoord NÃO vai de 0 a 1 na imagem (a textura
// intermediária do filtro pode ser maior, ou recortada pela tela quando há zoom).
uniform highp vec4 uOutputFrame;
uniform vec4 uImageRect;
// Área visível em px de tela (minx, miny, maxx, maxy): fora dela o pixel é transparente. Faz o papel de máscara.
uniform vec4 uClip;
uniform vec2 uGrainOffset;
// Só do preview: divisor antes/depois (0 = desligado) e aviso de estouro.
uniform float uSplit;
uniform float uShowClip;
// Flags para pular estágios inteiros quando nada foi mexido (uniforms são coerentes por quadro).
uniform float uHslActive;
uniform float uGradeActive;
uniform float uCurvesActive;
// Tamanho do LUT 3D carregado (0 = nenhum).
uniform float uLutSize;
${uniformDecls}

const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);

// Posição do fragmento dentro da imagem, de 0 a 1 nos dois eixos.
vec2 imageUv() {
    vec2 px = uOutputFrame.xy + vTextureCoord * uInputSize.xy;
    return (px - uImageRect.xy) / uImageRect.zw;
}

// Prende uma coordenada de textura dentro da imagem. Sem isso, as amostras de vizinhança (claridade,
// nitidez) na borda leem o fundo transparente do filtro (preto) e geram um halo claro em volta da foto.
vec2 clampToImage(vec2 uv) {
    vec2 lo = (uImageRect.xy - uOutputFrame.xy) * uInputSize.zw;
    vec2 hi = lo + uImageRect.zw * uInputSize.zw;
    vec2 margin = 0.5 * uInputSize.zw;
    return clamp(uv, lo + margin, hi - margin);
}

float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 rgb2hsl(vec3 c) {
    float mx = max(c.r, max(c.g, c.b));
    float mn = min(c.r, min(c.g, c.b));
    float l = (mx + mn) * 0.5;
    float d = mx - mn;
    float h = 0.0;
    float s = 0.0;
    if (d > 0.00001) {
        s = l > 0.5 ? d / (2.0 - mx - mn) : d / (mx + mn);
        if (mx == c.r) h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
        else if (mx == c.g) h = (c.b - c.r) / d + 2.0;
        else h = (c.r - c.g) / d + 4.0;
        h /= 6.0;
    }
    return vec3(h, s, l);
}

float hue2rgb(float p, float q, float t) {
    if (t < 0.0) t += 1.0;
    if (t > 1.0) t -= 1.0;
    if (t < 1.0 / 6.0) return p + (q - p) * 6.0 * t;
    if (t < 0.5) return q;
    if (t < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
    return p;
}

vec3 hsl2rgb(vec3 c) {
    if (c.y < 0.00001) return vec3(c.z);
    float q = c.z < 0.5 ? c.z * (1.0 + c.y) : c.z + c.y - c.z * c.y;
    float p = 2.0 * c.z - q;
    return vec3(hue2rgb(p, q, c.x + 1.0 / 3.0), hue2rgb(p, q, c.x), hue2rgb(p, q, c.x - 1.0 / 3.0));
}

// HSL por faixa: cada pixel recebe a soma dos ajustes das faixas próximas ao seu matiz.
vec3 applyHsl(vec3 rgb) {
    vec3 hsl = rgb2hsl(clamp(rgb, 0.0, 1.0));
    // Começa com o ajuste de todas as cores; cada faixa soma o seu por cima.
    float hueSum = uHslAllHue;
    float satSum = uHslAllSat;
    float lumSum = uHslAllLum;
    float d;
    float w;
${hslBandCode}
    // Cinzas (saturação ~0) não têm matiz de verdade: ficam de fora.
    float live = smoothstep(0.02, 0.18, hsl.y);
    hsl.x = fract(hsl.x + hueSum * live * (30.0 / 360.0) + 1.0);
    hsl.y = clamp(hsl.y * (1.0 + satSum * live), 0.0, 1.0);
    hsl.z = clamp(hsl.z + lumSum * live * 0.25, 0.0, 1.0);
    return hsl2rgb(hsl);
}

vec3 gradeZone(vec3 rgb, float hue, float sat, float lum, float w) {
    vec3 t = hsl2rgb(vec3(hue / 360.0, 1.0, 0.5));
    // Tinge sem mexer na luminância: soma só a parte "cor" do tom.
    rgb += (t - dot(t, LUMA)) * sat * w * 0.6;
    rgb += lum * 0.3 * w;
    return rgb;
}

// Color grading em 3 vias: sombras, meios-tons e realces, com ponto de equilíbrio móvel.
vec3 applyGrading(vec3 rgb) {
    float l = clamp(dot(rgb, LUMA), 0.0, 1.0);
    float pivot = 0.5 + uGradeBalance * 0.25;
    float sh = 1.0 - smoothstep(0.0, pivot, l);
    float hi = smoothstep(pivot, 1.0, l);
    float mid = clamp(1.0 - sh - hi, 0.0, 1.0);
    ${zoneCall('shadows', 'sh')}
    ${zoneCall('midtones', 'mid')}
    ${zoneCall('highlights', 'hi')}
    return rgb;
}

vec3 applyCurves(vec3 c) {
    c = clamp(c, 0.0, 1.0);
    return vec3(
        texture(uCurves, vec2((c.r * 255.0 + 0.5) / 256.0, 0.5)).r,
        texture(uCurves, vec2((c.g * 255.0 + 0.5) / 256.0, 0.5)).g,
        texture(uCurves, vec2((c.b * 255.0 + 0.5) / 256.0, 0.5)).b
    );
}

// LUT 3D como faixa 2D: fatias de azul lado a lado; interpola o azul na mão e r/g pelo hardware.
vec3 applyLut(vec3 c) {
    float n = uLutSize;
    c = clamp(c, 0.0, 1.0) * (n - 1.0);
    float b0 = floor(c.b);
    float b1 = min(b0 + 1.0, n - 1.0);
    float fb = c.b - b0;
    float w = n * n;
    vec2 uv0 = vec2((b0 * n + c.r + 0.5) / w, (c.g + 0.5) / n);
    vec2 uv1 = vec2((b1 * n + c.r + 0.5) / w, (c.g + 0.5) / n);
    return mix(texture(uLut, uv0).rgb, texture(uLut, uv1).rgb, fb);
}

// Estágios de tom e cor (sem vizinhança, por isso reaproveitados no unsharp).
vec3 grade(vec3 rgb) {
    rgb *= exp2(uExposure);
    rgb = (rgb - 0.5) * (1.0 + uContrast) + 0.5;

    float l = dot(rgb, LUMA);
    rgb *= 1.0 + uShadows * 0.6 * (1.0 - smoothstep(0.0, 0.5, l));
    rgb *= 1.0 + uHighlights * 0.6 * smoothstep(0.5, 1.0, l);
    // Brancos e pretos movem as pontas da curva de tom (mais estreitas que realces/sombras).
    rgb += uWhites * 0.25 * smoothstep(0.6, 1.0, l);
    rgb += uBlacks * 0.25 * (1.0 - smoothstep(0.0, 0.4, l));

    // Vibração: soma saturação só onde a cor ainda é pouco saturada (protege cores já fortes).
    float lum = dot(rgb, LUMA);
    float chroma = clamp(max(rgb.r, max(rgb.g, rgb.b)) - min(rgb.r, min(rgb.g, rgb.b)), 0.0, 1.0);
    rgb = mix(vec3(lum), rgb, 1.0 + uSaturation + uVibrance * (1.0 - chroma));

    rgb.r += uTemperature * 0.1;
    rgb.b -= uTemperature * 0.1;
    rgb.g -= uTint * 0.05;
    rgb.r += uTint * 0.025;
    rgb.b += uTint * 0.025;

    if (uHslActive > 0.5) rgb = applyHsl(rgb);
    if (uGradeActive > 0.5) rgb = applyGrading(rgb);
    if (uCurvesActive > 0.5) rgb = applyCurves(rgb);
    if (uLutSize > 0.5) rgb = mix(rgb, applyLut(rgb), uLutStrength);
    return rgb;
}

vec3 gradedAt(vec2 uv) {
    return grade(texture(uTexture, clampToImage(uv)).rgb);
}

// Claridade: contraste local nos meios-tons, contra um desfoque largo (2 anéis de 8 amostras).
// O raio é proporcional ao tamanho da imagem: preview, zoom e exportação ficam equivalentes.
vec3 applyClarity(vec3 base) {
    float radius = max(1.0, 0.012 * max(uImageRect.z, uImageRect.w));
    vec2 step = uInputSize.zw * radius;
    vec3 acc = base;
    for (int i = 0; i < 8; i++) {
        float a = float(i) * 0.785398;
        vec2 dir = vec2(cos(a), sin(a));
        acc += texture(uTexture, clampToImage(vTextureCoord + dir * step)).rgb;
        acc += texture(uTexture, clampToImage(vTextureCoord + dir * step * 0.5)).rgb;
    }
    vec3 blur = acc / 17.0;
    float detail = dot(base - blur, LUMA);
    float midMask = 1.0 - abs(dot(base, LUMA) * 2.0 - 1.0);
    return base + detail * uClarity * 1.5 * (0.4 + 0.6 * midMask);
}

// Remover névoa: estima a transmissão pelo canal mais escuro (aproximação do dark channel).
vec3 applyDehaze(vec3 base) {
    float dc = min(base.r, min(base.g, base.b));
    if (uDehaze > 0.0) {
        float t = clamp(1.0 - uDehaze * 0.85 * dc / 0.9, 0.2, 1.0);
        return (base - 0.9 * (1.0 - t)) / t;
    }
    return mix(base, vec3(0.9), -uDehaze * 0.4 * (1.0 - dc * 0.5));
}

// Glitch: deslocamento horizontal por faixa (em coordenadas de textura) para cada canal. A faixa
// depende só da posição do fragmento na imagem, então preview, zoom e exportação em tiles coincidem.
vec3 gGlitchX = vec3(0.0);

void setupGlitch() {
    vec2 iuv = imageUv();
    float seed = floor(uGlitchSeed + 0.5);
    float rows = mix(60.0, 6.0, uGlitchSize);
    float row = floor(iuv.y * rows);
    float on = step(rand(vec2(row, seed * 1.37 + 3.1)), uGlitch * 0.45);
    float shift = (rand(vec2(row + 17.0, seed)) - 0.5) * 2.0 * uGlitch * 0.2 * on;
    // Segunda camada: faixas finas, mais raras.
    float row2 = floor(iuv.y * rows * 5.0);
    float on2 = step(rand(vec2(row2, seed + 91.0)), uGlitch * 0.12);
    shift += (rand(vec2(row2 + 5.0, seed + 7.0)) - 0.5) * uGlitch * 0.1 * on2;
    // Separação RGB: sempre um pouco, bem maior dentro das faixas afetadas.
    float split = uGlitch * 0.012 * (0.35 + 2.0 * max(on, on2));
    float unit = uImageRect.z * uInputSize.z;
    gGlitchX = vec3(shift + split, shift, shift - split) * unit;
}

// Amostra com o glitch aplicado: cada canal lê com o seu deslocamento.
vec3 fetchAt(vec2 uv) {
    return vec3(
        texture(uTexture, clampToImage(uv + vec2(gGlitchX.r, 0.0))).r,
        texture(uTexture, clampToImage(uv + vec2(gGlitchX.g, 0.0))).g,
        texture(uTexture, clampToImage(uv + vec2(gGlitchX.b, 0.0))).b
    );
}

void main() {
    vec2 screenPx = uOutputFrame.xy + vTextureCoord * uInputSize.xy;
    if (screenPx.x < uClip.x || screenPx.y < uClip.y || screenPx.x > uClip.z || screenPx.y > uClip.w) {
        finalColor = vec4(0.0);
        return;
    }
    vec4 src = texture(uTexture, vTextureCoord);
    // Divisor antes/depois (só no preview): à esquerda de uSplit mostra a original crua.
    if (imageUv().x < uSplit) {
        finalColor = src;
        return;
    }
    float a = src.a;
    vec3 base = a > 0.0 ? src.rgb / a : vec3(0.0);
    if (a > 0.0) {
        if (uGlitch > 0.001) {
            setupGlitch();
            base = fetchAt(vTextureCoord) / a;
        }
    }
    if (abs(uClarity) > 0.001) base = applyClarity(base);
    if (abs(uDehaze) > 0.001) base = applyDehaze(base);
    vec3 rgb = grade(base);

    // Nitidez: unsharp mask (> 0) ou suavização (< 0) contra o desfoque de 4 vizinhos.
    if (abs(uSharpness) > 0.001) {
        vec2 px = uInputSize.zw * max(0.5, uSharpnessRadius * 0.0012 * max(uImageRect.z, uImageRect.w));
        vec3 blur = (gradedAt(vTextureCoord + vec2(px.x, 0.0))
            + gradedAt(vTextureCoord - vec2(px.x, 0.0))
            + gradedAt(vTextureCoord + vec2(0.0, px.y))
            + gradedAt(vTextureCoord - vec2(0.0, px.y))) * 0.25;
        float k = uSharpness > 0.0 ? 2.0 : 1.0;
        rgb += (rgb - blur) * uSharpness * k;
    }

    // Efeitos: desbotado, vinheta, granulação.
    rgb = rgb * (1.0 - uFade * 0.25) + uFade * 0.1;
    float edge = length(imageUv() - 0.5) * 1.4142;
    rgb *= 1.0 - uVignette * smoothstep(uVignetteMidpoint, uVignetteMidpoint + uVignetteFeather, edge);
    float midtones = 1.0 - abs(dot(rgb, LUMA) - 0.5) * 1.6;
    rgb += (rand(floor((gl_FragCoord.xy + uGrainOffset) / uGrainSize)) - 0.5) * uGrain * 0.3 * midtones;

    vec3 outRgb = clamp(rgb, 0.0, 1.0);
    // Aviso de estouro (só no preview): vermelho = realce estourado, azul = sombra estourada.
    if (uShowClip > 0.5) {
        if (max(rgb.r, max(rgb.g, rgb.b)) >= 0.999) outRgb = vec3(1.0, 0.1, 0.1);
        else if (min(rgb.r, min(rgb.g, rgb.b)) <= 0.001) outRgb = vec3(0.1, 0.3, 1.0);
    }
    finalColor = vec4(outRgb * a, a);
}
`

export type TileContext = {
    /** Origem do recorte na imagem completa, e tamanho da imagem completa, em px. */
    originX: number
    originY: number
    fullW: number
    fullH: number
}

export type EditFilter = {
    filter: Filter
    setParams: (params: EditParams) => void
    /** LUT 3D importado (null remove). */
    setLut: (lut: Lut | null) => void
    /** Só a exportação usa: informa onde este recorte está na imagem inteira. */
    setTile: (tile: TileContext) => void
    /** Só o preview usa: onde a imagem está na tela (px do renderer). */
    setImageRect: (rect: { x: number; y: number; w: number; h: number }) => void
    /** Só o preview usa: recorte da área visível, em px do renderer. */
    setClip: (rect: { x: number; y: number; w: number; h: number }) => void
    /** Só o preview usa: divisor (0 = off, 0..1 = posição) e aviso de estouro. */
    setView: (view: { split: number; showClip: boolean }) => void
    /** Solta o filtro e as texturas dele. Chamar antes de destruir o app/texturas, senão o Pixi avisa. */
    dispose: () => void
}

const lutSource = (resource: Uint8Array, width: number, height: number) =>
    new BufferImageSource({
        resource,
        width,
        height,
        format: 'rgba8unorm',
        scaleMode: 'linear',
        autoGenerateMipmaps: false,
    })

export const createEditFilter = (initial: EditParams): EditFilter => {
    const defs: Record<string, UniformData> = {}
    for (const [name, value] of Object.entries(toUniforms(initial)))
        defs[name] = { value, type: 'f32' }
    defs.uGrainOffset = { value: new Float32Array([0, 0]), type: 'vec2<f32>' }
    defs.uImageRect = { value: new Float32Array([0, 0, 1, 1]), type: 'vec4<f32>' }
    // Sem recorte por padrão (a exportação não usa).
    defs.uClip = { value: new Float32Array([-1e9, -1e9, 1e9, 1e9]), type: 'vec4<f32>' }
    for (const name of [
        'uSplit',
        'uShowClip',
        'uHslActive',
        'uGradeActive',
        'uCurvesActive',
        'uLutSize',
    ]) {
        defs[name] = { value: 0, type: 'f32' }
    }
    const group = new UniformGroup(defs)

    const curveData = new Uint8Array(256 * 4)
    const curvesSource = lutSource(curveData, 256, 1)
    const lut3dSource = lutSource(new Uint8Array([255, 255, 255, 255]), 1, 1)

    const filter = new Filter({
        glProgram: GlProgram.from({
            vertex: defaultFilterVert,
            fragment: EDIT_FRAGMENT,
            name: 'edit-filter',
        }),
        resources: { editUniforms: group, uCurves: curvesSource, uLut: lut3dSource },
    })

    let lastCurves: EditParams['curves'] | null = null

    // Inclui o ajuste de "todas as cores": ele também precisa ligar o estágio de HSL.
    const hslKeys: ParamKey[] = [
        'hslAllHue',
        'hslAllSat',
        'hslAllLum',
        ...HSL_BANDS.flatMap((b) => (['Hue', 'Sat', 'Lum'] as const).map((p) => hslKey(b, p))),
    ]
    const gradeKeys = GRADE_ZONES.flatMap((z) =>
        (['Sat', 'Lum'] as const).map((p) => gradeKey(z, p)),
    )

    // Escreve direto nos uniforms: nenhum re-render React passa por aqui.
    const setParams = (params: EditParams) => {
        for (const [name, value] of Object.entries(toUniforms(params))) group.uniforms[name] = value
        group.uniforms.uHslActive = hslKeys.some((k) => params[k] !== 0) ? 1 : 0
        group.uniforms.uGradeActive = gradeKeys.some((k) => params[k] !== 0) ? 1 : 0
        // Curvas são imutáveis: só reconstrói a LUT quando o objeto muda.
        if (params.curves !== lastCurves) {
            lastCurves = params.curves
            const identity = (Object.values(params.curves) as [number, number][][]).every(
                (pts) => pts.length === 2 && pts[0]?.[1] === 0 && pts[1]?.[1] === 1,
            )
            group.uniforms.uCurvesActive = identity ? 0 : 1
            if (!identity) {
                buildCurveLut(params.curves, curveData)
                curvesSource.update()
            }
        }
    }
    setParams(initial)

    const setLut = (lut: Lut | null) => {
        if (!lut) {
            group.uniforms.uLutSize = 0
            return
        }
        lut3dSource.resource = lut.data
        lut3dSource.resize(lut.size * lut.size, lut.size)
        lut3dSource.update()
        group.uniforms.uLutSize = lut.size
    }

    // O tile é desenhado em (0,0) do canvas de exportação: para a imagem inteira cair no lugar
    // certo, o retângulo dela começa em -origem e tem o tamanho total.
    const setTile = (t: TileContext) => {
        group.uniforms.uImageRect = new Float32Array([-t.originX, -t.originY, t.fullW, t.fullH])
        group.uniforms.uGrainOffset = new Float32Array([t.originX, t.originY])
    }

    /** Preview: retângulo da imagem na tela, em unidades de mundo (px CSS). */
    const setImageRect = (rect: { x: number; y: number; w: number; h: number }) => {
        group.uniforms.uImageRect = new Float32Array([rect.x, rect.y, rect.w, rect.h])
    }

    /** Preview: recorta a imagem a este retângulo da tela (px CSS). */
    const setClip = (rect: { x: number; y: number; w: number; h: number }) => {
        group.uniforms.uClip = new Float32Array([rect.x, rect.y, rect.x + rect.w, rect.y + rect.h])
    }

    const setView = (view: { split: number; showClip: boolean }) => {
        group.uniforms.uSplit = view.split
        group.uniforms.uShowClip = view.showClip ? 1 : 0
    }

    // O filtro vai primeiro: ele remove os listeners das texturas e evita o aviso de "destroyed while still bound".
    const dispose = () => {
        filter.destroy()
        curvesSource.destroy()
        lut3dSource.destroy()
    }

    return { filter, setParams, setLut, setTile, setImageRect, setClip, setView, dispose }
}
