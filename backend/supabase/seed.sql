-- Presets oficiais por categoria. Chaves e faixas seguem frontend/src/editor/params.ts.
-- Idempotente por nome: insere os que faltam e só atualiza categoria e ordem dos que já existem
-- (os params de um preset já criado nunca são sobrescritos, edições feitas no painel ficam).

with v (name, category, params, sort_order) as (
values
    ('Original', 'Geral', '{}', 0),
    ('Portra 400', 'Filme', '{"exposure":0.15,"contrast":-0.08,"highlights":-0.2,"shadows":0.2,"saturation":-0.05,"vibrance":0.15,"temperature":8,"tint":3,"fade":0.12,"grain":0.25,"hslOrangeSat":0.1,"hslGreenSat":-0.15,"gradeShadowsHue":210,"gradeShadowsSat":0.12,"gradeHighlightsHue":40,"gradeHighlightsSat":0.12}', 10),
    ('Ektar 100', 'Filme', '{"contrast":0.2,"saturation":0.25,"vibrance":0.15,"highlights":-0.1,"shadows":0.05,"clarity":0.1,"temperature":3,"grain":0.1,"hslRedSat":0.15,"hslBlueSat":0.15}', 20),
    ('Gold 200', 'Filme', '{"contrast":0.1,"saturation":0.05,"temperature":25,"tint":5,"fade":0.15,"grain":0.4,"vignette":0.15,"gradeHighlightsHue":45,"gradeHighlightsSat":0.2,"gradeShadowsHue":25,"gradeShadowsSat":0.1}', 30),
    ('Kodachrome', 'Filme', '{"contrast":0.22,"saturation":0.2,"temperature":12,"grain":0.2,"vignette":0.15,"hslRedSat":0.2,"hslYellowSat":0.1,"hslBlueLum":-0.1}', 40),
    ('Fuji Superia', 'Filme', '{"contrast":0.12,"saturation":0.15,"temperature":-5,"tint":-6,"fade":0.06,"grain":0.35,"hslGreenSat":0.15,"hslBlueSat":0.1,"gradeShadowsHue":150,"gradeShadowsSat":0.1}', 50),
    ('Classic Chrome', 'Filme', '{"contrast":0.15,"saturation":-0.2,"shadows":-0.05,"highlights":-0.1,"grain":0.2,"hslBlueLum":-0.2,"hslBlueSat":0.1}', 60),
    ('Velvia', 'Filme', '{"contrast":0.25,"saturation":0.4,"vibrance":0.1,"shadows":-0.1,"hslGreenSat":0.2,"hslBlueSat":0.15,"grain":0.1}', 70),
    ('Cinestill 800T', 'Filme', '{"contrast":0.1,"highlights":-0.15,"saturation":0.05,"temperature":-20,"tint":6,"clarity":-0.1,"grain":0.45,"gradeShadowsHue":195,"gradeShadowsSat":0.3,"gradeHighlightsHue":15,"gradeHighlightsSat":0.25}', 80),
    ('Preto e branco', 'Preto e branco', '{"contrast":0.25,"saturation":-1,"grain":0.35,"vignette":0.2}', 90),
    ('Tri-X 400', 'Preto e branco', '{"saturation":-1,"contrast":0.3,"blacks":-0.1,"whites":0.1,"grain":0.65,"grainSize":1.6,"vignette":0.2,"curves":{"rgb":[[0,0],[0.25,0.2],[0.75,0.8],[1,1]]}}', 100),
    ('Ilford HP5', 'Preto e branco', '{"saturation":-1,"contrast":0.12,"shadows":0.1,"highlights":-0.1,"fade":0.05,"grain":0.5,"grainSize":1.3}', 110),
    ('Noir', 'Preto e branco', '{"saturation":-1,"contrast":0.4,"blacks":-0.25,"whites":0.15,"clarity":0.25,"grain":0.3,"vignette":0.5}', 120),
    ('Ghibli', 'Anime', '{"exposure":0.15,"contrast":-0.1,"highlights":-0.15,"shadows":0.3,"saturation":0.1,"vibrance":0.3,"temperature":8,"fade":0.1,"clarity":-0.15,"sharpness":-0.1,"hslGreenSat":0.25,"hslGreenLum":0.1,"hslYellowSat":0.15,"hslBlueSat":0.15,"hslBlueLum":0.1,"hslAquaSat":0.15,"gradeShadowsHue":200,"gradeShadowsSat":0.1,"gradeHighlightsHue":50,"gradeHighlightsSat":0.1}', 130),
    ('Ghibli verão', 'Anime', '{"exposure":0.2,"contrast":0.05,"highlights":-0.2,"shadows":0.25,"vibrance":0.35,"saturation":0.12,"temperature":5,"clarity":-0.1,"hslGreenSat":0.3,"hslGreenLum":0.12,"hslBlueSat":0.25,"hslBlueLum":0.08,"hslAquaSat":0.2,"whites":0.1}', 140),
    ('Ghibli entardecer', 'Anime', '{"exposure":0.05,"contrast":0.05,"shadows":0.25,"vibrance":0.3,"temperature":22,"tint":6,"fade":0.08,"clarity":-0.12,"hslOrangeSat":0.2,"hslYellowSat":0.15,"hslBlueSat":0.1,"gradeHighlightsHue":35,"gradeHighlightsSat":0.25,"gradeShadowsHue":270,"gradeShadowsSat":0.15}', 150),
    ('Anime vívido', 'Anime', '{"contrast":0.25,"saturation":0.35,"vibrance":0.25,"shadows":0.1,"highlights":-0.05,"sharpness":0.35,"clarity":0.15,"hslBlueSat":0.2,"hslRedSat":0.1,"hslMagentaSat":0.15}', 160),
    ('Shinkai', 'Anime', '{"contrast":0.2,"saturation":0.25,"vibrance":0.2,"whites":0.15,"blacks":-0.1,"dehaze":0.15,"clarity":-0.05,"hslBlueSat":0.25,"hslAquaSat":0.2,"gradeShadowsHue":230,"gradeShadowsSat":0.3,"gradeHighlightsHue":330,"gradeHighlightsSat":0.15}', 170),
    ('Pastel anime', 'Anime', '{"exposure":0.2,"contrast":-0.15,"saturation":-0.05,"vibrance":0.3,"shadows":0.3,"fade":0.2,"clarity":-0.1,"gradeHighlightsHue":330,"gradeHighlightsSat":0.12}', 180),
    ('Vívido', 'Cores e contraste', '{"contrast":0.2,"saturation":0.35,"highlights":-0.1,"shadows":0.15,"sharpness":0.3}', 190),
    ('Cores ricas', 'Cores e contraste', '{"contrast":0.22,"vibrance":0.35,"saturation":0.12,"highlights":-0.2,"shadows":0.2,"whites":0.1,"blacks":-0.08,"clarity":0.15}', 200),
    ('Pop colorido', 'Cores e contraste', '{"contrast":0.3,"saturation":0.3,"vibrance":0.2,"clarity":0.2,"sharpness":0.25}', 210),
    ('HDR suave', 'Cores e contraste', '{"contrast":0.1,"highlights":-0.5,"shadows":0.5,"vibrance":0.25,"clarity":0.35,"dehaze":0.15}', 220),
    ('Cores profundas', 'Cores e contraste', '{"contrast":0.3,"blacks":-0.15,"saturation":0.2,"vignette":0.2,"clarity":0.1}', 230),
    ('Dramático', 'Dramático', '{"contrast":0.35,"highlights":-0.3,"shadows":-0.15,"blacks":-0.2,"saturation":-0.1,"clarity":0.3,"dehaze":0.15,"vignette":0.45}', 240),
    ('Moody', 'Dramático', '{"exposure":-0.35,"contrast":0.25,"saturation":-0.2,"shadows":-0.1,"fade":0.08,"vignette":0.5,"gradeShadowsHue":210,"gradeShadowsSat":0.2}', 250),
    ('Tempestade', 'Dramático', '{"contrast":0.3,"saturation":-0.3,"temperature":-25,"clarity":0.3,"dehaze":0.25,"vignette":0.35}', 260),
    ('Sombras profundas', 'Dramático', '{"exposure":-0.2,"contrast":0.4,"blacks":-0.3,"shadows":-0.25,"highlights":-0.15,"clarity":0.2,"vignette":0.35}', 270),
    ('Golden hour', 'Luz e clima', '{"exposure":0.1,"highlights":-0.2,"shadows":0.2,"whites":0.1,"saturation":0.1,"vibrance":0.2,"temperature":35,"tint":5,"vignette":0.15,"gradeHighlightsHue":40,"gradeHighlightsSat":0.25,"gradeShadowsHue":20,"gradeShadowsSat":0.1}', 280),
    ('Pôr do sol', 'Luz e clima', '{"contrast":0.2,"saturation":0.25,"temperature":28,"tint":10,"vignette":0.2,"hslOrangeSat":0.2,"hslRedSat":0.15,"gradeHighlightsHue":25,"gradeHighlightsSat":0.3,"gradeShadowsHue":280,"gradeShadowsSat":0.2}', 290),
    ('Hora azul', 'Luz e clima', '{"exposure":-0.1,"contrast":0.15,"saturation":0.1,"temperature":-30,"tint":-3,"gradeShadowsHue":225,"gradeShadowsSat":0.3,"gradeHighlightsHue":200,"gradeHighlightsSat":0.15}', 300),
    ('Amanhecer', 'Luz e clima', '{"exposure":0.15,"contrast":-0.05,"shadows":0.2,"fade":0.1,"temperature":12,"tint":8,"vibrance":0.2,"gradeHighlightsHue":340,"gradeHighlightsSat":0.2}', 310),
    ('Verão', 'Luz e clima', '{"exposure":0.2,"contrast":0.1,"saturation":0.15,"vibrance":0.3,"temperature":15}', 320),
    ('Quente', 'Luz e clima', '{"exposure":0.1,"temperature":35,"tint":5,"saturation":0.1}', 330),
    ('Frio', 'Luz e clima', '{"temperature":-35,"tint":-5,"contrast":0.05,"fade":0.1}', 340),
    ('Teal e laranja', 'Cinema', '{"contrast":0.2,"saturation":0.05,"hslOrangeSat":0.1,"gradeShadowsHue":190,"gradeShadowsSat":0.35,"gradeHighlightsHue":30,"gradeHighlightsSat":0.3}', 350),
    ('Blockbuster', 'Cinema', '{"contrast":0.3,"blacks":-0.1,"highlights":-0.1,"saturation":-0.05,"clarity":0.15,"vignette":0.2,"gradeShadowsHue":200,"gradeShadowsSat":0.25,"gradeHighlightsHue":35,"gradeHighlightsSat":0.2}', 360),
    ('Matte', 'Cinema', '{"contrast":-0.05,"saturation":-0.1,"blacks":0.1,"fade":0.3}', 370),
    ('Neon noir', 'Cinema', '{"contrast":0.25,"saturation":0.1,"vignette":0.3,"blacks":-0.1,"gradeShadowsHue":260,"gradeShadowsSat":0.35,"gradeHighlightsHue":320,"gradeHighlightsSat":0.3}', 380),
    ('Pastel de cinema', 'Cinema', '{"exposure":0.1,"contrast":-0.05,"saturation":0.1,"temperature":10,"fade":0.08,"gradeHighlightsHue":50,"gradeHighlightsSat":0.15,"gradeShadowsHue":15,"gradeShadowsSat":0.12}', 390),
    ('Retrô', 'Vintage', '{"exposure":-0.4,"contrast":0.1,"saturation":-0.25,"temperature":15,"grain":0.6,"sharpness":-0.3,"vignette":0.3}', 400),
    ('Filme fade', 'Vintage', '{"contrast":-0.1,"saturation":-0.15,"fade":0.45,"grain":0.4,"vignette":0.15}', 410),
    ('Sépia', 'Vintage', '{"saturation":-1,"contrast":0.1,"fade":0.1,"grain":0.3,"vignette":0.3,"gradeMidtonesHue":35,"gradeMidtonesSat":0.45}', 420),
    ('Anos 70', 'Vintage', '{"contrast":-0.1,"saturation":0.1,"temperature":20,"fade":0.25,"grain":0.5,"vignette":0.3,"gradeShadowsHue":20,"gradeShadowsSat":0.2,"gradeHighlightsHue":50,"gradeHighlightsSat":0.2}', 430),
    ('Polaroid', 'Vintage', '{"contrast":0.1,"saturation":-0.1,"temperature":10,"fade":0.2,"grain":0.3,"vignette":0.3,"gradeShadowsHue":180,"gradeShadowsSat":0.15,"gradeHighlightsHue":50,"gradeHighlightsSat":0.2}', 440),
    ('Anos 90', 'Vintage', '{"exposure":0.15,"contrast":0.15,"saturation":0.1,"whites":0.2,"temperature":6,"grain":0.45,"vignette":0.35,"hslGreenSat":-0.1}', 450),
    ('Desbotado', 'Vintage', '{"contrast":-0.15,"saturation":-0.25,"fade":0.4}', 460),
    -- Lifestyle
    ('Clean girl', 'Lifestyle', '{"exposure":0.25,"contrast":-0.12,"highlights":-0.15,"shadows":0.25,"saturation":-0.12,"vibrance":0.1,"temperature":8,"tint":2,"fade":0.08,"clarity":-0.1,"hslOrangeLum":0.12,"hslOrangeSat":-0.05}', 470),
    ('Valencia', 'Lifestyle', '{"exposure":0.1,"contrast":-0.05,"saturation":0.05,"temperature":18,"tint":4,"fade":0.18,"shadows":0.15,"gradeShadowsHue":30,"gradeShadowsSat":0.12,"gradeHighlightsHue":50,"gradeHighlightsSat":0.15}', 480),
    ('Moody lifestyle', 'Lifestyle', '{"exposure":-0.15,"contrast":0.15,"highlights":-0.2,"saturation":-0.1,"fade":0.1,"hslGreenSat":-0.35,"hslGreenLum":-0.2,"hslOrangeSat":-0.1,"hslOrangeLum":-0.05,"gradeShadowsHue":205,"gradeShadowsSat":0.2,"vignette":0.25}', 490),
    ('Airy e claro', 'Lifestyle', '{"exposure":0.45,"contrast":-0.2,"highlights":-0.25,"shadows":0.35,"whites":0.1,"saturation":-0.08,"vibrance":0.1,"fade":0.12,"clarity":-0.12,"temperature":4}', 500),
    ('Y2K digicam', 'Lifestyle', '{"exposure":0.2,"contrast":0.25,"highlights":0.1,"saturation":0.1,"temperature":-8,"grain":0.45,"grainSize":1.4,"sharpness":0.3,"vignette":0.35,"gradeHighlightsHue":200,"gradeHighlightsSat":0.15}', 510),
    ('Câmera descartável', 'Lifestyle', '{"exposure":0.15,"contrast":0.2,"saturation":0.1,"temperature":14,"tint":-3,"fade":0.1,"grain":0.5,"grainSize":1.5,"vignette":0.4,"gradeHighlightsHue":45,"gradeHighlightsSat":0.18}', 520),
    -- Filme extra
    ('Portra 160', 'Filme', '{"exposure":0.1,"contrast":-0.12,"highlights":-0.15,"shadows":0.15,"saturation":-0.08,"vibrance":0.12,"temperature":5,"fade":0.1,"grain":0.15,"hslOrangeSat":0.05,"hslGreenSat":-0.12,"gradeShadowsHue":200,"gradeShadowsSat":0.08}', 530),
    ('Fuji Pro 400H', 'Filme', '{"exposure":0.2,"contrast":-0.1,"highlights":-0.1,"shadows":0.2,"saturation":-0.05,"temperature":-6,"tint":-8,"fade":0.12,"grain":0.2,"hslGreenSat":0.05,"hslGreenHue":-0.1,"hslAquaSat":0.1,"gradeShadowsHue":160,"gradeShadowsSat":0.12,"gradeHighlightsHue":340,"gradeHighlightsSat":0.08}', 540),
    ('Provia', 'Filme', '{"contrast":0.12,"saturation":0.12,"vibrance":0.1,"temperature":-2,"grain":0.08,"hslBlueSat":0.1,"hslRedSat":0.05}', 550),
    ('Agfa Vista', 'Filme', '{"contrast":0.15,"saturation":0.15,"temperature":10,"tint":-4,"fade":0.1,"grain":0.35,"hslRedSat":0.2,"hslGreenHue":0.08,"hslGreenSat":-0.05,"gradeShadowsHue":170,"gradeShadowsSat":0.08}', 560),
    ('Lomo', 'Filme', '{"contrast":0.3,"saturation":0.3,"vibrance":0.1,"temperature":-5,"tint":4,"grain":0.3,"vignette":0.65,"vignetteMidpoint":0.2,"blacks":-0.1}', 570),
    ('Cross process', 'Filme', '{"contrast":0.3,"saturation":0.25,"temperature":-10,"tint":-10,"grain":0.25,"vignette":0.2,"curves":{"r":[[0,0.05],[0.5,0.45],[1,1]],"g":[[0,0],[0.5,0.55],[1,1]],"b":[[0,0.15],[0.5,0.5],[1,0.85]]}}', 580),
    -- Cinema extra
    ('Matrix', 'Cinema', '{"contrast":0.25,"saturation":-0.15,"temperature":-12,"tint":-25,"blacks":-0.1,"clarity":0.15,"gradeShadowsHue":140,"gradeShadowsSat":0.3,"gradeMidtonesHue":130,"gradeMidtonesSat":0.2,"gradeHighlightsHue":120,"gradeHighlightsSat":0.12}', 590),
    ('Blade Runner', 'Cinema', '{"exposure":-0.2,"contrast":0.3,"saturation":0.1,"blacks":-0.1,"clarity":0.1,"vignette":0.35,"gradeShadowsHue":185,"gradeShadowsSat":0.4,"gradeHighlightsHue":20,"gradeHighlightsSat":0.4}', 600),
    ('Wes Anderson', 'Cinema', '{"exposure":0.15,"contrast":-0.05,"saturation":0.1,"vibrance":0.2,"temperature":10,"fade":0.12,"hslYellowSat":0.2,"hslRedSat":-0.1,"hslOrangeLum":0.1,"gradeHighlightsHue":340,"gradeHighlightsSat":0.15,"gradeShadowsHue":45,"gradeShadowsSat":0.1}', 610),
    ('Mad Max', 'Cinema', '{"contrast":0.35,"saturation":-0.15,"temperature":28,"clarity":0.3,"dehaze":0.2,"blacks":-0.15,"hslOrangeSat":0.3,"hslBlueSat":-0.2,"gradeShadowsHue":190,"gradeShadowsSat":0.25,"gradeHighlightsHue":35,"gradeHighlightsSat":0.3}', 620),
    ('Duna', 'Cinema', '{"exposure":0.05,"contrast":0.15,"saturation":-0.45,"temperature":22,"fade":0.1,"clarity":0.1,"dehaze":0.1,"gradeMidtonesHue":38,"gradeMidtonesSat":0.3,"gradeHighlightsHue":45,"gradeHighlightsSat":0.2}', 630),
    ('Joker', 'Cinema', '{"exposure":-0.2,"contrast":0.2,"saturation":-0.2,"tint":-15,"temperature":8,"fade":0.1,"grain":0.4,"vignette":0.4,"hslGreenSat":0.1,"gradeShadowsHue":150,"gradeShadowsSat":0.25,"gradeHighlightsHue":50,"gradeHighlightsSat":0.2}', 640),
    -- Paisagem
    ('Floresta', 'Paisagem', '{"contrast":0.2,"saturation":0.05,"vibrance":0.15,"shadows":0.1,"clarity":0.2,"dehaze":0.1,"hslGreenSat":0.3,"hslGreenLum":-0.15,"hslYellowSat":0.1,"hslYellowHue":-0.1,"gradeShadowsHue":150,"gradeShadowsSat":0.15}', 650),
    ('Deserto', 'Paisagem', '{"exposure":0.05,"contrast":0.25,"saturation":0.1,"temperature":30,"tint":4,"clarity":0.25,"dehaze":0.2,"hslOrangeSat":0.25,"hslYellowSat":0.15,"hslBlueSat":0.15,"gradeShadowsHue":20,"gradeShadowsSat":0.15}', 660),
    ('Tropical', 'Paisagem', '{"exposure":0.1,"contrast":0.15,"saturation":0.2,"vibrance":0.3,"temperature":6,"dehaze":0.1,"hslAquaSat":0.35,"hslAquaLum":0.05,"hslBlueSat":0.25,"hslGreenSat":0.2,"hslGreenHue":0.05}', 670),
    ('Outono', 'Paisagem', '{"contrast":0.15,"saturation":0.1,"vibrance":0.2,"temperature":22,"clarity":0.15,"fade":0.05,"hslOrangeSat":0.3,"hslRedSat":0.2,"hslYellowSat":0.2,"hslGreenHue":-0.3,"hslGreenSat":-0.1,"gradeShadowsHue":20,"gradeShadowsSat":0.15}', 680),
    ('Inverno', 'Paisagem', '{"exposure":0.15,"contrast":0.12,"whites":0.15,"saturation":-0.1,"temperature":-28,"tint":-3,"clarity":0.15,"hslBlueSat":0.1,"gradeShadowsHue":220,"gradeShadowsSat":0.25,"gradeHighlightsHue":200,"gradeHighlightsSat":0.08}', 690),
    -- Retrato
    ('Pele suave', 'Retrato', '{"exposure":0.15,"contrast":-0.1,"highlights":-0.1,"shadows":0.15,"saturation":-0.05,"vibrance":0.1,"clarity":-0.3,"sharpness":-0.1,"hslOrangeSat":-0.08,"hslOrangeLum":0.15,"hslRedSat":-0.1}', 700),
    ('Pele dourada', 'Retrato', '{"exposure":0.1,"contrast":0.05,"highlights":-0.15,"shadows":0.15,"saturation":0.05,"vibrance":0.15,"temperature":20,"tint":3,"clarity":-0.1,"hslOrangeSat":0.12,"hslOrangeLum":0.08,"gradeHighlightsHue":40,"gradeHighlightsSat":0.18}', 710),
    ('Retrato P&B suave', 'Retrato', '{"exposure":0.1,"saturation":-1,"contrast":0.05,"highlights":-0.1,"shadows":0.2,"clarity":-0.2,"fade":0.05,"grain":0.25,"hslOrangeLum":0.2,"hslRedLum":0.1}', 720),
    -- Urbano
    ('Cyberpunk', 'Urbano', '{"contrast":0.3,"saturation":0.2,"vibrance":0.2,"blacks":-0.15,"clarity":0.15,"vignette":0.3,"hslBlueSat":0.25,"hslMagentaSat":0.3,"hslAquaSat":0.25,"gradeShadowsHue":250,"gradeShadowsSat":0.4,"gradeHighlightsHue":320,"gradeHighlightsSat":0.35,"gradeMidtonesHue":190,"gradeMidtonesSat":0.12}', 730),
    ('Vaporwave', 'Urbano', '{"exposure":0.1,"contrast":0.05,"saturation":0.15,"vibrance":0.25,"fade":0.15,"hslMagentaSat":0.3,"hslPurpleSat":0.25,"hslAquaSat":0.25,"gradeShadowsHue":270,"gradeShadowsSat":0.3,"gradeHighlightsHue":330,"gradeHighlightsSat":0.3,"gradeMidtonesHue":185,"gradeMidtonesSat":0.12}', 740),
    ('Synthwave', 'Urbano', '{"contrast":0.3,"saturation":0.2,"blacks":-0.2,"clarity":0.1,"vignette":0.35,"hslMagentaSat":0.3,"hslPurpleSat":0.3,"hslBlueSat":0.2,"gradeShadowsHue":265,"gradeShadowsSat":0.45,"gradeHighlightsHue":335,"gradeHighlightsSat":0.4}', 750),
    ('Noite na cidade', 'Urbano', '{"exposure":-0.1,"contrast":0.2,"highlights":-0.2,"shadows":0.2,"blacks":-0.1,"saturation":0.05,"vibrance":0.15,"temperature":-8,"clarity":0.1,"vignette":0.25,"hslOrangeSat":0.15,"hslYellowSat":0.1,"gradeShadowsHue":225,"gradeShadowsSat":0.25,"gradeHighlightsHue":35,"gradeHighlightsSat":0.15}', 760),
    ('Street grit', 'Urbano', '{"contrast":0.3,"saturation":-0.35,"shadows":-0.05,"highlights":-0.1,"blacks":-0.1,"clarity":0.45,"dehaze":0.15,"sharpness":0.3,"grain":0.4,"grainSize":1.3,"vignette":0.25}', 770),
    -- Preto e branco extra
    ('P&B suave', 'Preto e branco', '{"saturation":-1,"contrast":-0.05,"highlights":-0.1,"shadows":0.2,"fade":0.12,"clarity":-0.1,"grain":0.2}', 780),
    ('P&B duro', 'Preto e branco', '{"saturation":-1,"contrast":0.55,"blacks":-0.3,"whites":0.2,"clarity":0.35,"sharpness":0.25,"grain":0.4,"vignette":0.3}', 790),
    ('Infravermelho', 'Preto e branco', '{"saturation":-1,"contrast":0.2,"clarity":0.15,"dehaze":0.1,"grain":0.3,"vignette":0.2,"hslGreenLum":0.6,"hslYellowLum":0.35,"hslBlueLum":-0.5,"hslAquaLum":-0.4}', 800),
    ('Selênio', 'Preto e branco', '{"saturation":-1,"contrast":0.2,"blacks":-0.05,"grain":0.25,"vignette":0.15,"gradeShadowsHue":280,"gradeShadowsSat":0.2,"gradeMidtonesHue":300,"gradeMidtonesSat":0.08}', 810),
    -- Duotone
    ('Cianótipo', 'Duotone', '{"saturation":-1,"contrast":0.2,"fade":0.05,"grain":0.2,"vignette":0.2,"gradeShadowsHue":220,"gradeShadowsSat":0.7,"gradeMidtonesHue":210,"gradeMidtonesSat":0.6,"gradeHighlightsHue":195,"gradeHighlightsSat":0.2}', 820),
    ('Duotone azul e rosa', 'Duotone', '{"saturation":-1,"contrast":0.2,"grain":0.15,"gradeShadowsHue":230,"gradeShadowsSat":0.8,"gradeMidtonesHue":280,"gradeMidtonesSat":0.3,"gradeHighlightsHue":340,"gradeHighlightsSat":0.7}', 830),
    ('Duotone dourado e azul', 'Duotone', '{"saturation":-1,"contrast":0.2,"grain":0.15,"gradeShadowsHue":215,"gradeShadowsSat":0.7,"gradeHighlightsHue":42,"gradeHighlightsSat":0.7}', 840),
    ('Duotone verde e laranja', 'Duotone', '{"saturation":-1,"contrast":0.25,"grain":0.15,"gradeShadowsHue":160,"gradeShadowsSat":0.7,"gradeHighlightsHue":30,"gradeHighlightsSat":0.7}', 850),
    ('Split dourado e azul', 'Duotone', '{"contrast":0.1,"saturation":-0.1,"gradeShadowsHue":215,"gradeShadowsSat":0.35,"gradeHighlightsHue":42,"gradeHighlightsSat":0.35}', 860),
    -- Baixa qualidade
    ('Webcam 2005', 'Baixa qualidade', '{"exposure":0.1,"contrast":0.2,"highlights":0.2,"saturation":-0.2,"temperature":-10,"tint":8,"sharpness":-0.5,"clarity":-0.15,"grain":0.6,"grainSize":3,"vignette":0.2}', 870),
    ('Celular antigo', 'Baixa qualidade', '{"contrast":0.3,"whites":0.2,"saturation":-0.1,"temperature":6,"fade":0.1,"sharpness":-0.6,"grain":0.5,"grainSize":3.5,"clarity":-0.2}', 880),
    ('JPEG torrado', 'Baixa qualidade', '{"contrast":0.4,"saturation":0.35,"blacks":-0.2,"whites":0.15,"clarity":0.45,"sharpness":0.8,"sharpnessRadius":0.5,"grain":0.4,"grainSize":2}', 890),
    ('Câmera de segurança', 'Baixa qualidade', '{"exposure":0.1,"contrast":0.3,"saturation":-0.85,"tint":-15,"temperature":-6,"sharpness":-0.4,"grain":0.7,"grainSize":3,"vignette":0.4}', 900),
    ('Xerox', 'Baixa qualidade', '{"saturation":-1,"contrast":0.6,"whites":0.2,"grain":0.6,"grainSize":2.5,"sharpness":0.2,"vignette":0.15,"curves":{"rgb":[[0,0],[0.4,0.15],[0.6,0.9],[1,1]]}}', 910),
    ('Miniatura 240p', 'Baixa qualidade', '{"contrast":0.15,"saturation":0.1,"fade":0.08,"sharpness":-0.8,"sharpnessRadius":2,"clarity":-0.3,"grain":0.35,"grainSize":4}', 920),
    ('Flash de celular', 'Baixa qualidade', '{"exposure":0.3,"contrast":0.35,"highlights":0.2,"shadows":-0.3,"temperature":-12,"saturation":-0.1,"sharpness":-0.2,"grain":0.5,"grainSize":2.5,"vignette":0.45}', 930),
    ('Compartilhado no zap', 'Baixa qualidade', '{"contrast":0.15,"saturation":0.05,"fade":0.12,"sharpness":-0.55,"clarity":-0.25,"grain":0.3,"grainSize":3,"temperature":4,"whites":0.1}', 940),
    -- Retro digital
    ('VHS', 'Retro digital', '{"contrast":0.15,"saturation":0.1,"temperature":8,"tint":-6,"fade":0.2,"sharpness":-0.5,"clarity":-0.2,"grain":0.45,"grainSize":2.5,"hslRedSat":0.25,"hslBlueSat":0.15,"gradeShadowsHue":260,"gradeShadowsSat":0.2,"gradeHighlightsHue":30,"gradeHighlightsSat":0.12,"curves":{"rgb":[[0,0.06],[0.5,0.5],[1,0.95]]}}', 950),
    ('Camcorder anos 90', 'Retro digital', '{"exposure":0.15,"contrast":0.1,"saturation":0.2,"temperature":12,"fade":0.1,"sharpness":-0.4,"grain":0.5,"grainSize":2.5,"vignette":0.35}', 960),
    ('Tela de tubo CRT', 'Retro digital', '{"contrast":0.3,"saturation":0.25,"sharpness":-0.3,"grain":0.35,"grainSize":2,"vignette":0.6,"vignetteMidpoint":0.2,"vignetteFeather":0.5,"gradeShadowsHue":150,"gradeShadowsSat":0.1}', 970),
    ('Fita queimada', 'Retro digital', '{"contrast":0.2,"saturation":-0.3,"tint":-10,"temperature":-5,"fade":0.35,"sharpness":-0.6,"clarity":-0.2,"grain":0.6,"grainSize":3,"vignette":0.3,"hslBlueSat":0.2,"gradeShadowsHue":270,"gradeShadowsSat":0.25}', 980),
    ('Álbum de família 80', 'Retro digital', '{"contrast":-0.1,"saturation":-0.15,"temperature":22,"tint":8,"fade":0.3,"grain":0.45,"grainSize":1.6,"vignette":0.25,"hslRedSat":0.1,"gradeShadowsHue":20,"gradeShadowsSat":0.2,"gradeHighlightsHue":50,"gradeHighlightsSat":0.2}', 990),
    ('Super 8', 'Retro digital', '{"exposure":0.1,"contrast":0.15,"saturation":0.1,"temperature":20,"fade":0.2,"sharpness":-0.35,"grain":0.8,"grainSize":2.2,"vignette":0.5,"gradeHighlightsHue":40,"gradeHighlightsSat":0.2}', 1000),
    ('Game Boy', 'Retro digital', '{"saturation":-1,"contrast":0.5,"sharpness":-0.2,"grain":0.2,"grainSize":3,"gradeShadowsHue":105,"gradeShadowsSat":0.8,"gradeMidtonesHue":90,"gradeMidtonesSat":0.6,"gradeHighlightsHue":75,"gradeHighlightsSat":0.5}', 1010),
    -- Vintage extra
    ('Foto de 1900', 'Vintage', '{"saturation":-1,"contrast":0.15,"blacks":0.15,"fade":0.35,"sharpness":-0.3,"grain":0.5,"grainSize":1.8,"vignette":0.7,"gradeMidtonesHue":35,"gradeMidtonesSat":0.3}', 1020),
    ('Instamatic anos 70', 'Vintage', '{"exposure":0.1,"contrast":-0.05,"saturation":0.05,"temperature":18,"tint":6,"fade":0.25,"grain":0.5,"grainSize":1.6,"vignette":0.45,"hslYellowSat":0.15,"hslGreenSat":-0.15,"gradeShadowsHue":15,"gradeShadowsSat":0.15}', 1030),
    ('Autochrome', 'Vintage', '{"contrast":-0.1,"saturation":-0.15,"fade":0.25,"grain":0.7,"grainSize":2,"vignette":0.3,"hslGreenSat":-0.15,"gradeMidtonesHue":50,"gradeMidtonesSat":0.15,"gradeShadowsHue":280,"gradeShadowsSat":0.15,"gradeHighlightsHue":170,"gradeHighlightsSat":0.1}', 1040),
    -- Liminal
    ('Fluorescente', 'Liminal', '{"exposure":0.1,"contrast":-0.15,"highlights":-0.1,"shadows":0.2,"saturation":-0.3,"temperature":-5,"tint":-12,"fade":0.25,"clarity":-0.1,"grain":0.25,"vignette":0.3,"gradeHighlightsHue":100,"gradeHighlightsSat":0.1}', 1050),
    ('Escritório vazio', 'Liminal', '{"exposure":0.15,"contrast":-0.1,"saturation":-0.35,"temperature":-10,"tint":-6,"fade":0.15,"dehaze":-0.1,"grain":0.2,"vignette":0.2}', 1060),
    ('Piscina vazia', 'Liminal', '{"exposure":0.25,"contrast":-0.1,"whites":0.2,"saturation":0.1,"temperature":-15,"fade":0.15,"clarity":-0.2,"hslAquaSat":0.4,"hslAquaLum":0.15,"gradeHighlightsHue":185,"gradeHighlightsSat":0.25}', 1070),
    ('Shopping às moscas', 'Liminal', '{"exposure":0.1,"contrast":-0.1,"saturation":-0.2,"temperature":10,"fade":0.2,"grain":0.3,"vignette":0.3,"gradeHighlightsHue":50,"gradeHighlightsSat":0.12}', 1080),
    ('Estacionamento à noite', 'Liminal', '{"exposure":-0.3,"contrast":0.2,"temperature":25,"tint":-5,"grain":0.35,"vignette":0.5,"hslOrangeSat":0.3,"gradeShadowsHue":220,"gradeShadowsSat":0.15,"gradeHighlightsHue":35,"gradeHighlightsSat":0.3}', 1090),
    ('Backrooms', 'Liminal', '{"exposure":0.1,"contrast":-0.05,"saturation":-0.1,"temperature":30,"tint":-8,"fade":0.2,"grain":0.3,"vignette":0.35,"hslYellowSat":0.2,"gradeShadowsHue":60,"gradeShadowsSat":0.15,"gradeHighlightsHue":55,"gradeHighlightsSat":0.25}', 1100),
    ('Madrugada vazia', 'Liminal', '{"exposure":-0.25,"contrast":0.1,"saturation":-0.25,"temperature":-18,"tint":-6,"fade":0.15,"grain":0.4,"vignette":0.4}', 1110),
    -- Dreamcore
    ('Dreamcore', 'Dreamcore', '{"exposure":0.3,"contrast":-0.2,"highlights":-0.1,"shadows":0.3,"whites":0.15,"saturation":-0.05,"vibrance":0.2,"temperature":5,"tint":8,"fade":0.25,"clarity":-0.5,"dehaze":-0.2,"sharpness":-0.4,"grain":0.2,"gradeHighlightsHue":330,"gradeHighlightsSat":0.25,"gradeShadowsHue":270,"gradeShadowsSat":0.2,"gradeMidtonesHue":200,"gradeMidtonesSat":0.1}', 1120),
    ('Névoa rosa', 'Dreamcore', '{"exposure":0.25,"contrast":-0.25,"vibrance":0.2,"temperature":5,"tint":15,"fade":0.3,"clarity":-0.5,"hslMagentaSat":0.2,"gradeHighlightsHue":340,"gradeHighlightsSat":0.3,"gradeShadowsHue":300,"gradeShadowsSat":0.15}', 1130),
    ('Céu de nostalgia', 'Dreamcore', '{"exposure":0.2,"contrast":-0.1,"vibrance":0.3,"fade":0.15,"clarity":-0.3,"hslBlueSat":0.3,"hslAquaSat":0.2,"hslGreenSat":0.2,"hslGreenLum":0.1,"gradeHighlightsHue":200,"gradeHighlightsSat":0.15}', 1140),
    ('Sonho lavanda', 'Dreamcore', '{"exposure":0.2,"contrast":-0.15,"temperature":-8,"tint":10,"fade":0.25,"clarity":-0.4,"hslPurpleSat":0.25,"gradeShadowsHue":260,"gradeShadowsSat":0.25,"gradeHighlightsHue":310,"gradeHighlightsSat":0.2}', 1150),
    ('Infância', 'Dreamcore', '{"exposure":0.25,"contrast":-0.1,"saturation":0.15,"vibrance":0.3,"temperature":10,"fade":0.15,"clarity":-0.3,"grain":0.3,"vignette":0.2,"hslYellowSat":0.2,"hslBlueSat":0.2}', 1160),
    ('Brilho de memória', 'Dreamcore', '{"exposure":0.3,"contrast":-0.25,"highlights":0.15,"whites":0.2,"fade":0.2,"clarity":-0.6,"dehaze":-0.3,"sharpness":-0.3,"temperature":4}', 1170),
    ('Frutiger Aero', 'Dreamcore', '{"exposure":0.2,"contrast":0.15,"whites":0.2,"saturation":0.3,"vibrance":0.3,"clarity":0.2,"hslAquaSat":0.4,"hslGreenSat":0.3,"hslBlueSat":0.3,"gradeHighlightsHue":190,"gradeHighlightsSat":0.15}', 1180),
    -- Weirdcore
    ('Weirdcore', 'Weirdcore', '{"contrast":0.2,"saturation":-0.2,"temperature":-5,"tint":-10,"fade":0.2,"sharpness":-0.3,"grain":0.55,"grainSize":2,"vignette":0.4,"hslGreenSat":0.15,"gradeShadowsHue":280,"gradeShadowsSat":0.3,"gradeHighlightsHue":100,"gradeHighlightsSat":0.2}', 1190),
    ('Cor errada', 'Weirdcore', '{"contrast":0.25,"saturation":-0.1,"fade":0.1,"grain":0.4,"grainSize":2,"vignette":0.3,"hslAllHue":0.3}', 1200),
    ('Pesadelo de TV', 'Weirdcore', '{"contrast":0.4,"blacks":-0.2,"saturation":-0.4,"temperature":-15,"tint":20,"sharpness":-0.4,"grain":0.7,"grainSize":2.5,"vignette":0.55,"gradeShadowsHue":330,"gradeShadowsSat":0.35,"gradeHighlightsHue":140,"gradeHighlightsSat":0.25}', 1210),
    ('Anomalia', 'Weirdcore', '{"saturation":0.1,"fade":0.2,"grain":0.5,"grainSize":2,"vignette":0.3,"curves":{"r":[[0,0.1],[0.5,0.4],[1,0.9]],"g":[[0,0],[0.5,0.6],[1,1]],"b":[[0,0.2],[0.5,0.55],[1,0.8]]}}', 1220),
    ('Flash amaldiçoado', 'Weirdcore', '{"exposure":0.3,"contrast":0.45,"highlights":0.2,"shadows":-0.35,"blacks":-0.2,"clarity":0.4,"saturation":-0.25,"temperature":-15,"tint":-8,"grain":0.6,"grainSize":2,"vignette":0.6}', 1230),
    ('Traumacore', 'Weirdcore', '{"contrast":0.25,"saturation":-0.3,"temperature":20,"tint":12,"fade":0.2,"grain":0.5,"vignette":0.5,"hslRedSat":0.3,"gradeShadowsHue":350,"gradeShadowsSat":0.3,"gradeHighlightsHue":20,"gradeHighlightsSat":0.2}', 1240),
    -- Glitch
    ('Glitch digital', 'Glitch', '{"contrast":0.2,"saturation":0.15,"sharpness":0.2,"glitch":0.55,"glitchSize":0.5,"glitchSeed":3}', 1250),
    ('Falha de sinal', 'Glitch', '{"contrast":0.3,"saturation":-0.2,"tint":-8,"grain":0.4,"grainSize":2,"vignette":0.3,"glitch":0.8,"glitchSize":0.25,"glitchSeed":11}', 1260),
    ('Fita corrompida', 'Glitch', '{"contrast":0.15,"saturation":0.1,"fade":0.2,"sharpness":-0.4,"grain":0.5,"grainSize":2.5,"glitch":0.4,"glitchSize":0.8,"glitchSeed":27}', 1270),
    ('RGB quebrado', 'Glitch', '{"contrast":0.25,"saturation":0.3,"glitch":0.3,"glitchSize":0.1,"glitchSeed":5}', 1280),
    ('Neon vazado', 'Glitch', '{"exposure":-0.1,"contrast":0.35,"saturation":0.35,"blacks":-0.15,"glitch":0.2,"glitchSize":0.6,"glitchSeed":42,"gradeShadowsHue":270,"gradeShadowsSat":0.3,"gradeHighlightsHue":180,"gradeHighlightsSat":0.2}', 1310),
    ('Monitor com defeito', 'Glitch', '{"contrast":0.3,"saturation":-0.15,"temperature":-6,"grain":0.5,"grainSize":2,"vignette":0.5,"vignetteMidpoint":0.2,"vignetteFeather":0.5,"glitch":0.65,"glitchSize":0.35,"glitchSeed":8}', 1320)
),
upd as (
    update public.public_presets p
    set category = v.category, sort_order = v.sort_order
    from v
    where p.name = v.name
    returning p.name
)
insert into public.public_presets (name, category, params, sort_order)
select v.name, v.category, v.params::jsonb, v.sort_order
from v
where not exists (select 1 from public.public_presets p where p.name = v.name);
