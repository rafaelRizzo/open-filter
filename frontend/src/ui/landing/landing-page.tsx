// Landing: o hero é o editor funcionando (antes/depois ao vivo); o resto é conteúdo direto e honesto.
import '@fontsource-variable/bricolage-grotesque/wdth.css'
import '@fontsource-variable/jetbrains-mono'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { REPO_URL } from '@/lib/links'
import { DonateButton } from '../donate-button'
import { Enter } from '../enter'
import { LogoMark } from '../logo-mark'
import { LiveDemo } from './live-demo'

// Largura 80% do eixo wdth da Bricolage: título condensado, com presença sem gritar.
const display = { fontVariationSettings: '"wdth" 80', fontStretch: '80%' } as const

const FEATURES: { name: string; text: string }[] = [
    {
        name: 'Curvas',
        text: 'RGB e por canal, com pontos arrastáveis. A curva passa pelos pontos sem ondular entre eles.',
    },
    {
        name: 'HSL por cor',
        text: 'Matiz, saturação e luminância em oito faixas, do vermelho ao magenta. Só os pixels daquela cor mudam.',
    },
    {
        name: 'Color grading',
        text: 'Uma cor para as sombras, outra para os meios-tons, outra para os realces, com balanço entre elas.',
    },
    {
        name: 'LUT 3D',
        text: 'Importe um arquivo .cube de qualquer colorista e regule a intensidade. Ele vale só na sessão e na exportação.',
    },
    {
        name: 'Antes e depois',
        text: 'Divisor que você arrasta, ou segure a tecla C para ver a foto crua. A referência nunca recebe ajuste.',
    },
    {
        name: 'Histograma',
        text: 'Ao vivo, calculado com o mesmo shader. Marca em vermelho o que estourou nos realces e em azul nas sombras.',
    },
    {
        name: 'Exportação',
        text: 'JPEG ou PNG em resolução total, processada em blocos para não esbarrar no limite de textura da placa de vídeo.',
    },
    {
        name: 'Presets',
        text: 'Oficiais e os seus, com controle de intensidade. Salvar presets pede login; editar não.',
    },
]

const IN_BROWSER = [
    'A sua foto, guardada no IndexedDB',
    'O processamento em WebGL',
    'A exportação em resolução total',
]
const IN_SERVER = [
    'Seu login do Google, se você quiser entrar',
    'Os presets que você salva na conta: um JSON de poucos KB cada',
]

