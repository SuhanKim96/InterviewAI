// App-wide ambient layer: large blurred gradient orbs drifting behind every page.
// Pure CSS loops (compositor-only) so it costs no React work per frame and
// inherits the prefers-reduced-motion guard in index.css.
export default function AmbientBackground() {
  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      <div className="absolute -top-32 -left-24 w-[36rem] h-[36rem] rounded-full blur-3xl bg-indigo-400/25 dark:bg-indigo-500/12 animate-float-slow" />
      <div className="absolute top-1/4 -right-40 w-[32rem] h-[32rem] rounded-full blur-3xl bg-violet-400/20 dark:bg-violet-500/10 animate-float-slower" />
      <div className="absolute -bottom-40 left-1/4 w-[30rem] h-[30rem] rounded-full blur-3xl bg-sky-300/20 dark:bg-sky-500/8 animate-float-slow" />
    </div>
  )
}
