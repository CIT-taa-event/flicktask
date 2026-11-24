<script lang="ts">
  // カレンダー連携: a secret URL that Google カレンダー / iPhone subscribe to, so 本番・予定・締切 show in their calendars and widgets.
  import { onMount } from 'svelte';
  import { fade, fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { toasts } from '../lib/toast.svelte';

  let { close }: { close: () => void } = $props();
  let url = $state<string | null>(null);
  let loaded = $state(false);
  let confirmRenew = $state(false);
  const webcal = $derived(url?.replace(/^https?:/, 'webcal:') ?? '');
  const google = $derived(url ? `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}` : '');

  onMount(async () => {
    const res = await fetch('/api/calendar-feed');
    if (res.ok) url = (await res.json()).url;
    loaded = true;
  });
  async function make() {
    const res = await fetch('/api/calendar-feed', { method: 'POST' });
    if (!res.ok) return toasts.show('URLを作れませんでした');
    const renewed = !!url;
    url = (await res.json()).url;
    confirmRenew = false;
    toasts.show(renewed ? 'URLを作り直しました（前のURLは使えなくなりました）' : 'URLを作りました');
  }
  async function stop() {
    const res = await fetch('/api/calendar-feed', { method: 'DELETE' });
    if (res.ok) (url = null), toasts.show('カレンダー連携を止めました');
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(url!);
      toasts.show('URLをコピーしました');
    } catch {
      toasts.show('コピーできませんでした。URLを長押しか選択してコピーしてください');
    }
  }
</script>

<svelte:window onkeydown={(e) => e.key === 'Escape' && close()} />

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div class="scrim" onclick={close} transition:fade={{ duration: 160 }}></div>
<aside class="panel" role="dialog" aria-modal="true" aria-label="カレンダー連携" transition:fly={{ x: 460, duration: 280, easing: cubicOut, opacity: 1 }} data-testid="nx-calfeed">
  <div class="top">
    <h2>カレンダー連携</h2>
    <button class="x nx-chip" onclick={close} aria-label="閉じる"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
  </div>
  <p class="lead">Task本部の<b>本番日・予定・準備の締切</b>を、Googleカレンダーや iPhone のカレンダーに自動で表示します。カレンダーアプリのウィジェットを置けば、ホーム画面でも見られます。</p>
  <ul class="facts">
    <li>カレンダー側で編集しても Task本部には戻りません（表示だけ）</li>
    <li>反映は数時間おき（Googleカレンダー）です。すぐには変わりません</li>
    <li>URLを知っている人は誰でも予定を見られます。幹部の中だけで使ってください</li>
  </ul>

  {#if loaded && !url}
    <button class="primary" onclick={make} data-testid="nx-calfeed-make">連携用のURLを作る</button>
  {:else if url}
    <section>
      <h3>連携用のURL</h3>
      <div class="url">
        <code data-testid="nx-calfeed-url">{url}</code>
        <button class="nx-chip" onclick={copy} data-testid="nx-calfeed-copy">コピー</button>
      </div>
    </section>

    <section>
      <h3>Googleカレンダーに追加（PCで1回だけ）</h3>
      <ol>
        <li>PCで下のボタンを押す（幹部の共有Googleアカウントでログインした状態で）</li>
        <li>「カレンダーを追加しますか？」で「追加」を押す</li>
        <li>iPhone の Googleカレンダーアプリにも「Task本部」が出てきます。ウィジェットは、ホーム画面を長押し →「＋」→ Googleカレンダー から</li>
      </ol>
      <a class="btn" href={google} target="_blank" rel="noopener" data-testid="nx-calfeed-google">Googleカレンダーに追加</a>
    </section>

    <section>
      <h3>iPhone のカレンダーに直接追加する場合</h3>
      <ol>
        <li>iPhone でこの画面を開いて下のボタンを押す →「照会」（購読）</li>
        <li>「設定 → カレンダー → アカウント → 照会するカレンダー」で、更新の間隔を短くできます</li>
      </ol>
      <a class="btn" href={webcal} data-testid="nx-calfeed-webcal">iPhone のカレンダーに追加</a>
    </section>

    <section class="danger">
      {#if confirmRenew}
        <p class="warn">作り直すと、今のURLを登録したカレンダーには表示されなくなります（新しいURLで登録し直しが必要）。</p>
        <div class="row">
          <button class="nx-chip" onclick={() => (confirmRenew = false)}>やめる</button>
          <button class="nx-chip strong" onclick={make} data-testid="nx-calfeed-renew-ok">作り直す</button>
        </div>
      {:else}
        <div class="row">
          <button class="nx-chip" onclick={() => (confirmRenew = true)} data-testid="nx-calfeed-renew">URLを作り直す（漏れたとき）</button>
          <button class="nx-chip del" onclick={stop} data-testid="nx-calfeed-stop">連携を止める</button>
        </div>
      {/if}
    </section>
  {/if}
</aside>

<style>
  .scrim { position: fixed; inset: 0; z-index: 60; background: rgba(0, 0, 0, 0.35); }
  .panel { position: fixed; top: 0; right: 0; bottom: 0; z-index: 61; width: 460px; max-width: 100%; padding: 22px; display: flex; flex-direction: column; gap: 18px; overflow-y: auto;
    background: var(--drawer); border-left: 1px solid var(--border); -webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px); box-shadow: -30px 0 60px -20px rgba(0, 0, 0, 0.6); }
  .top { display: flex; align-items: center; }
  h2 { margin: 0 auto 0 0; font-size: 20px; font-weight: 800; }
  .x { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; }
  .x svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; }
  .lead { margin: 0; font-size: 13.5px; line-height: 1.7; color: var(--sub); }
  .lead b { color: var(--text); }
  .facts { margin: 0; padding-left: 1.2em; font-size: 12px; line-height: 1.8; color: var(--muted); }
  section { display: flex; flex-direction: column; gap: 10px; }
  h3 { margin: 0; font-size: 14px; font-weight: 800; }
  ol { margin: 0; padding-left: 1.3em; font-size: 12.5px; line-height: 1.8; color: var(--sub); }
  .primary { align-self: flex-start; height: 42px; padding: 0 18px; border-radius: 12px; font-size: 13.5px; font-weight: 800; color: var(--bg); background: var(--text); }
  .url { display: flex; align-items: center; gap: 8px; padding: 8px 8px 8px 12px; border-radius: 12px; background: var(--card); border: 1px solid var(--border); }
  .url code { flex: 1; min-width: 0; font-size: 11.5px; color: var(--sub); overflow-wrap: anywhere; user-select: all; }
  .url button { flex: none; height: 32px; padding: 0 12px; border-radius: 9px; font-size: 12px; font-weight: 700; }
  .btn { align-self: flex-start; height: 38px; padding: 0 16px; border-radius: 11px; display: inline-flex; align-items: center; font-size: 13px; font-weight: 800; color: var(--bg); background: var(--text); }
  .danger { padding-top: 14px; border-top: 1px solid var(--border); }
  .row { display: flex; flex-wrap: wrap; gap: 8px; }
  .row button { height: 34px; padding: 0 12px; border-radius: 10px; font-size: 12.5px; font-weight: 700; }
  .del { color: var(--over-text); }
  .strong { color: var(--over-text); border-color: rgba(255, 107, 91, 0.6); }
  .warn { margin: 0; font-size: 12.5px; line-height: 1.6; color: #f0c36a; }
</style>