export function LandingPage() {
    return (
        <div className="h-full overflow-y-auto">
            <div className="mx-auto flex max-w-6xl flex-col gap-24 px-4 py-10 sm:px-6 lg:py-14">
                <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
                    <div className="flex flex-col items-start gap-6">
                        <h1
                            className="font-display text-5xl leading-[0.95] font-semibold tracking-tight text-balance sm:text-6xl"
                            style={display}
                        >
                            Edite sua foto sem ela sair do seu computador.
                        </h1>
                        <p className="text-muted-foreground max-w-md text-lg text-pretty">
                            Curvas, HSL, color grading e LUT direto no navegador, uma foto por vez.
                            Não precisa de conta para editar: só os presets que você salvar vão para
                            a sua conta.
                        </p>
                        <div className="flex flex-wrap items-center gap-3">
                            <Button size="lg" nativeButton={false} render={<Link to="/app" />}>
                                <LogoMark data-icon="inline-start" />
                                Abrir o editor
                            </Button>
                            {REPO_URL && (
                                <Button
                                    size="lg"
                                    variant="outline"
                                    render={
                                        <a
                                            href={REPO_URL}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        />
                                    }
                                >
                                    Ver o código
                                </Button>
                            )}
                        </div>
                    </div>
                    <LiveDemo />
                </section>

                <Enter
                    as="section"
                    inView
                    aria-labelledby="privacidade"
                    className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
                >
                    <h2
                        id="privacidade"
                        className="font-display text-3xl font-semibold tracking-tight text-balance lg:sticky lg:top-6 lg:self-start"
                        style={display}
                    >
                        Sua foto fica com você.
                    </h2>
                    <div className="bg-border grid gap-px overflow-hidden rounded-sm border sm:grid-cols-2">
                        <div className="bg-background flex flex-col gap-3 p-5">
                            <h3 className="font-medium">No seu navegador</h3>
                            <ul className="text-muted-foreground flex flex-col gap-2 text-sm">
                                {IN_BROWSER.map((t) => (
                                    <li key={t}>{t}</li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-background flex flex-col gap-3 p-5">
                            <h3 className="font-medium">No servidor</h3>
                            <ul className="text-muted-foreground flex flex-col gap-2 text-sm">
                                {IN_SERVER.map((t) => (
                                    <li key={t}>{t}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </Enter>

                <Enter
                    as="section"
                    inView
                    aria-labelledby="recursos"
                    className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
                >
                    <h2
                        id="recursos"
                        className="font-display text-3xl font-semibold tracking-tight text-balance lg:sticky lg:top-6 lg:self-start"
                        style={display}
                    >
                        O que dá para ajustar.
                    </h2>
                    <dl className="flex flex-col">
                        {FEATURES.map((f) => (
                            <div
                                key={f.name}
                                className="grid gap-1 border-t py-4 first:border-t-0 first:pt-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4"
                            >
                                <dt className="font-display text-lg font-semibold" style={display}>
                                    {f.name}
                                </dt>
                                <dd className="text-muted-foreground text-sm text-pretty">
                                    {f.text}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </Enter>

                <Enter
                    as="section"
                    inView
                    aria-labelledby="limites"
                    className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
                >
                    <h2
                        id="limites"
                        className="font-display text-3xl font-semibold tracking-tight text-balance lg:sticky lg:top-6 lg:self-start"
                        style={display}
                    >
                        O que ele não faz.
                    </h2>
                    <p className="text-muted-foreground max-w-xl text-lg text-pretty">
                        O open-filter não tem camadas, dupla exposição nem retoque por IA. Ele
                        ajusta a cor e aplica filtros em uma foto por vez.
                    </p>
                </Enter>

                <Enter
                    as="section"
                    inView
                    aria-labelledby="apoio"
                    className="grid gap-8 border-t pt-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
                >
                    <h2
                        id="apoio"
                        className="font-display text-3xl font-semibold tracking-tight text-balance lg:sticky lg:top-6 lg:self-start"
                        style={display}
                    >
                        O código é aberto.
                    </h2>
                    <div className="flex flex-col items-start gap-5">
                        <p className="text-muted-foreground max-w-xl text-lg text-pretty">
                            O open-filter não tem anúncios, plano pago nem rastreamento. Se ele te
                            poupou tempo, uma doação ajuda a manter o projeto.
                        </p>
                        <div className="flex flex-wrap gap-3">
                            <DonateButton variant="rainbow" size="lg" />
                            {REPO_URL && (
                                <Button
                                    size="lg"
                                    variant="outline"
                                    render={
                                        <a
                                            href={REPO_URL}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        />
                                    }
                                >
                                    Ver o código
                                </Button>
                            )}
                        </div>
                    </div>
                </Enter>

                <Enter
                    as="footer"
                    inView
                    className="flex flex-col gap-8 border-t pt-10 pb-4 text-sm"
                >
                    <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                        <div className="flex flex-col gap-3">
                            <span
                                className="font-display flex items-center gap-2 text-lg font-semibold"
                                style={display}
                            >
                                <LogoMark className="size-5" />
                                open-filter
                            </span>
                            <p className="text-muted-foreground max-w-xs text-pretty">
                                Filtros e ajustes de cor para uma foto, direto no navegador. A foto
                                nunca sai do seu computador.
                            </p>
                        </div>
                        <nav aria-label="Rodapé: páginas" className="flex flex-col gap-2">
                            <h2 className="font-medium">Páginas</h2>
                            <Link
                                to="/"
                                className="text-muted-foreground hover:text-foreground w-fit transition-colors"
                            >
                                Início
                            </Link>
                            <Link
                                to="/app"
                                className="text-muted-foreground hover:text-foreground w-fit transition-colors"
                            >
                                Estúdio
                            </Link>
                            <Link
                                to="/perfil"
                                className="text-muted-foreground hover:text-foreground w-fit transition-colors"
                            >
                                Perfil
                            </Link>
                        </nav>
                        <nav aria-label="Rodapé: projeto" className="flex flex-col gap-2">
                            <h2 className="font-medium">Projeto</h2>
                            {REPO_URL ? (
                                <>
                                    <a
                                        href={REPO_URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-muted-foreground hover:text-foreground w-fit transition-colors"
                                    >
                                        Código no GitHub
                                    </a>
                                    <a
                                        href={`${REPO_URL.replace(/\/$/, '')}/blob/main/LICENSE`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-muted-foreground hover:text-foreground w-fit transition-colors"
                                    >
                                        Licença MIT
                                    </a>
                                </>
                            ) : (
                                <span className="text-muted-foreground">
                                    Código aberto, licença MIT
                                </span>
                            )}
                            <span className="text-muted-foreground">
                                Sem anúncios nem rastreamento
                            </span>
                        </nav>
                    </div>
                    <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t pt-6 text-xs">
                        <span>© {new Date().getFullYear()} Rafael Rizzo. Licença MIT.</span>
                        <span>Foto de exemplo: Nabih E Navarro, via Unsplash.</span>
                    </div>
                </Enter>
            </div>
        </div>
    )
}
